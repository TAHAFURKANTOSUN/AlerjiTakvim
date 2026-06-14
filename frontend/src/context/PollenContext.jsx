import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { TURKISH_PROVINCES_SORTED as LOCATIONS } from '../data/turkishProvinces';
import { ALLERGEN_OPTIONS } from '../data/staticReference';
import { adaptLivePollen } from '../data/livePollenAdapter';
import { loadLocation, saveLocation } from '../utils/locationStorage';
import { fetchPollen, fetchEnvironment } from '../api/client';

const PollenContext = createContext(null);

// Alfabetik listede İstanbul ilk değil — ad ile bul.
const DEFAULT_LOCATION =
  LOCATIONS.find((l) => l.key === 'istanbul') || LOCATIONS[0];
const DEFAULT_ALLERGENS = ['cimen', 'zeytin', 'pelin'];

/**
 * State initializer — kayıtlı konum varsa onu, yoksa varsayılanı döner.
 * useState'in lazy form'unda çağrıldığı için ilk render'da SENKRON çalışır:
 * sayfa hiç boş veya İstanbul ile gelmez, doğrudan kayıtlı konumla başlar.
 */
function initialLocation() {
  const saved = loadLocation();
  if (!saved) return DEFAULT_LOCATION;

  // Eğer kayıtlı key sabit listede varsa o referansı kullan (mockData
  // fonksiyonları LOCATIONS'taki nesneye bağlı olabiliyor) — yoksa
  // ham kayıttan üretilmiş objeyi kullan.
  const match = LOCATIONS.find(l => l.key === saved.key);
  return match || saved;
}

export function PollenProvider({ children }) {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [userAllergens, setUserAllergens] = useState(() => {
    try {
      const saved = localStorage.getItem('userAllergens');
      return saved ? JSON.parse(saved) : DEFAULT_ALLERGENS;
    } catch { return DEFAULT_ALLERGENS; }
  });
  const [showAllPollens, setShowAllPollens] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'profile'

  // ── Canlı (Google Pollen API'den gelen) veri ──
  const [livePollen, setLivePollen] = useState(null);
  const [pollenLoading, setPollenLoading] = useState(false);
  const [pollenError, setPollenError] = useState(null);

  // ── Hava durumu + hava kalitesi (Open-Meteo) ──
  const [weather, setWeather] = useState(null);   // { data, summary } | null
  const [aqi, setAqi] = useState(null);           // { data, summary } | null
  const [envLoading, setEnvLoading] = useState(false);

  // Yarış koşulu engeli: yalnızca SON istek yanıtı uygulanır
  const requestIdRef = useRef(0);

  const fetchLivePollenFor = useCallback(async (lat, lng) => {
    // /api/pollen artık public — login olmasan da çalışır.
    const myReqId = ++requestIdRef.current;
    setPollenLoading(true);
    setEnvLoading(true);
    setPollenError(null);
    try {
      // Pollen + Çevre verilerini paralel çek; biri başarısız olsa diğeri sürer
      const [pollenResult, envResult] = await Promise.allSettled([
        fetchPollen(lat, lng, 1),
        fetchEnvironment(lat, lng),
      ]);

      if (myReqId !== requestIdRef.current) return; // eski istek, yok say

      if (pollenResult.status === 'fulfilled') {
        setLivePollen(pollenResult.value);
      } else {
        const err = pollenResult.reason;
        setLivePollen(null);
        if (err?.status === 401) {
          setPollenError('Oturum sona erdi, lütfen tekrar giriş yapın');
        } else if (err?.status === 429) {
          setPollenError('API istek limiti aşıldı, kısa süre sonra tekrar deneyin');
        } else {
          setPollenError(err?.error || err?.message || 'Polen verisi alınamadı');
        }
        console.warn('[Pollen] fetch hatası:', err?.message || err);
      }

      if (envResult.status === 'fulfilled') {
        setWeather(envResult.value.weather ?? null);
        setAqi(envResult.value.aqi ?? null);
      } else {
        console.warn('[Env] fetch hatası:', envResult.reason?.message);
        // hava/AQI başarısız olsa da UI çalışmaya devam eder
      }
    } finally {
      if (myReqId === requestIdRef.current) {
        setPollenLoading(false);
        setEnvLoading(false);
      }
    }
  }, []);

  // User personalization state (persisted in localStorage)
  const [userName, setUserNameState] = useState(() => {
    return localStorage.getItem('userName') || '';
  });
  const [userAvatar, setUserAvatarState] = useState(() => {
    return localStorage.getItem('userAvatar') || '👤';
  });

  const setUserName = useCallback((name) => {
    setUserNameState(name);
    localStorage.setItem('userName', name);
  }, []);

  const setUserAvatar = useCallback((avatar) => {
    setUserAvatarState(avatar);
    localStorage.setItem('userAvatar', avatar);
  }, []);

  // Derived data — CANLI polen API yanıtından üretilir (mock YOK).
  // livePollen henüz gelmediyse boş yapı verilir → widget'lar skeleton gösterir.
  const pollenData = useMemo(() => {
    if (!livePollen) {
      return { summary: null, hourly: [], forecast: [], density: [], alerts: null };
    }
    return adaptLivePollen(livePollen, userAllergens);
  }, [livePollen, userAllergens]);

  const updateLocation = useCallback((location) => {
    setSelectedLocation(location);
    saveLocation(location); // ← kalıcılık katmanı
  }, []);

  /**
   * "Ana sayfa" aksiyonu — header logosuna tıklayınca çağrılır.
   *
   * SADECE görünümü dashboard'a alır. Kullanıcının seçtiği şehre
   * DOKUNMAZ — yoksa profil sayfasından dönerken veya logoya kasıtsız
   * tıkladığında saved location ezilir ve refresh'te İstanbul'a dönerdi.
   */
  const goHome = useCallback(() => {
    setCurrentView('dashboard');
  }, []);

  /**
   * Haritadan tıklanan HAM koordinatlarla state'i güncelle.
   * Hiçbir snap/yuvarlama yapılmaz — Google Pollen API tam noktayı alır.
   *
   * Eğer tıklanan nokta sabit listedeki bir şehre çok yakınsa (~5 km içinde)
   * sadece OKUNAKLI bir isim için şehir adı kullanılır; lat/lng yine ham
   * tıklama değerleridir.
   */
  const updateLocationFromCoords = useCallback((lat, lng) => {
    // Sayısallaştır + sınır kontrolü
    const rawLat = Number(lat);
    const rawLng = Number(lng);
    if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) return;
    if (rawLat < -90 || rawLat > 90 || rawLng < -180 || rawLng > 180) return;

    // Salt isim için en yakın şehir (~5 km eşiği) — koordinatlara DOKUNMA
    let nearestName = 'Seçilen Konum';
    let minDist = Infinity;
    for (const loc of LOCATIONS) {
      const d = Math.hypot(loc.lat - rawLat, loc.lng - rawLng);
      if (d < minDist) { minDist = d; if (d < 0.05) nearestName = loc.name; }
    }

    const next = {
      key: `coord_${rawLat.toFixed(4)}_${rawLng.toFixed(4)}`,
      name: nearestName,
      lat: rawLat,
      lng: rawLng,
    };

    setSelectedLocation(next);
    saveLocation(next);
    // Pollen fetch, aşağıdaki useEffect tarafından lat/lng değişimine
    // bağlı olarak otomatik tetiklenecek — burada ayrıca çağırmıyoruz.
  }, []);

  // Konum değiştiğinde canlı Pollen API'yi çağır (ilk mount + her güncelleme).
  useEffect(() => {
    fetchLivePollenFor(selectedLocation.lat, selectedLocation.lng);
  }, [selectedLocation.lat, selectedLocation.lng, fetchLivePollenFor]);

  const toggleAllergen = useCallback((allergenKey) => {
    setUserAllergens(prev => {
      const next = prev.includes(allergenKey)
        ? prev.filter(k => k !== allergenKey)
        : [...prev, allergenKey];
      localStorage.setItem('userAllergens', JSON.stringify(next));
      return next;
    });
  }, []);

  const setAllergens = useCallback((allergens) => {
    setUserAllergens(allergens);
    localStorage.setItem('userAllergens', JSON.stringify(allergens));
  }, []);

  const value = useMemo(() => ({
    // State
    selectedLocation,
    userAllergens,
    pollenData,
    showAllPollens,
    currentView,
    userName,
    userAvatar,
    // Live (Google Pollen API)
    livePollen,
    pollenLoading,
    pollenError,
    // Hava durumu + hava kalitesi (Open-Meteo)
    weather,
    aqi,
    envLoading,
    refreshLivePollen: () => fetchLivePollenFor(selectedLocation.lat, selectedLocation.lng),
    // Actions
    updateLocation,
    updateLocationFromCoords,
    goHome,
    toggleAllergen,
    setAllergens,
    setShowAllPollens,
    setCurrentView,
    setUserName,
    setUserAvatar,
    // Static
    allergenOptions: ALLERGEN_OPTIONS,
    locations: LOCATIONS,
  }), [selectedLocation, userAllergens, pollenData, showAllPollens, currentView,
       userName, userAvatar,
       livePollen, pollenLoading, pollenError,
       weather, aqi, envLoading,
       fetchLivePollenFor,
       updateLocation, updateLocationFromCoords, goHome,
       toggleAllergen, setAllergens,
       setUserName, setUserAvatar]);

  return (
    <PollenContext.Provider value={value}>
      {children}
    </PollenContext.Provider>
  );
}

export function usePollen() {
  const ctx = useContext(PollenContext);
  if (!ctx) throw new Error('usePollen must be used within PollenProvider');
  return ctx;
}
