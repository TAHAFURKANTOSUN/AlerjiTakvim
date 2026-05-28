// ============================================================
// "Premium'a geç" butonu — header'ın sol üst tarafında, logonun yanında.
// Yalnızca giriş yapmış ücretsiz üyeye gösterilir.
// ============================================================

import { useAuth } from '../../context/AuthContext';
import { useUsage } from '../../context/UsageContext';
import './membership.css';

export default function HeaderPremiumButton() {
    const { user } = useAuth();
    const { usage, openUpgrade } = useUsage();

    const plan = usage?.plan || user?.plan;
    // Misafire (giriş yok) veya premium üyeye gösterme.
    if (!user || plan === 'premium') return null;

    return (
        <button className="mb-upgrade-btn" onClick={openUpgrade} title="Premium'a geç">
            ★ Premium'a geç
        </button>
    );
}
