// ============================================================
// Kullanım/kota + üyelik modallarının merkezi durumu
// - /api/usage'dan plan + günlük kotayı çeker
// - 'usage:changed' olayında tazeler (polen/chat sonrası)
// - 'quota:exceeded' (429) olayında kayıt/premium modalını açar
// AuthProvider İÇİNDE kullanılmalıdır (useAuth'a bağımlı).
// ============================================================

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getUsage } from '../api/client';
import { useAuth } from './AuthContext';

const UsageContext = createContext(null);

export function UsageProvider({ children }) {
    const { user } = useAuth();
    const [usage, setUsage] = useState(null); // { plan, planExpiresAt, resetsAt, usage:{pollen,chat} }
    const [authModal, setAuthModal] = useState(null);   // null | 'login' | 'register'
    const [upgradeOpen, setUpgradeOpen] = useState(false);
    const [notice, setNotice] = useState(null);         // kota uyarı metni
    const debounceRef = useRef(null);

    const refreshUsage = useCallback(async () => {
        try {
            const data = await getUsage();
            setUsage(data);
        } catch {
            // sessizce geç — kota rozeti opsiyonel
        }
    }, []);

    // Oturum durumu değişince (giriş/çıkış) kotayı tazele.
    useEffect(() => { refreshUsage(); }, [user, refreshUsage]);

    // Polen/chat sonrası sayaç değişimini yansıt (debounce).
    useEffect(() => {
        function onChanged() {
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(refreshUsage, 400);
        }
        window.addEventListener('usage:changed', onChanged);
        return () => window.removeEventListener('usage:changed', onChanged);
    }, [refreshUsage]);

    // Kota doldu (429) → uygun modalı aç.
    useEffect(() => {
        function onExceeded(e) {
            const d = e.detail || {};
            setNotice(d.error || 'Günlük hakkınız doldu.');
            if (d.action === 'upgrade') {
                setUpgradeOpen(true);
            } else {
                // misafir → kayıt önerilir
                setAuthModal('register');
            }
            refreshUsage();
        }
        window.addEventListener('quota:exceeded', onExceeded);
        return () => window.removeEventListener('quota:exceeded', onExceeded);
    }, [refreshUsage]);

    const openLogin = useCallback(() => { setAuthModal('login'); }, []);
    const openRegister = useCallback(() => { setAuthModal('register'); }, []);
    const closeAuth = useCallback(() => { setAuthModal(null); }, []);
    const openUpgrade = useCallback(() => { setUpgradeOpen(true); }, []);
    const closeUpgrade = useCallback(() => { setUpgradeOpen(false); }, []);
    const clearNotice = useCallback(() => { setNotice(null); }, []);

    return (
        <UsageContext.Provider value={{
            usage, refreshUsage,
            authModal, openLogin, openRegister, closeAuth,
            upgradeOpen, openUpgrade, closeUpgrade,
            notice, clearNotice,
        }}>
            {children}
        </UsageContext.Provider>
    );
}

export function useUsage() {
    const ctx = useContext(UsageContext);
    if (!ctx) throw new Error('useUsage must be used within UsageProvider');
    return ctx;
}
