// ============================================================
// Hesap menüsü — header'daki tüm hesap işlevlerini tek, düzenli bir
// dropdown'da toplar: kimlik, günlük kota, Premium, Profil/Ayarlar, Çıkış.
// Misafir için: Giriş / Kayıt.
// ============================================================

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUsage } from '../../context/UsageContext';
import { usePollen } from '../../context/PollenContext';
import './membership.css';

function QuotaRow({ icon, label, info }) {
    if (!info) return null;
    if (info.limit === null) {
        return (
            <div className="acct-quota-row">
                <span>{icon} {label}</span>
                <span className="acct-quota-val unlimited">Sınırsız</span>
            </div>
        );
    }
    const low = info.remaining <= 0;
    return (
        <div className="acct-quota-row">
            <span>{icon} {label}</span>
            <span className={`acct-quota-val ${low ? 'low' : ''}`}>{info.remaining}/{info.limit} kaldı</span>
        </div>
    );
}

export default function AccountMenu() {
    const { user, logoutUser } = useAuth();
    const { usage, openLogin, openRegister, openUpgrade } = useUsage();
    const { setCurrentView } = usePollen();
    const [open, setOpen] = useState(false);

    const plan = usage?.plan || (user ? user.plan : 'anon');
    const isPremium = plan === 'premium';
    const close = () => setOpen(false);

    return (
        <div
            className="acct-wrap"
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) close(); }}
        >
            <button
                className="acct-trigger"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                title="Hesap"
            >
                <span className="acct-avatar">{user?.avatar || '👤'}</span>
                <span className="acct-name">{user ? (user.name || 'Üye') : 'Misafir'}</span>
                <svg className={`acct-chev ${open ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {open && (
                <div className="acct-panel" role="menu">
                    {/* ── Kimlik ── */}
                    <div className="acct-identity">
                        <span className="acct-avatar lg">{user?.avatar || '👤'}</span>
                        <div className="acct-identity-meta">
                            <span className="acct-identity-name">{user ? (user.name || 'Üye') : 'Misafir kullanıcı'}</span>
                            {user?.email && <span className="acct-identity-email">{user.email}</span>}
                            <span className={`mb-plan-badge ${isPremium ? 'premium' : (user ? 'free' : 'anon')}`}>
                                {isPremium ? 'Premium' : (user ? 'Ücretsiz' : 'Giriş yapılmadı')}
                            </span>
                        </div>
                    </div>

                    {/* ── Günlük kota ── */}
                    {!isPremium && usage?.usage && (
                        <div className="acct-quota">
                            <QuotaRow icon="🌿" label="Polen sorgusu" info={usage.usage.pollen} />
                            <QuotaRow icon="💬" label="Sohbet" info={usage.usage.chat} />
                            <div className="acct-quota-note">Kota her gün yenilenir.</div>
                        </div>
                    )}

                    <div className="acct-divider" />

                    {/* ── Aksiyonlar ── */}
                    {!user ? (
                        <>
                            <button className="acct-action primary" role="menuitem" onClick={() => { close(); openLogin(); }}>Giriş yap</button>
                            <button className="acct-action" role="menuitem" onClick={() => { close(); openRegister(); }}>Kayıt ol</button>
                        </>
                    ) : isPremium ? (
                        <button className="acct-action" role="menuitem" onClick={() => { close(); openUpgrade(); }}>★ Premium üyeliğim</button>
                    ) : (
                        <button className="acct-action upgrade" role="menuitem" onClick={() => { close(); openUpgrade(); }}>★ Premium'a geç</button>
                    )}

                    <button className="acct-action" role="menuitem" onClick={() => { setCurrentView('profile'); close(); }}>⚙️ Profil ve Ayarlar</button>

                    {user && (
                        <button className="acct-action danger" role="menuitem" onClick={() => { close(); logoutUser(); }}>Çıkış yap</button>
                    )}
                </div>
            )}
        </div>
    );
}
