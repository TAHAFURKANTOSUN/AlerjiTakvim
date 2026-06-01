// ============================================================
// Üyelik / ödeme route'ları  →  /api/membership/*
//   GET  /plans      → plan + fiyat bilgisi (herkese açık)
//   POST /checkout   → ödeme başlat (üye olmalı)
//   POST /confirm    → ödemeyi doğrula → premium yap (üye olmalı)
//   POST /cancel     → premium iptal (üye olmalı)
// asyncHandler + ApiError → tekrarlı try/catch yok.
// ============================================================

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth');
const users = require('../services/users');
const { PLANS, PREMIUM, PAYMENT_MODE } = require('../config/plans');
const payments = require('../payments/iyzico');
const { query } = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

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
router.post('/checkout', authMiddleware, asyncHandler(async (req, res) => {
    const user = await users.findById(req.user.id);
    if (!user) throw ApiError.notFound('Kullanıcı bulunamadı');

    let checkout;
    try {
        checkout = await payments.createCheckout({
            user,
            amount: PREMIUM.price,
            currency: PREMIUM.currency,
        });
    } catch (err) {
        // Sağlayıcı/konfig hatası kullanıcıya anlamlı mesajla döner.
        console.error('[Membership] checkout hatası:', err.message);
        throw new ApiError(500, err.message || 'Ödeme başlatılamadı');
    }

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
}));

// ── Ödemeyi onayla / doğrula ──
router.post('/confirm', authMiddleware, asyncHandler(async (req, res) => {
    const { paymentId, token } = req.body || {};
    const verify = await payments.verifyPayment({ token });

    if (!verify.success) {
        if (paymentId) {
            await query(`UPDATE payments SET status = 'failed' WHERE id = $1`, [paymentId]);
        }
        throw new ApiError(402, 'Ödeme doğrulanamadı');
    }

    if (paymentId) {
        await query(
            `UPDATE payments SET status = 'success', provider_ref = $2 WHERE id = $1`,
            [paymentId, verify.providerRef]
        );
    }

    const updated = await users.setPremium(req.user.id, { days: PREMIUM.days });
    if (!updated) throw ApiError.notFound('Kullanıcı bulunamadı');

    res.json({ message: 'Premium üyeliğiniz aktif! 🎉', user: users.publicUser(updated) });
}));

// ── Premium iptal ──
router.post('/cancel', authMiddleware, asyncHandler(async (req, res) => {
    const updated = await users.setFree(req.user.id);
    if (!updated) throw ApiError.notFound('Kullanıcı bulunamadı');
    res.json({ message: 'Üyelik iptal edildi.', user: users.publicUser(updated) });
}));

module.exports = router;
