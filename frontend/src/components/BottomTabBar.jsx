import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const tabs = [
    { key: '/', icon: '🏠', label: 'Dashboard' },
    { key: '/pollen', icon: '🌿', label: 'Polen' },
    { key: '/favorites', icon: '❤️', label: 'Favoriler' },
    { key: '/profile', icon: '👤', label: 'Profil' },
];

export default function BottomTabBar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const favCount = user?.favorites?.length || 0;

    return (
        <nav className="tab-bar">
            {tabs.map(tab => (
                <button
                    key={tab.key}
                    className={`tab-item ${location.pathname === tab.key ? 'active' : ''}`}
                    onClick={() => navigate(tab.key)}
                >
                    <span className="tab-icon">{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.key === '/favorites' && favCount > 0 && (
                        <span className="tab-badge show">{favCount}</span>
                    )}
                </button>
            ))}
        </nav>
    );
}
