import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchPollen } from '../api/client';
import { MONTHS_TR, UPI_LEVEL_NAMES, UPI_COLORS, UPI_BG_COLORS, POLLEN_TYPE_NAMES_TR, POLLEN_TYPE_ICONS, getMaxLevel } from '../utils/constants';
import { showToast } from '../components/Toast';

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const today = new Date();
    const [lastCityData, setLastCityData] = useState(null);
    const [favData, setFavData] = useState([]);
    const [loading, setLoading] = useState(false);

    const lastCity = localStorage.getItem('lastCity') || '';
    const lastCityCoords = JSON.parse(localStorage.getItem('lastCityCoords') || 'null');

    useEffect(() => {
        if (lastCityCoords) {
            loadLastCity();
        }
        if (user?.favorites?.length > 0) {
            loadFavoritesPreview();
        }
    }, []);

    async function loadLastCity() {
        if (!lastCityCoords) return;
        setLoading(true);
        try {
            const data = await fetchPollen(lastCityCoords.lat, lastCityCoords.lng, 1);
            setLastCityData(data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    }

    async function loadFavoritesPreview() {
        const results = [];
        const favs = (user?.favorites || []).slice(0, 3);
        for (const fav of favs) {
            try {
                const data = await fetchPollen(fav.lat, fav.lng, 1);
                const dayInfo = data?.dailyInfo?.[0];
                results.push({ ...fav, maxLevel: dayInfo ? getMaxLevel(dayInfo) : 0 });
            } catch {
                results.push({ ...fav, maxLevel: 0 });
            }
        }
        setFavData(results);
    }

    // Greeting based on time of day
    function getGreeting() {
        const h = today.getHours();
        if (h < 6) return '🌙 İyi geceler';
        if (h < 12) return '🌅 Günaydın';
        if (h < 18) return '☀️ İyi günler';
        return '🌇 İyi akşamlar';
    }

    // Allergy alerts
    function getAllergyAlerts() {
        if (!user?.allergies?.length || !lastCityData?.dailyInfo?.[0]) return [];
        const dayInfo = lastCityData.dailyInfo[0];
        const alerts = [];
        if (dayInfo.pollenTypeInfo) {
            for (const type of dayInfo.pollenTypeInfo) {
                if (user.allergies.includes(type.code) && (type.indexInfo?.value ?? 0) >= 3) {
                    alerts.push({
                        type: POLLEN_TYPE_NAMES_TR[type.code] || type.code,
                        level: type.indexInfo.value,
                        icon: POLLEN_TYPE_ICONS[type.code] || '🌱'
                    });
                }
            }
        }
        return alerts;
    }

    const alerts = getAllergyAlerts();
    const lastDayInfo = lastCityData?.dailyInfo?.[0];
    const lastMaxLevel = lastDayInfo ? getMaxLevel(lastDayInfo) : 0;

    return (
        <div className="dashboard-page">
            {/* Welcome Card */}
            <div className="dash-welcome-card">
                <div className="dash-welcome-top">
                    <div className="dash-avatar">{user?.avatar || '👤'}</div>
                    <div>
                        <h2>{getGreeting()}, {user?.name || 'Kullanıcı'}!</h2>
                        <p className="dash-date">{today.getDate()} {MONTHS_TR[today.getMonth()]} {today.getFullYear()}</p>
                    </div>
                </div>
            </div>

            {/* Allergy Alerts */}
            {alerts.length > 0 && (
                <div className="dash-alerts-card">
                    <h3>⚠️ Alerji Uyarıları</h3>
                    {alerts.map((a, i) => (
                        <div key={i} className="dash-alert-item">
                            <span>{a.icon}</span>
                            <span><strong>{a.type}</strong> poleni bugün <span style={{ color: UPI_COLORS[a.level], fontWeight: 700 }}>{UPI_LEVEL_NAMES[a.level]}</span> seviyede!</span>
                        </div>
                    ))}
                    <p className="dash-alert-tip">🏠 Mümkünse dışarı çıkmaktan kaçının ve maske kullanın.</p>
                </div>
            )}

            {/* Last City Card */}
            {lastCity && lastCityCoords && (
                <div className="dash-city-card" onClick={() => navigate('/pollen')}>
                    <div className="dash-city-header">
                        <h3>📍 Son Aranan Şehir</h3>
                        <span className="dash-city-arrow">→</span>
                    </div>
                    <div className="dash-city-info">
                        <span className="dash-city-name">{lastCity}</span>
                        {loading ? (
                            <span className="dash-city-status">Yükleniyor...</span>
                        ) : lastDayInfo ? (
                            <div className="dash-city-level" style={{ background: UPI_BG_COLORS[lastMaxLevel] }}>
                                <span className={`badge-dot dot-${lastMaxLevel}`}></span>
                                <span style={{ color: UPI_COLORS[lastMaxLevel], fontWeight: 700 }}>
                                    {UPI_LEVEL_NAMES[lastMaxLevel]}
                                </span>
                            </div>
                        ) : (
                            <span className="dash-city-status">Veri yok</span>
                        )}
                    </div>
                    {lastDayInfo?.pollenTypeInfo && (
                        <div className="dash-types-row">
                            {lastDayInfo.pollenTypeInfo.map((t, i) => {
                                const lvl = t.indexInfo?.value ?? 0;
                                return (
                                    <span key={i} className={`dash-type-pill upi-${lvl}`}>
                                        {POLLEN_TYPE_ICONS[t.code] || '🌱'} {POLLEN_TYPE_NAMES_TR[t.code] || t.code}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Favorites Preview */}
            {favData.length > 0 && (
                <div className="dash-favs-card">
                    <div className="dash-favs-header">
                        <h3>❤️ Favori Şehirler</h3>
                        <button className="dash-favs-all" onClick={() => navigate('/favorites')}>Tümü →</button>
                    </div>
                    <div className="dash-favs-list">
                        {favData.map((f, i) => (
                            <div key={i} className="dash-fav-item" onClick={() => {
                                localStorage.setItem('lastCity', f.name);
                                localStorage.setItem('lastCityCoords', JSON.stringify({ lat: f.lat, lng: f.lng }));
                                navigate('/pollen');
                            }}>
                                <span className="dash-fav-name">📍 {f.name}</span>
                                <span className={`dash-fav-level dot-${f.maxLevel}`} style={{ color: UPI_COLORS[f.maxLevel] }}>
                                    {UPI_LEVEL_NAMES[f.maxLevel]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="dash-actions">
                <button className="dash-action-btn" onClick={() => navigate('/pollen')}>
                    <span>🔍</span>
                    <span>Şehir Ara</span>
                </button>
                <button className="dash-action-btn" onClick={() => navigate('/favorites')}>
                    <span>❤️</span>
                    <span>Favoriler</span>
                </button>
                <button className="dash-action-btn" onClick={() => navigate('/profile')}>
                    <span>⚙️</span>
                    <span>Profil</span>
                </button>
            </div>

            {/* No data state */}
            {!lastCity && !user?.favorites?.length && (
                <div className="dash-empty">
                    <div className="dash-empty-icon">🌿</div>
                    <h3>Hoş geldiniz!</h3>
                    <p>Şehir arayarak polen durumunu öğrenmeye başlayın.</p>
                    <button className="dash-empty-btn" onClick={() => navigate('/pollen')}>Şehir Ara</button>
                </div>
            )}
        </div>
    );
}
