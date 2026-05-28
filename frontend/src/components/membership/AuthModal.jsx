// ============================================================
// Giriş / Kayıt modalı — router yerine modal (CleanDashboard akışı)
// ============================================================

import { useState, useEffect } from 'react';
import { login as apiLogin, register as apiRegister } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useUsage } from '../../context/UsageContext';
import './membership.css';

export default function AuthModal() {
    const { authModal, closeAuth, openLogin, openRegister, refreshUsage } = useUsage();
    const { loginUser } = useAuth();
    const mode = authModal; // null | 'login' | 'register'

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    // Mod değişince hata/alanları temizle
    useEffect(() => { setError(''); }, [mode]);

    if (!mode) return null;

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (mode === 'register') {
            if (name.trim().length < 2) return setError('İsim en az 2 karakter olmalıdır');
            if (password !== passwordConfirm) return setError('Şifreler eşleşmiyor');
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Geçerli bir e-posta girin');
        if (password.length < 6) return setError('Şifre en az 6 karakter olmalıdır');

        setBusy(true);
        try {
            const data = mode === 'register'
                ? await apiRegister(name, email, password, passwordConfirm)
                : await apiLogin(email, password);
            loginUser(data.user);   // token client tarafında saklandı
            await refreshUsage();
            closeAuth();
        } catch (err) {
            setError(err?.error || 'İşlem başarısız, lütfen tekrar deneyin.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="mb-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeAuth(); }}>
            <div className="mb-modal" role="dialog" aria-modal="true" aria-label={mode === 'register' ? 'Kayıt ol' : 'Giriş yap'}>
                <button className="mb-close" onClick={closeAuth} aria-label="Kapat">✕</button>

                <h2 className="mb-title">{mode === 'register' ? 'Hesap oluştur' : 'Tekrar hoş geldiniz'}</h2>
                <p className="mb-sub">
                    {mode === 'register'
                        ? 'Ücretsiz üyelikle günlük polen ve sohbet hakkınız artar.'
                        : 'Polen takibine ve asistana kaldığınız yerden devam edin.'}
                </p>

                <div className="mb-tabs" role="tablist">
                    <button className={`mb-tab ${mode === 'login' ? 'active' : ''}`} onClick={openLogin} role="tab" aria-selected={mode === 'login'}>Giriş</button>
                    <button className={`mb-tab ${mode === 'register' ? 'active' : ''}`} onClick={openRegister} role="tab" aria-selected={mode === 'register'}>Kayıt</button>
                </div>

                {error && <div className="mb-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {mode === 'register' && (
                        <div className="mb-field">
                            <label className="mb-label" htmlFor="mb-name">İsim</label>
                            <input id="mb-name" className="mb-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Adınız" autoComplete="name" />
                        </div>
                    )}
                    <div className="mb-field">
                        <label className="mb-label" htmlFor="mb-email">E-posta</label>
                        <input id="mb-email" className="mb-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@eposta.com" autoComplete="email" />
                    </div>
                    <div className="mb-field">
                        <label className="mb-label" htmlFor="mb-pass">Şifre</label>
                        <input id="mb-pass" className="mb-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
                    </div>
                    {mode === 'register' && (
                        <div className="mb-field">
                            <label className="mb-label" htmlFor="mb-pass2">Şifre (tekrar)</label>
                            <input id="mb-pass2" className="mb-input" type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="••••••" autoComplete="new-password" />
                        </div>
                    )}
                    <button className="mb-submit" type="submit" disabled={busy}>
                        {busy ? 'Lütfen bekleyin…' : (mode === 'register' ? 'Kayıt ol' : 'Giriş yap')}
                    </button>
                </form>

                <div className="mb-switch">
                    {mode === 'register'
                        ? <>Zaten üye misiniz? <button onClick={openLogin}>Giriş yapın</button></>
                        : <>Hesabınız yok mu? <button onClick={openRegister}>Kayıt olun</button></>}
                </div>
            </div>
        </div>
    );
}
