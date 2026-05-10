import { usePollen } from '../../context/PollenContext';

export default function ProfileButton() {
  const { userAllergens, setCurrentView, userAvatar } = usePollen();
  const totalSelected = userAllergens.length;

  return (
    <button
      id="profile-btn"
      onClick={() => setCurrentView('profile')}
      className="clean-profile-btn"
      title="Profil ve alerji ayarları"
      aria-label="Profil"
    >
      <div className="clean-profile-avatar">
        {userAvatar || '👤'}
        {totalSelected > 0 && (
          <span className="clean-profile-badge" aria-label={`${totalSelected} alerjen seçili`}>
            {totalSelected}
          </span>
        )}
      </div>
      <span className="clean-profile-label">profil</span>
    </button>
  );
}
