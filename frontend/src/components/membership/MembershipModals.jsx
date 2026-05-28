// ============================================================
// Üyelik modallarını + kota uyarı toast'ını tek yerde render eder.
// Provider'ların içinde, uygulamanın köküne yerleştirilir.
// ============================================================

import AuthModal from './AuthModal';
import UpgradeModal from './UpgradeModal';
import { useUsage } from '../../context/UsageContext';
import './membership.css';

function NoticeToast() {
    const { notice, clearNotice, authModal, upgradeOpen } = useUsage();
    // Modal açıkken toast'ı gizle (çift mesaj olmasın).
    if (!notice || authModal || upgradeOpen) return null;
    return (
        <div className="mb-notice" role="status">
            <span>{notice}</span>
            <button onClick={clearNotice}>Kapat</button>
        </div>
    );
}

export default function MembershipModals() {
    return (
        <>
            <AuthModal />
            <UpgradeModal />
            <NoticeToast />
        </>
    );
}
