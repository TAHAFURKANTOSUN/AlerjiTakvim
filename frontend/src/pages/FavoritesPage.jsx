import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchPollen } from '../api/client';
import { UPI_LEVEL_NAMES, UPI_COLORS, UPI_BG_COLORS, POLLEN_TYPE_NAMES_TR, POLLEN_TYPE_ICONS, getMaxLevel, getCountryName } from '../utils/constants';
import { showToast } from '../components/Toast';

export default function FavoritesPage() {
    const { user, updateUserFavorites } = useAuth();
    const navigate = useNavigate();
    const [favData, setFavData] = useState({});
    const [loadingAll, setLoadingAll] = useState(false);
    const favorites = user?.favorites || [];

    useEffect(() => {
        if (favorites.length > 0) loadAllFavs();
    }, [favorites.length]);

    async function loadAllFavs() {
        setLoadingAll(true);
        const results = {};
        for (const fav of favorites) {
            try {
                const data = await fetchPollen(fav.lat, fav.lng, 1);
                results[fav.name] = data;
            } catch {
                results[fav.name] = null;
            }
        }
        setFavData(results);
        setLoadingAll(false);
    }

    async function removeFav(name) {
        const filtered = favorites.filter(f => f.name !== name);
        await updateUserFavorites(filtered);
        showToast(`💔 ${name} favorilerden çıkarıldı`);
    }

    function goToCity(fav) {
        localStorage.setItem('lastCity', fav.name);
        localStorage.setItem('lastCityCoords', JSON.stringify({ lat: fav.lat, lng: fav.lng }));
        navigate('/pollen');
    }

    return (
        <div className="favorites-page">
            <div className="fav-header">
                <h2>❤️ Favori Şehirlerim</h2>
                <p className="fav-subtitle">Takip ettiğiniz şehirlerin güncel polen durumu</p>
            </div>

            {favorites.length === 0 ? (
                <div className="fav-empty">
                    <div className="fav-empty-icon">💔</div>
                    <h3>Henüz favori şehriniz yok</h3>
                    <p>Bir şehir arayıp ❤️ butonuna basarak favorilerinize ekleyin.</p>
                    <button className="fav-go-search-btn" onClick={() => navigate('/pollen')}>Şehir Ara</button>
                </div>
            ) : (
                <>
                    <div className="fav-grid">
                        {favorites.map((fav, i) => {
                            const data = favData[fav.name];
                            const dayInfo = data?.dailyInfo?.[0];
                            const maxLevel = dayInfo ? getMaxLevel(dayInfo) : 0;
                            return (
                                <div key={i} className={`fav-city-card upi-level-${maxLevel}`} onClick={() => goToCity(fav)}>
                                    <div className="fav-city-top">
                                        <div className="fav-city-info">
                                            <span className="fav-city-pin">📍</span>
                                            <div>
                                                <div className="fav-city-name">{fav.name}</div>
                                                <div className="fav-city-region">
                                                    {data ? getCountryName(data.regionCode || 'TR') : 'Yükleniyor...'}
                                                </div>
                                            </div>
                                        </div>
                                        <button className="fav-remove-btn" onClick={(e) => { e.stopPropagation(); removeFav(fav.name); }}>✕</button>
                                    </div>
                                    <div className="fav-city-level" style={{ background: UPI_BG_COLORS[maxLevel] }}>
                                        <span className={`fav-level-dot dot-${maxLevel}`}></span>
                                        <span className="fav-level-text" style={{ color: UPI_COLORS[maxLevel] }}>
                                            {dayInfo ? UPI_LEVEL_NAMES[maxLevel] : 'Yükleniyor...'}
                                        </span>
                                    </div>
                                    {dayInfo?.pollenTypeInfo && (
                                        <div className="fav-city-types">
                                            {dayInfo.pollenTypeInfo.map((type, j) => {
                                                const lvl = type.indexInfo?.value ?? 0;
                                                const name = POLLEN_TYPE_NAMES_TR[type.code] || type.displayName || type.code;
                                                const icon = POLLEN_TYPE_ICONS[type.code] || '🌱';
                                                return (
                                                    <span key={j} className={`fav-type-pill upi-${lvl}`}>{icon} {name}</span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <button className="fav-refresh-btn" onClick={loadAllFavs} disabled={loadingAll}>
                        {loadingAll ? '⏳ Güncelleniyor...' : '🔄 Tümünü Güncelle'}
                    </button>
                </>
            )}
        </div>
    );
}
