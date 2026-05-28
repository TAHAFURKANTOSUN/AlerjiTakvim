// ============================================================
// Header widget (sağ taraf) — günlük kota, premium rozeti ve
// giriş/çıkış aksiyonları.
// Not: kullanıcı adı artık tek bir yerde (ProfileButton) gösteriliyor;
// "Premium'a geç" butonu header'ın soluna (HeaderPremiumButton) alındı.
// ============================================================

import { useAuth } from '../../context/AuthContext';
import { useUsage } from '../../context/UsageContext';
import './membership.css';

function QuotaChip({ icon, label, info }) {
    if (!info || info.limit === null) return null; // sınırsız → gösterme
    const low = info.remaining <= 0;
    return (
        <span className={`mb-quota-chip ${low ? 'low' : ''}`} title={`${label}: ${info.used}/${info.limit} (kalan ${info.remaining})`}>
            <span className="ic">{icon}</span>{info.remaining}/{info.limit}
        </span>
    );
}

export default function MembershipBar() {
    const { user, logoutUser } = useAuth();
    const { usage, openLogin } = useUsage();

    const plan = usage?.plan || (user ? user.plan : 'anon');
    const isPremium = plan === 'premium';

    // ── Misafir (girişsiz) ──
    if (!user) {
        return (
            <div className="mb-bar">
                {usage?.usage && (
                    <span className="mb-quota" aria-label="Misafir kotası">
                        <QuotaChip icon="🌿" label="Polen" info={usage.usage.pollen} />
                        <QuotaChip icon="💬" label="Sohbet" info={usage.usage.chat} />
                    </span>
                )}
                <button className="mb-login-btn" onClick={openLogin}>Giriş yap</button>
            </div>
        );
    }

    // ── Üye ──
    return (
        <div className="mb-bar">
            {!isPremium && usage?.usage && (
                <span className="mb-quota" aria-label="Günlük kota">
                    <QuotaChip icon="🌿" label="Polen" info={usage.usage.pollen} />
                    <QuotaChip icon="💬" label="Sohbet" info={usage.usage.chat} />
                </span>
            )}

            {isPremium && <span className="mb-plan-badge premium" title="Premium üye">★ Premium</span>}

            <button className="mb-logout-btn" onClick={logoutUser} title="Çıkış yap">Çıkış</button>
        </div>
    );
}
