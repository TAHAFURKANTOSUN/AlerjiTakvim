import { usePollen } from '../../context/PollenContext';
import { useAuth } from '../../context/AuthContext';
import { useUsage } from '../../context/UsageContext';
import '../membership/membership.css';

const AVATAR_OPTIONS = ['👤', '👩', '👨', '👧', '🧑', '👩‍⚕️', '🌿', '🌸', '🌺', '🦋', '🌻', '🍀'];

export default function DashboardProfilePage({ onClose }) {
  const {
    userAllergens, toggleAllergen, allergenOptions,
    userAvatar, setUserAvatar,
  } = usePollen();
  const { user, updateUserProfile } = useAuth();
  const { openLogin } = useUsage();

  const totalSelected = userAllergens.length;
  const displayAvatar = user?.avatar || userAvatar || '👤';

  // Avatar seçimi: misafirde yerel, üyede hesaba kaydedilir.
  function handleAvatar(opt) {
    setUserAvatar(opt);
    if (user) updateUserProfile({ avatar: opt }).catch(() => {});
  }

  return (
    <div className="profile-fullpage animate-fade-in">
      {/* Header */}
      <div className="profile-fp-header">
        <button className="profile-fp-back" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Dashboard</span>
        </button>
        <h2 className="profile-fp-title">Profil & Alerji Ayarları</h2>
      </div>

      <div className="profile-fp-content">
        {/* Avatar & Name Card */}
        <div className="profile-fp-card">
          <div className="profile-fp-card-header">
            <span className="profile-fp-card-icon">👤</span>
            <h3>Kişisel Bilgiler</h3>
          </div>
          <div className="profile-fp-card-body">
            {/* Kimlik — kullanıcı kim olduğunu hemen görsün */}
            <div className="profile-fp-avatar-display">
              <div className="profile-fp-avatar-large">{displayAvatar}</div>
              <div className="profile-fp-avatar-name">
                {user ? `Hoş geldiniz, ${user.name}` : 'Misafir kullanıcı'}
              </div>
              {user && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Giriş yapan: {user.email}
                </div>
              )}
              {user && (
                <span
                  className={`mb-plan-badge ${user.plan === 'premium' ? 'premium' : 'free'}`}
                  style={{ marginTop: 8 }}
                >
                  {user.plan === 'premium' ? 'Premium üye' : 'Ücretsiz üye'}
                </span>
              )}
            </div>

            {user ? (
              <>
                {/* Kullanıcı adı — salt okunur kimlik (değiştirilemez) */}
                <div className="profile-fp-field">
                  <label>Kullanıcı adı</label>
                  <input
                    type="text"
                    value={user.name}
                    readOnly
                    disabled
                    aria-readonly="true"
                    className="profile-fp-input"
                    style={{ opacity: 0.65, cursor: 'not-allowed' }}
                  />
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                    🔒 Bu, hesap kimliğinizdir ve değiştirilemez.
                  </p>
                </div>

                {/* Avatar — kişiselleştirme (değiştirilebilir) */}
                <div className="profile-fp-field">
                  <label>Avatar</label>
                  <div className="profile-fp-avatar-grid">
                    {AVATAR_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        className={`profile-fp-avatar-option ${displayAvatar === opt ? 'selected' : ''}`}
                        onClick={() => handleAvatar(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="profile-fp-info">
                <span>👋</span>
                <div>
                  <p className="profile-fp-info-title">Misafir olarak geziniyorsunuz</p>
                  <p className="profile-fp-info-text">
                    Kişisel kimliğiniz ve daha yüksek günlük kullanım hakları için giriş yapın.
                  </p>
                  <button className="mb-login-btn" style={{ marginTop: 10 }} onClick={openLogin}>
                    Giriş yap / Kayıt ol
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Allergen Selection Card */}
        <div className="profile-fp-card">
          <div className="profile-fp-card-header">
            <span className="profile-fp-card-icon">🤧</span>
            <h3>Alerji Tercihlerim</h3>
            <span className="profile-fp-badge">{totalSelected} seçili</span>
          </div>

          {/* Info banner */}
          <div className="profile-fp-info">
            <span>💡</span>
            <div>
              <p className="profile-fp-info-title">Kişiselleştirilmiş uyarılar</p>
              <p className="profile-fp-info-text">
                Seçtiğiniz alerjenlere göre günlük risk durumu, saatlik grafik ve tavsiyeler otomatik güncellenir.
              </p>
            </div>
          </div>

          <div className="profile-fp-card-body">
            {allergenOptions.map((group, gi) => (
              <div key={gi} className="profile-fp-allergen-group">
                {/* Group header */}
                <div className="profile-fp-group-header">
                  <span>{group.groupIcon}</span>
                  <h4>{group.groupName}</h4>
                  <span className="profile-fp-group-count">
                    {group.items.filter(i => userAllergens.includes(i.key)).length}/{group.items.length}
                  </span>
                </div>

                {/* Allergen items */}
                <div className="profile-fp-allergen-list">
                  {group.items.map((item) => {
                    const isSelected = userAllergens.includes(item.key);
                    return (
                      <label key={item.key} className={`profile-fp-allergen-item ${isSelected ? 'selected' : ''}`}>
                        <div className={`profile-fp-checkbox ${isSelected ? 'checked' : ''}`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleAllergen(item.key)} className="sr-only" />
                        <span className="profile-fp-allergen-icon">{item.icon}</span>
                        <span className="profile-fp-allergen-name">{item.name}</span>
                        {isSelected && (
                          <span className="profile-fp-tracking-badge">Takip</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats card */}
        <div className="profile-fp-card">
          <div className="profile-fp-card-header">
            <span className="profile-fp-card-icon">📊</span>
            <h3>İstatistikler</h3>
          </div>
          <div className="profile-fp-stats">
            <div className="profile-fp-stat">
              <span className="profile-fp-stat-value">{totalSelected}</span>
              <span className="profile-fp-stat-label">Takip Edilen Alerjen</span>
            </div>
            <div className="profile-fp-stat">
              <span className="profile-fp-stat-value">
                {allergenOptions.reduce((sum, g) => sum + g.items.length, 0)}
              </span>
              <span className="profile-fp-stat-label">Toplam Alerjen</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
