import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MONTHS_TR } from '../utils/constants';

export default function Navbar() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const today = new Date();
    const dateStr = `${today.getDate()} ${MONTHS_TR[today.getMonth()]}`;

    return (
        <header className="app-header">
            <div className="header-content">
                <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <span className="logo-icon">🌿</span>
                    <h1>Alerji Takip</h1>
                </div>
                <div className="header-right">
                    <div className="header-date">{dateStr}</div>
                    <button className="profile-btn" onClick={() => navigate('/profile')} title="Profil">
                        <span className="profile-avatar">{user?.avatar || '👤'}</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
