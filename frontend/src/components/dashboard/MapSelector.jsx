import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { usePollen } from '../../context/PollenContext';
import { useTheme } from '../../context/ThemeContext';

// ─────────────────────────────────────────────
// Default marker icon paths (bundler fix)
// ─────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom pin
const customIcon = new L.DivIcon({
  className: 'custom-map-marker',
  html: `<div class="marker-pin"></div>`,
  iconSize: [30, 42],
  iconAnchor: [15, 42],     // tip of pin = exact lat/lng
  popupAnchor: [0, -42],
});

// ─────────────────────────────────────────────
// MAP AUTO-INVALIDATE
// "Tıklama kayması" sorununun KRİTİK çözümü.
// Leaflet, container'ı ilk render'dayken (animasyon sırasında, sekme
// gizliyken vb.) yanlış boyutla cache'liyor → tıklama → piksel/koordinat
// dönüşümü kayık. invalidateSize() çağrılınca cache yenilenir.
//
// 4 farklı tetik:
//   1) Mount sonrası (animation frame)
//   2) ResizeObserver — container boyutu her değiştiğinde
//   3) window resize
//   4) 600 ms safety net — animate-slide-left bittikten sonra
// ─────────────────────────────────────────────
function MapAutoInvalidate() {
  const map = useMap();

  useEffect(() => {
    let raf = 0;
    const invalidate = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    };

    invalidate(); // hemen

    const container = map.getContainer();
    const ro = new ResizeObserver(invalidate);
    ro.observe(container);

    window.addEventListener('resize', invalidate);
    const animationSafetyNet = setTimeout(invalidate, 600);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', invalidate);
      clearTimeout(animationSafetyNet);
    };
  }, [map]);

  return null;
}

// ─────────────────────────────────────────────
// MAP CLICK HANDLER
// e.latlng'den HAM koordinatlar — hiçbir snap/yuvarlama yok.
// Marker non-interactive olduğu için pin üzerine tıklasa bile
// click event'i map'e ulaşır → kayma hissi ortadan kalkar.
// ─────────────────────────────────────────────
function MapClickHandler() {
  const { updateLocationFromCoords } = usePollen();

  useMapEvents({
    click(e) {
      updateLocationFromCoords(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

// Sub-component to fly to selected location
function FlyToLocation({ location }) {
  const map = useMap();
  const prevKeyRef = useRef(null);

  useEffect(() => {
    if (location && prevKeyRef.current !== location.key) {
      map.flyTo([location.lat, location.lng], map.getZoom() < 8 ? 8 : map.getZoom(), {
        duration: 1.0,
      });
      prevKeyRef.current = location.key;
    }
  }, [location, map]);

  return null;
}

// ─────────────────────────────────────────────
// LIVE POLLEN POPUP CONTENT
// Google Pollen API yanıtını okunabilir özete çevirir.
// data.dailyInfo[0].pollenTypeInfo[]  → Ağaç / Çimen / Yabani ot
// data.dailyInfo[0].plantInfo[]       → tek tek bitkiler
// ─────────────────────────────────────────────
function PopupContent({ location, livePollen, pollenLoading, pollenError }) {
  return (
    <div className="min-w-[200px]">
      <div className="text-[13px] font-semibold text-gray-900 tracking-tight leading-tight">
        {location.name}
      </div>
      <div className="mt-3 text-[12px]">
        {pollenLoading && (
          <div className="flex items-center gap-2 text-gray-500">
            <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
            Veri yükleniyor
          </div>
        )}
        {!pollenLoading && pollenError && (
          <div className="text-red-500 leading-relaxed">{pollenError}</div>
        )}
        {!pollenLoading && !pollenError && livePollen && (
          <PollenSummary data={livePollen} />
        )}
        {!pollenLoading && !pollenError && !livePollen && (
          <div className="text-gray-400">Veri yok</div>
        )}
      </div>
    </div>
  );
}

function PollenSummary({ data }) {
  const today = data?.dailyInfo?.[0];
  if (!today) return <div className="text-gray-400">Veri yok</div>;

  const types = today.pollenTypeInfo || [];
  const plants = (today.plantInfo || []).filter(
    (p) => p.inSeason && (p.indexInfo?.value ?? 0) > 0,
  );
  const overall = types.reduce(
    (max, t) => Math.max(max, t.indexInfo?.value ?? 0), 0,
  );

  return (
    <div>
      {/* HERO — genel risk büyük rakamla */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`text-2xl font-light leading-none tabular-nums ${riskColor(overall)}`}>
          {overall}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">
          /5 · {categoryLabel(overall)}
        </span>
      </div>

      {/* Polen tipleri — sıralı, muted */}
      <div className="space-y-1.5 text-[11px]">
        {types.map((t) => (
          <div key={t.code} className="flex justify-between items-center gap-3">
            <span className="text-gray-500">{t.displayName}</span>
            <span className={`tabular-nums font-medium ${riskColor(t.indexInfo?.value)}`}>
              {t.indexInfo?.value ?? 0}
            </span>
          </div>
        ))}
      </div>

      {/* Aktif bitkiler — sadece yoğun olanlar, küçük etiketler */}
      {plants.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5">
          {plants.slice(0, 4).map((p) => (
            <span
              key={p.code}
              className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 tabular-nums"
            >
              {p.displayName} {p.indexInfo.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function riskColor(v = 0) {
  if (v >= 4) return 'text-red-600 font-semibold';
  if (v >= 3) return 'text-orange-500 font-semibold';
  if (v >= 1) return 'text-yellow-600';
  return 'text-green-600';
}
function categoryLabel(v) {
  return ['Yok', 'Çok düşük', 'Düşük', 'Orta', 'Yüksek', 'Çok yüksek'][v] || '—';
}

// ─────────────────────────────────────────────
// ANA BİLEŞEN
// ─────────────────────────────────────────────
export default function MapSelector({ isWrapped }) {
  const {
    selectedLocation,
    livePollen,
    pollenLoading,
    pollenError,
  } = usePollen();
  const { isDark } = useTheme();

  const markerRef = useRef(null);

  // Konum değiştiğinde popup'ı OTOMATİK aç — kullanıcı manuel pin'e tıklamak zorunda kalmasın.
  useEffect(() => {
    const m = markerRef.current;
    if (!m) return;
    // Yeni position'a render olduktan SONRA aç (bir frame bekle)
    const raf = requestAnimationFrame(() => m.openPopup());
    return () => cancelAnimationFrame(raf);
  }, [selectedLocation.lat, selectedLocation.lng]);

  // Tema'ya göre tile URL (CartoDB)
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const content = (
    <>
      <div className="h-[260px] lg:h-[300px] relative">
        <MapContainer
          center={[selectedLocation.lat, selectedLocation.lng]}
          zoom={6}
          scrollWheelZoom={true}
          zoomControl={false}
          attributionControl={false}
          className="w-full h-full"
          style={{ background: 'var(--bg-subtle)' }}
        >
          <TileLayer key={isDark ? 'dark' : 'light'} url={tileUrl} attribution="" />
          <MapAutoInvalidate />
          <MapClickHandler />
          <FlyToLocation location={selectedLocation} />

          <Marker
            ref={markerRef}
            position={[selectedLocation.lat, selectedLocation.lng]}
            icon={customIcon}
            interactive={false}
            keyboard={false}
          >
            <Popup className="custom-popup" closeButton={false} autoPan={false}>
              <PopupContent
                location={selectedLocation}
                livePollen={livePollen}
                pollenLoading={pollenLoading}
                pollenError={pollenError}
              />
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Sade konum şeridi — gradient ikon ve duplicate koordinat yok */}
      <div className="px-5 py-3.5 border-t border-[var(--border-soft)] flex items-baseline justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight truncate leading-tight">
            {selectedLocation.name}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] tabular-nums mt-1 leading-none">
            {selectedLocation.lat.toFixed(2)}°N · {selectedLocation.lng.toFixed(2)}°E
          </div>
        </div>
        <LiveStatusDot
          loading={pollenLoading}
          error={!!pollenError}
          ok={!!livePollen}
        />
      </div>
    </>
  );

  if (isWrapped) return content;

  return (
    <div className="glass-card overflow-hidden animate-slide-left">
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
               style={{ background: 'var(--accent-primary-soft)', border: '1px solid var(--accent-primary-border)' }}>
            🗺️
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            harita üzerinden konum seçme
          </h3>
        </div>
      </div>
      {content}
    </div>
  );
}

// Footer'da minimal durum göstergesi — text + nokta
function LiveStatusDot({ loading, error, ok }) {
  let label, color;
  if (loading)      { label = 'Yükleniyor'; color = 'var(--text-muted)'; }
  else if (error)   { label = 'Hata';       color = 'var(--risk-high)'; }
  else if (ok)      { label = 'Canlı';      color = 'var(--accent-primary)'; }
  else return null;

  return (
    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider"
         style={{ color }}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${loading ? 'animate-pulse' : ''}`}
        style={{ background: color }}
      />
      {label}
    </div>
  );
}
