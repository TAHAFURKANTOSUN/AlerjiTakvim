// ============================================================
// Üyelik / ödeme route'ları  →  /api/membership/*
//   GET  /plans      → plan + fiyat bilgisi (herkese açık)
//   POST /checkout   → ödeme başlat (üye olmalı)
//   POST /confirm    → ödemeyi doğrula → premium yap (üye olmalı)
//   POST /cancel     → premium iptal (üye olmalı)
// ============================================================

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth');
const users = require('../services/users');
const { PLANS, PREMIUM, PAYMENT_MODE } = require('../config/plans');
const payments = require('../payments/iyzico');
const { query } = require('../db/pool');

// ── Plan & fiyat bilgisi ──
router.get('/plans', (_req, res) => {
    res.json({
        paymentMode: PAYMENT_MODE,
        premium: {
            label: PLANS.premium.label,
            price: PREMIUM.price,
            currency: PREMIUM.currency,
            days: PREMIUM.days,
        },
        limits: {
            anon: PLANS.anon.limits,
            free: PLANS.free.limits,
            premium: PLANS.premium.limits,
        },
    });
});

// ── Ödeme başlat ──
router.post('/checkout', authMiddleware, async (req, res) => {
    try {
        const user = await users.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

        const checkout = await payments.createCheckout({
            user,
            amount: PREMIUM.price,
            currency: PREMIUM.currency,
        });

        const payId = 'pay_' + crypto.randomBytes(8).toString('hex');
        await query(
            `INSERT INTO payments (id, user_id, amount, currency, status, provider, provider_ref)
             VALUES ($1, $2, $3, $4, 'pending', $5, $6)`,
            [
                payId, user.id, PREMIUM.price, PREMIUM.currency,
                PAYMENT_MODE === 'iyzico' ? 'iyzico' : 'simulated',
                checkout.token || null,
            ]
        );

        res.json({ paymentId: payId, ...checkout });
    } catch (err) {
        console.error('[Membership] checkout hatası:', err.message);
        res.status(500).json({ error: err.message || 'Ödeme başlatılamadı' });
    }
});

// ── Ödemeyi onayla / doğrula ──
router.post('/confirm', authMiddleware, async (req, res) => {
    try {
        const { paymentId, token } = req.body || {};
        const verify = await payments.verifyPayment({ token });

        if (!verify.success) {
            if (paymentId) {
                await query(`UPDATE payments SET status = 'failed' WHERE id = $1`, [paymentId]);
            }
            return res.status(402).json({ error: 'Ödeme doğrulanamadı' });
        }

        if (paymentId) {
            await query(
                `UPDATE payments SET status = 'success', provider_ref = $2 WHERE id = $1`,
                [paymentId, verify.providerRef]
            );
        }

        const updated = await users.setPremium(req.user.id, { days: PREMIUM.days });
        if (!updated) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

        res.json({ message: 'Premium üyeliğiniz aktif! 🎉', user: users.publicUser(updated) });
    } catch (err) {
        console.error('[Membership] confirm hatası:', err.message);
        res.status(500).json({ error: 'Ödeme onaylanamadı' });
    }
});

// ── Premium iptal ──
router.post('/cancel', authMiddleware, async (req, res) => {
    try {
        const updated = await users.setFree(req.user.id);
        if (!updated) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        res.json({ message: 'Üyelik iptal edildi.', user: users.publicUser(updated) });
    } catch (err) {
        console.error('[Membership] cancel hatası:', err.message);
        res.status(500).json({ error: 'İşlem başarısız' });
    }
});

module.exports = router;
