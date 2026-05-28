import { usePollen } from '../../context/PollenContext';
import { useAuth } from '../../context/AuthContext';

export default function ProfileButton() {
  const { userAllergens, setCurrentView, userAvatar } = usePollen();
  const { user } = useAuth();
  const totalSelected = userAllergens.length;

  // Giriş yapılmışsa tek bölümde kullanıcı adını göster; değilse "profil".
  const label = user?.name || 'profil';
  const avatar = user?.avatar || userAvatar || '👤';

  return (
    <button
      id="profile-btn"
      onClick={() => setCurrentView('profile')}
      className="clean-profile-btn"
      title="Profil ve alerji ayarları"
      aria-label="Profil"
    >
      <div className="clean-profile-avatar">
        {avatar}
        {totalSelected > 0 && (
          <span className="clean-profile-badge" aria-label={`${totalSelected} alerjen seçili`}>
            {totalSelected}
          </span>
        )}
      </div>
      <span className="clean-profile-label">{label}</span>
    </button>
  );
}
