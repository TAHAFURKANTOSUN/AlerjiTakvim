import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { deleteAccount } from '../api/client';
import { showToast } from '../components/Toast';

const AVATAR_OPTIONS = ['👤', '👩', '👨', '👧', '🧑', '👩‍⚕️', '🌿', '🌸'];

export default function ProfilePage() {
    const { user, logoutUser, updateUserProfile, clearUser } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState(user?.name || '');
    const [avatar, setAvatar] = useState(user?.avatar || '👤');
    const [allergies, setAllergies] = useState(user?.allergies || []);
    const [saving, setSaving] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [deleting, setDeleting] = useState(false);

    async function handleSaveProfile() {
        if (name.trim().length < 2) {
            showToast('⚠️ İsim en az 2 karakter olmalıdır');
            return;
        }
        setSaving(true);
        try {
            await updateUserProfile({ name: name.trim(), avatar, allergies });
            showToast('✅ Profil kaydedildi');
        } catch (err) {
            showToast('❌ ' + (err.error || 'Profil kaydedilemedi'));
        }
        setSaving(false);
    }

    function handleAllergyToggle(type) {
        setAllergies(prev =>
            prev.includes(type) ? prev.filter(a => a !== type) : [...prev, type]
        );
    }

    function handleLogout() {
        logoutUser();
        showToast('👋 Çıkış yapıldı');
        navigate('/login');
    }

    async function handleDeleteAccount() {
        setDeleteError('');
        setDeleting(true);
        try {
            await deleteAccount(deletePassword);
            clearUser();
            showToast('🗑️ Hesabınız silindi');
            navigate('/login');
        } catch (err) {
            setDeleteError(err.error || 'Hesap silinemedi');
        }
        setDeleting(false);
    }

    const favCount = user?.favorites?.length || 0;

    return (
        <div className="profile-page">
            {/* Profile Header */}
            <div className="profile-header-card">
                <div className="profile-avatar-large">{avatar}</div>
                <div className="profile-name-display">{user?.name || 'Kullanıcı'}</div>
                <div className="profile-subtitle">
                    {user?.email}
                </div>
            </div>

            {/* Profile Form */}
            <div className="profile-form-card">
                <h3>👤 Profil Bilgileri</h3>
                <div className="form-group">
                    <label htmlFor="profile-name">İsim</label>
                    <input
                        id="profile-name"
                        type="text"
                        className="form-input"
                        placeholder="Adınızı girin..."
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Avatar</label>
                    <div className="avatar-picker">
                        {AVATAR_OPTIONS.map(opt => (
                            <button
                                key={opt}
                                className={`avatar-option ${avatar === opt ? 'selected' : ''}`}
                                onClick={() => setAvatar(opt)}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
                <button className="profile-save-btn" onClick={handleSaveProfile} disabled={saving}>
                    {saving ? 'Kaydediliyor...' : 'Profili Kaydet'}
                </button>
            </div>

            {/* Allergy Preferences */}
            <div className="profile-form-card">
                <h3>🤧 Alerji Tercihlerim</h3>
                <p className="form-hint">Hassas olduğunuz polen türlerini seçin. Dashboard'da uyarı alırsınız.</p>
                <div className="allergy-options">
                    {[
                        { code: 'TREE', label: '🌲 Ağaç Poleni' },
                        { code: 'GRASS', label: '🌾 Çimen Poleni' },
                        { code: 'WEED', label: '🌿 Yabani Ot Poleni' },
                    ].map(item => (
                        <label key={item.code} className="allergy-toggle">
                            <input
                                type="checkbox"
                                checked={allergies.includes(item.code)}
                                onChange={() => handleAllergyToggle(item.code)}
                            />
                            <span className="allergy-toggle-slider"></span>
                            <span className="allergy-toggle-label">{item.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="profile-stats-card">
                <div className="stat-item">
                    <span className="stat-value">{favCount}</span>
                    <span className="stat-label">Favori Şehir</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">{allergies.length}</span>
                    <span className="stat-label">Alerji Türü</span>
                </div>
            </div>

            {/* Logout */}
            <button className="profile-logout-btn" onClick={handleLogout}>
                🚪 Çıkış Yap
            </button>

            {/* Delete Account */}
            <button className="profile-delete-btn" onClick={() => setShowDeleteModal(true)}>
                🗑️ Hesabı Sil
            </button>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-icon">⚠️</div>
                        <h3>Hesabınızı silmek istediğinize emin misiniz?</h3>
                        <p className="modal-desc">Bu işlem geri alınamaz. Tüm verileriniz kalıcı olarak silinecektir.</p>
                        <div className="form-group" style={{ marginTop: 16 }}>
                            <label htmlFor="delete-password">Onay için şifrenizi girin</label>
                            <input
                                id="delete-password"
                                type="password"
                                className="form-input"
                                placeholder="Şifreniz"
                                value={deletePassword}
                                onChange={e => { setDeletePassword(e.target.value); setDeleteError(''); }}
                            />
                        </div>
                        {deleteError && <div className="auth-error-banner"><span>⚠️</span> {deleteError}</div>}
                        <div className="modal-actions">
                            <button className="modal-cancel-btn" onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteError(''); }}>
                                İptal
                            </button>
                            <button className="modal-danger-btn" onClick={handleDeleteAccount} disabled={deleting || !deletePassword}>
                                {deleting ? 'Siliniyor...' : 'Hesabı Sil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
