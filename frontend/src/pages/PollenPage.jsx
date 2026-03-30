import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchPollen } from '../api/client';
import { TURKISH_CITIES, getCountryName } from '../utils/constants';
import { showToast } from '../components/Toast';
import PollenResults from '../components/PollenResults';
import HourlyTimeline from '../components/HourlyTimeline';
import ForecastCards from '../components/ForecastCards';
import MapModal from '../components/MapModal';

export default function PollenPage() {
    const { user, updateUserFavorites } = useAuth();
    const [cityInput, setCityInput] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pollenData, setPollenData] = useState(null);
    const [currentCity, setCurrentCity] = useState('');
    const [currentCoords, setCurrentCoords] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);
    const [showMap, setShowMap] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const lastCity = localStorage.getItem('lastCity') || '';
    const lastCoords = JSON.parse(localStorage.getItem('lastCityCoords') || 'null');

    useEffect(() => {
        if (lastCity && lastCoords) {
            doFetch(lastCoords.lat, lastCoords.lng, lastCity);
        }
    }, []);

    function handleInput(val) {
        setCityInput(val);
        if (val.trim().length < 2) { setSuggestions([]); return; }
        const q = val.trim().toLowerCase();
        const matches = [];
        for (const [key, city] of Object.entries(TURKISH_CITIES)) {
            if (key.includes(q) || city.name.toLowerCase().includes(q)) {
                if (!matches.find(m => m.name === city.name)) matches.push(city);
            }
        }
        setSuggestions(matches.slice(0, 6));
    }

    function selectCity(city) {
        setCityInput(city.name);
        setSuggestions([]);
        doFetch(city.lat, city.lng, city.name);
    }

    function handleSearch() {
        if (!cityInput.trim()) return;
        const q = cityInput.trim().toLowerCase();
        const found = findCity(q);
        if (found) {
            selectCity(found);
        } else {
            geocodeCity(cityInput.trim());
        }
    }

    function findCity(query) {
        const normalized = query.toLowerCase()
            .replace(/İ/g, 'i').replace(/I/g, 'ı')
            .replace(/ş/g, 's').replace(/ç/g, 'c')
            .replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ğ/g, 'g');
        for (const [key, city] of Object.entries(TURKISH_CITIES)) {
            const cityNorm = key.replace(/İ/g, 'i').replace(/I/g, 'ı')
                .replace(/ş/g, 's').replace(/ç/g, 'c')
                .replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ğ/g, 'g');
            if (key === query || city.name.toLowerCase() === query || cityNorm === normalized) return city;
        }
        return null;
    }

    async function geocodeCity(name) {
        setLoading(true); setError('');
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}&limit=1&accept-language=tr`;
            const res = await fetch(url, { headers: { 'User-Agent': 'AlerjiTakip/1.0' } });
            const data = await res.json();
            if (data.length > 0) {
                const r = data[0];
                doFetch(parseFloat(r.lat), parseFloat(r.lon), r.display_name.split(',')[0]);
            } else {
                setError(`"${name}" için konum bulunamadı.`);
                setLoading(false);
            }
        } catch {
            setError('Konum aranırken hata oluştu.');
            setLoading(false);
        }
    }

    async function doFetch(lat, lng, name) {
        setLoading(true); setError(''); setShowResults(false);
        try {
            const data = await fetchPollen(lat, lng, 5);
            setPollenData(data);
            setCurrentCity(name);
            setCurrentCoords({ lat, lng });
            setSelectedDay(data.dailyInfo?.[0] || null);
            setShowResults(true);
            localStorage.setItem('lastCity', name);
            localStorage.setItem('lastCityCoords', JSON.stringify({ lat, lng }));
        } catch (err) {
            setError(err.error || 'Polen verileri yüklenirken hata oluştu.');
        }
        setLoading(false);
    }

    function isFav() {
        return (user?.favorites || []).some(f => f.name === currentCity);
    }

    async function toggleFavorite() {
        if (!currentCity || !currentCoords) return;
        const favs = [...(user?.favorites || [])];
        if (isFav()) {
            const filtered = favs.filter(f => f.name !== currentCity);
            await updateUserFavorites(filtered);
            showToast(`💔 ${currentCity} favorilerden çıkarıldı`);
        } else {
            favs.push({ name: currentCity, lat: currentCoords.lat, lng: currentCoords.lng, addedAt: Date.now() });
            await updateUserFavorites(favs);
            showToast(`❤️ ${currentCity} favorilere eklendi`);
        }
    }

    function handleMapConfirm(coords, name) {
        setShowMap(false);
        setCityInput(name);
        doFetch(coords.lat, coords.lng, name);
    }

    const dayInfo = selectedDay || pollenData?.dailyInfo?.[0];

    return (
        <div className="pollen-page">
            {/* Search */}
            <div className="search-section">
                <div className="search-row">
                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Şehir adı girin..."
                            value={cityInput}
                            onChange={e => handleInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); if (e.key === 'Escape') setSuggestions([]); }}
                        />
                        <button className="search-btn" onClick={handleSearch}>→</button>
                    </div>
                    <button className="map-picker-btn" onClick={() => setShowMap(true)} title="Haritadan Seç">
                        📍
                    </button>
                </div>
                {suggestions.length > 0 && (
                    <div className="search-suggestions show">
                        {suggestions.map((city, i) => (
                            <div key={i} className="suggestion-item" onClick={() => selectCity(city)}>
                                <span className="suggestion-pin">{isFav() ? '❤️' : '📍'}</span>
                                <span>{city.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Loading */}
            {loading && (
                <div className="loading-state show">
                    <div className="loading-spinner"></div>
                    <p>Polen verileri yükleniyor...</p>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="error-state show">
                    <div className="error-icon">⚠️</div>
                    <p className="error-message">{error}</p>
                    <button className="retry-btn" onClick={() => currentCoords && doFetch(currentCoords.lat, currentCoords.lng, currentCity)}>
                        Tekrar Dene
                    </button>
                </div>
            )}

            {/* Welcome */}
            {!loading && !error && !showResults && (
                <div className="welcome-state">
                    <div className="welcome-illustration">
                        <div className="pollen-particles">
                            <span className="particle p1">🌸</span>
                            <span className="particle p2">🌾</span>
                            <span className="particle p3">🌿</span>
                            <span className="particle p4">🌲</span>
                            <span className="particle p5">🍃</span>
                            <span className="particle p6">🌻</span>
                        </div>
                    </div>
                    <h2>Şehrinizi Arayın</h2>
                    <p>Şehir adınızı girerek o bölgedeki günlük polen yoğunluğunu öğrenin.</p>
                </div>
            )}

            {/* Results */}
            {showResults && !loading && !error && pollenData && dayInfo && (
                <>
                    {/* City banner */}
                    <div className="city-banner">
                        <div className="city-banner-left">
                            <span className="city-pin">📍</span>
                            <div>
                                <div className="city-name">{currentCity}</div>
                                <div className="city-region">{pollenData.regionCode ? getCountryName(pollenData.regionCode) : ''}</div>
                            </div>
                        </div>
                        <div className="city-banner-actions">
                            <button
                                className={`fav-toggle-btn ${isFav() ? 'is-fav' : ''}`}
                                onClick={toggleFavorite}
                                title={isFav() ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                            >
                                ❤️
                            </button>
                        </div>
                    </div>

                    <PollenResults dayInfo={dayInfo} cityName={currentCity} regionCode={pollenData.regionCode} />
                    <HourlyTimeline dayInfo={dayInfo} />
                    <ForecastCards dailyInfo={pollenData.dailyInfo} onDaySelect={setSelectedDay} />
                </>
            )}

            <MapModal isOpen={showMap} onClose={() => setShowMap(false)} onConfirm={handleMapConfirm} initialCoords={currentCoords} />
        </div>
    );
}
