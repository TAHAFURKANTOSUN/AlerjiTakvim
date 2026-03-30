import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { validateLoginForm } from '../utils/validators';
import { showToast } from '../components/Toast';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const { loginUser } = useAuth();

    async function handleSubmit(e) {
        e.preventDefault();
        setServerError('');
        const validationErrors = validateLoginForm(email, password);
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        setLoading(true);
        try {
            const data = await login(email, password);
            loginUser(data.user);
            showToast('✅ Giriş başarılı!');
            navigate('/');
        } catch (err) {
            setServerError(err.error || 'Giriş yapılırken bir hata oluştu');
        }
        setLoading(false);
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <div className="auth-logo">🌿</div>
                    <h1>Alerji Takip</h1>
                    <p>Hesabınıza giriş yapın</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                    {serverError && (
                        <div className="auth-error-banner">
                            <span>⚠️</span> {serverError}
                        </div>
                    )}

                    <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
                        <label htmlFor="login-email">E-posta</label>
                        <div className="input-wrapper">
                            <span className="input-icon">📧</span>
                            <input
                                id="login-email"
                                type="email"
                                className="form-input"
                                placeholder="ornek@email.com"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                                autoComplete="email"
                            />
                        </div>
                        {errors.email && <span className="field-error">{errors.email}</span>}
                    </div>

                    <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
                        <label htmlFor="login-password">Şifre</label>
                        <div className="input-wrapper">
                            <span className="input-icon">🔒</span>
                            <input
                                id="login-password"
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="••••••"
                                value={password}
                                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                                autoComplete="current-password"
                            />
                            <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                        {errors.password && <span className="field-error">{errors.password}</span>}
                    </div>

                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading ? (
                            <><span className="btn-spinner"></span> Giriş yapılıyor...</>
                        ) : (
                            'Giriş Yap'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Hesabınız yok mu? <Link to="/register">Kaydol</Link></p>
                </div>
            </div>

            {/* Decorative particles */}
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
