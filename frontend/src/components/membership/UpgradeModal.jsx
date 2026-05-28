// ============================================================
// Premium yükseltme modalı — plan karşılaştırma + (simüle) ödeme
// Akış: startCheckout() -> confirmMembership() -> premium aktif
// Gerçek iyzico moduna geçildiğinde sadece backend değişir; bu akış aynı kalır.
// ============================================================

import { useState, useEffect } from 'react';
import { getPlans, startCheckout, confirmMembership, cancelMembership } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useUsage } from '../../context/UsageContext';
import './membership.css';

function fmtDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch { return ''; }
}

export default function UpgradeModal() {
    const { upgradeOpen, closeUpgrade, openLogin, refreshUsage } = useUsage();
    const { user, loginUser } = useAuth();

    const [plans, setPlans] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!upgradeOpen) { setError(''); setDone(false); return; }
        getPlans().then(setPlans).catch(() => setPlans(null));
    }, [upgradeOpen]);

    if (!upgradeOpen) return null;

    const price = plans?.premium?.price ?? 49.99;
    const currency = plans?.premium?.currency ?? 'TRY';
    const free = plans?.limits?.free ?? { pollen: 10, chat: 5 };
    const isPremium = user?.plan === 'premium';

    async function handleUpgrade() {
        setError(''); setBusy(true);
        try {
            const checkout = await startCheckout();           // {paymentId, token, simulated}
            const res = await confirmMembership(checkout.paymentId, checkout.token);
            loginUser(res.user);   // AuthContext'teki kullanıcıyı premium olarak güncelle
            await refreshUsage();
            setDone(true);
        } catch (err) {
            setError(err?.error || 'Ödeme tamamlanamadı. Lütfen tekrar deneyin.');
        } finally {
            setBusy(false);
        }
    }

    async function handleCancel() {
        setBusy(true);
        try {
            const res = await cancelMembership();
            loginUser(res.user);
            await refreshUsage();
            closeUpgrade();
        } catch (err) {
            setError(err?.error || 'İşlem başarısız.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="mb-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeUpgrade(); }}>
            <div className="mb-modal wide" role="dialog" aria-modal="true" aria-label="Premium üyelik">
                <button className="mb-close" onClick={closeUpgrade} aria-label="Kapat">✕</button>

                {/* Giriş yapılmamışsa önce kayıt/giriş iste */}
                {!user ? (
                    <>
                        <h2 className="mb-title">Premium için giriş gerekli</h2>
                        <p className="mb-sub">Premium üyelik kişisel hesabınıza tanımlanır. Önce giriş yapın veya ücretsiz kayıt olun.</p>
                        <button className="mb-submit" onClick={() => { closeUpgrade(); openLogin(); }}>Giriş yap / Kayıt ol</button>
                    </>
                ) : done || isPremium ? (
                    <div className="mb-premium-active">
                        <div className="big">🎉</div>
                        <h2 className="mb-title">Premium aktif</h2>
                        <p className="mb-sub">
                            Sınırsız polen sorgusu ve sohbet hakkınız var.
                            {user?.planExpiresAt ? ` Yenileme tarihi: ${fmtDate(user.planExpiresAt)}.` : ''}
                        </p>
                        <button className="mb-logout-btn" onClick={handleCancel} disabled={busy}>
                            {busy ? '…' : 'Premium üyeliği iptal et'}
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="mb-title">Premium'a geçin</h2>
                        <p className="mb-sub">Günlük limitleri kaldırın — sınırsız polen sorgusu ve Polen Asistanı.</p>

                        {error && <div className="mb-error">{error}</div>}

                        <div className="mb-plans">
                            <div className="mb-plan-card">
                                <div className="pname">Ücretsiz</div>
                                <div className="pprice">₺0</div>
                                <ul className="mb-feature-list">
                                    <li><span className="ck">✓</span> Günde {free.pollen} polen sorgusu</li>
                                    <li><span className="ck">✓</span> Günde {free.chat} sohbet mesajı</li>
                                    <li><span className="ck">✓</span> Harita ve 5 günlük tahmin</li>
                                </ul>
                            </div>
                            <div className="mb-plan-card featured">
                                <div className="pname">Premium</div>
                                <div className="pprice">₺{price}<small> /{plans?.premium?.days ?? 30} gün</small></div>
                                <ul className="mb-feature-list">
                                    <li><span className="ck">✓</span> <strong>Sınırsız</strong> polen sorgusu</li>
                                    <li><span className="ck">✓</span> <strong>Sınırsız</strong> Polen Asistanı sohbeti</li>
                                    <li><span className="ck">✓</span> Tüm ücretsiz özellikler dahil</li>
                                </ul>
                            </div>
                        </div>

                        <button className="mb-pay-btn" onClick={handleUpgrade} disabled={busy}>
                            {busy ? 'İşleniyor…' : `Premium'a geç — ₺${price}`}
                        </button>
                        {plans?.paymentMode === 'simulate' && (
                            <p className="mb-sim-note">Test modu: gerçek ödeme alınmaz, premium anında etkinleşir.</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
