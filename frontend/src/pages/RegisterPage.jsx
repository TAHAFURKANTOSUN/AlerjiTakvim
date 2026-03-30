import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { validateRegisterForm } from '../utils/validators';
import { showToast } from '../components/Toast';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const { loginUser } = useAuth();

    async function handleSubmit(e) {
        e.preventDefault();
        setServerError('');
        const validationErrors = validateRegisterForm(name, email, password, passwordConfirm);
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        setLoading(true);
        try {
            const data = await register(name, email, password, passwordConfirm);
            loginUser(data.user);
            showToast('🎉 Kayıt başarılı! Hoş geldiniz!');
            navigate('/');
        } catch (err) {
            setServerError(err.error || 'Kayıt olurken bir hata oluştu');
        }
        setLoading(false);
    }

    function clearError(field) {
        setErrors(p => ({ ...p, [field]: '' }));
    }

    // Password strength indicator
    function getPasswordStrength() {
        if (!password) return { level: 0, text: '', color: '' };
        let score = 0;
        if (password.length >= 6) score++;
        if (password.length >= 10) score++;
        if (/[a-zA-ZığüşöçİĞÜŞÖÇ]/.test(password) && /[0-9]/.test(password)) score++;
        if (/[^a-zA-Z0-9ığüşöçİĞÜŞÖÇ]/.test(password)) score++;

        if (score <= 1) return { level: 1, text: 'Zayıf', color: '#ff4757' };
        if (score === 2) return { level: 2, text: 'Orta', color: '#f5b041' };
        if (score === 3) return { level: 3, text: 'Güçlü', color: '#7ed56f' };
        return { level: 4, text: 'Çok Güçlü', color: '#5ec88a' };
    }

    const strength = getPasswordStrength();

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <div className="auth-logo">🌿</div>
                    <h1>Hesap Oluştur</h1>
                    <p>Alerji Takip'e kaydolun</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                    {serverError && (
                        <div className="auth-error-banner">
                            <span>⚠️</span> {serverError}
                        </div>
                    )}

                    <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
                        <label htmlFor="reg-name">İsim</label>
                        <div className="input-wrapper">
                            <span className="input-icon">👤</span>
                            <input
                                id="reg-name"
                                type="text"
                                className="form-input"
                                placeholder="Adınız Soyadınız"
                                value={name}
                                onChange={e => { setName(e.target.value); clearError('name'); }}
                                autoComplete="name"
                            />
                        </div>
                        {errors.name && <span className="field-error">{errors.name}</span>}
                    </div>

                    <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
                        <label htmlFor="reg-email">E-posta</label>
                        <div className="input-wrapper">
                            <span className="input-icon">📧</span>
                            <input
                                id="reg-email"
                                type="email"
                                className="form-input"
                                placeholder="ornek@email.com"
                                value={email}
                                onChange={e => { setEmail(e.target.value); clearError('email'); }}
                                autoComplete="email"
                            />
                        </div>
                        {errors.email && <span className="field-error">{errors.email}</span>}
                    </div>

                    <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
                        <label htmlFor="reg-password">Şifre</label>
                        <div className="input-wrapper">
                            <span className="input-icon">🔒</span>
                            <input
                                id="reg-password"
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="En az 6 karakter, 1 harf + 1 rakam"
                                value={password}
                                onChange={e => { setPassword(e.target.value); clearError('password'); }}
                                autoComplete="new-password"
                            />
                            <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                        {errors.password && <span className="field-error">{errors.password}</span>}
                        {password && (
                            <div className="password-strength">
                                <div className="strength-bar">
                                    <div className="strength-fill" style={{ width: `${strength.level * 25}%`, background: strength.color }}></div>
                                </div>
                                <span className="strength-text" style={{ color: strength.color }}>{strength.text}</span>
                            </div>
                        )}
                    </div>

                    <div className={`form-group ${errors.passwordConfirm ? 'has-error' : ''}`}>
                        <label htmlFor="reg-password-confirm">Şifre Tekrar</label>
                        <div className="input-wrapper">
                            <span className="input-icon">🔒</span>
                            <input
                                id="reg-password-confirm"
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Şifrenizi tekrar girin"
                                value={passwordConfirm}
                                onChange={e => { setPasswordConfirm(e.target.value); clearError('passwordConfirm'); }}
                                autoComplete="new-password"
                            />
                            {passwordConfirm && password === passwordConfirm && (
                                <span className="match-icon">✅</span>
                            )}
                        </div>
                        {errors.passwordConfirm && <span className="field-error">{errors.passwordConfirm}</span>}
                    </div>

                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading ? (
                            <><span className="btn-spinner"></span> Kaydediliyor...</>
                        ) : (
                            'Kaydol'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Zaten hesabınız var mı? <Link to="/login">Giriş Yap</Link></p>
                </div>
            </div>

            <div className="auth-particles">
                <span className="particle p1">🌸</span>
                <span className="particle p2">🌾</span>
                <span className="particle p3">🌿</span>
                <span className="particle p4">🌲</span>
                <span className="particle p5">🍃</span>
                <span className="particle p6">🌻</span>
            </div>
        </div>
    );
}
