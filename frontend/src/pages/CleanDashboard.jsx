// ==========================================
// CLEAN DASHBOARD — Hiyerarşik, sakin tasarım
// Hero (%30) → Hava durumu (tek satır) → Saatlik grafik → Katlanmış bölümler
// ==========================================

import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { usePollen } from '../context/PollenContext';
import { POLLEN_TYPES, RISK_LEVELS } from '../data/mockData';
import Chatbot from '../components/dashboard/Chatbot';
import MapSelector from '../components/dashboard/MapSelector';
import DashboardProfilePage from '../components/dashboard/DashboardProfilePage';
import ThemeToggle from '../components/dashboard/ThemeToggle';
import AccountMenu from '../components/membership/AccountMenu';

// ─── HELPER: µg/m³ → yoğunluk etiketi ──────────────────────────────
function getIntensityLevel(value) {
  if (value <= 0) return { label: '—', color: '#8a9487' };
  if (value < 20) return { label: 'Az', color: '#6f9659' };
  if (value <= 50) return { label: 'Orta', color: '#c9a14a' };
  return { label: 'Çok', color: '#c4664f' };
}

// ─── MEVSİMSEL İPUCU ────────────────────────────────────────────────
function getSeasonalTip() {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) {
    return {
      text: 'İlkbahar aylarında ağaç polenleri yoğundur. Sabah erken ve akşam geç saatlerde dışarı çıkmak polen maruziyetini azaltabilir.',
      period: 'Mart – Mayıs dönemi',
      emoji: '🌸',
    };
  }
  if (month >= 5 && month <= 7) {
    return {
      text: 'Yaz aylarında çimen polenleri zirve yapar. Çim biçilen alanlara yaklaşmaktan kaçının.',
      period: 'Haziran – Ağustos dönemi',
      emoji: '☀️',
    };
  }
  if (month >= 8 && month <= 10) {
    return {
      text: 'Sonbahar, yabani ot polenleri dönemidir. Rüzgârlı günlerde maruziyetiniz artar.',
      period: 'Eylül – Kasım dönemi',
      emoji: '🍂',
    };
  }
  return {
    text: 'Kış aylarında polen seviyeleri genellikle düşüktür. İlkbahara hazırlık için antihistaminik stokunuzu kontrol edin.',
    period: 'Aralık – Şubat dönemi',
    emoji: '❄️',
  };
}

// ─── TOOLTIP (grafik) ────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="clean-tooltip">
      <p className="clean-tooltip-hour">🕐 {label}</p>
      <div className="clean-tooltip-items">
        {payload.map((entry, i) => {
          const lvl = getIntensityLevel(entry.value);
          return (
            <div key={i} className="clean-tooltip-item">
              <span className="clean-tooltip-dot" style={{ background: entry.color }} />
              <span className="clean-tooltip-name">{entry.name}</span>
              <span className="clean-tooltip-val">{entry.value} <small>µg/m³</small></span>
              <span className="clean-tooltip-badge" style={{ color: lvl.color, background: `${lvl.color}18` }}>
                {lvl.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── HERO SKELETON ──────────────────────────────────────────────────
function HeroSkeleton() {
  // Üç çizgili sade skeleton — abartılı blok yok, daha az dikkat çekiyor.
  return (
    <section className="clean-hero-skeleton" aria-label="Yükleniyor" aria-busy="true">
      <div className="space-y-3">
        <div className="skeleton skeleton-line" style={{ width: '32%', height: 11 }} />
        <div className="skeleton" style={{ width: '58%', height: 44, borderRadius: 8 }} />
        <div className="skeleton skeleton-line" style={{ width: '78%', height: 14, marginTop: 12 }} />
        <div className="skeleton skeleton-line" style={{ width: '52%', height: 14 }} />
      </div>
    </section>
  );
}

// ─── COLLAPSIBLE BÖLÜM ──────────────────────────────────────────────
function CollapsibleSection({ title, icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="clean-collapsible">
      <button
        className="clean-collapsible-header"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="clean-collapsible-icon">{icon}</span>
        <span className="clean-collapsible-title">{title}</span>
        <svg
          className={`clean-collapsible-chevron ${isOpen ? 'open' : ''}`}
          width="16" height="16" viewBox="0 0 16 16" fill="none"
        >
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen && (
        <div className="clean-collapsible-body animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}


// =====================================================================
// ANA DASHBOARD BİLEŞENİ
// =====================================================================
export default function CleanDashboard() {
  const {
    selectedLocation, pollenData, userAllergens, locations,
    updateLocation, goHome, showAllPollens, setShowAllPollens,
    currentView, setCurrentView,
  } = usePollen();

  // Mevcut saatlik veri
  const hourlyData = pollenData.hourly;
  const alerts = pollenData.alerts;
  const forecast = pollenData.forecast;

  // En riskli polen türünü bul
  const highestRiskType = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return null;
    // Her türün günlük toplam değerini hesapla
    const typeTotals = POLLEN_TYPES.map(type => {
      const total = hourlyData.reduce((sum, hour) => sum + (hour[type.key] || 0), 0);
      return { ...type, total };
    });
    // Sadece takip edilenler arasından en yüksek toplama sahip olanı seç
    const tracked = typeTotals.filter(t => userAllergens.includes(t.key));
    if (tracked.length > 0) {
      return tracked.sort((a, b) => b.total - a.total)[0];
    }
    // Takip edilen yoksa en yüksek toplama sahip olanı seç
    return typeTotals.sort((a, b) => b.total - a.total)[0];
  }, [hourlyData, userAllergens]);

  // Legend toggle: varsayılan sadece en riskli tür
  const [visibleTypes, setVisibleTypes] = useState(null); // null = sadece en riskli

  const activeTypes = useMemo(() => {
    if (showAllPollens) return POLLEN_TYPES;
    if (visibleTypes) return POLLEN_TYPES.filter(t => visibleTypes.includes(t.key));
    return highestRiskType ? [highestRiskType] : [];
  }, [showAllPollens, visibleTypes, highestRiskType]);

  function togglePollenType(key) {
    setVisibleTypes(prev => {
      const current = prev || (highestRiskType ? [highestRiskType.key] : []);
      if (current.includes(key)) {
        const next = current.filter(k => k !== key);
        return next.length > 0 ? next : null; // en az 1 tane kalsın
      }
      return [...current, key];
    });
    // Tümünü Göster modunu kapat
    if (showAllPollens) setShowAllPollens(false);
  }

  // Tarih
  const today = new Date();
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const dateStr = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

  const seasonalTip = getSeasonalTip();

  // ── Profil sayfası görünümü ──
  if (currentView === 'profile') {
    return (
      <div className="clean-shell">
        <header className="clean-header" role="banner">
          <div className="clean-header-inner">
            <button
              type="button"
              className="clean-header-brand"
              onClick={goHome}
              title="Ana sayfaya dön"
              aria-label="Ana sayfaya dön"
              style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}
            >
              <div className="clean-header-logo">🌿</div>
              <h1 className="clean-header-title">alerji takip</h1>
            </button>
            <div className="clean-header-right">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="clean-main" style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 700 }}>
            <DashboardProfilePage onClose={() => setCurrentView('dashboard')} />
          </div>
        </main>
      </div>
    );
  }

  // Aksiyon cümlesi
  function getActionSentence() {
    if (!alerts) return 'Veriler yükleniyor…';
    const risk = alerts.overallRisk;
    if (risk === 'high') return 'Bugün dışarı çıkmaktan kaçının ve maske kullanın.';
    if (risk === 'medium') return 'Dikkatli olun, maske kullanmayı düşünün.';
    return 'Bugün rahat olabilirsiniz, risk düşük.';
  }

  // Risk rengi
  const riskInfo = alerts?.riskInfo || RISK_LEVELS.low;
  const riskLabel = alerts?.overallRisk === 'high' ? 'Yüksek'
                  : alerts?.overallRisk === 'medium' ? 'Orta' : 'Düşük';

  return (
    <div className="clean-shell">
      {/* ═══════════ HEADER ═══════════ */}
      <header className="clean-header" role="banner">
        <div className="clean-header-inner">
          <button
            type="button"
            className="clean-header-brand"
            onClick={goHome}
            title="Ana sayfaya dön"
            aria-label="Ana sayfaya dön"
            style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}
          >
            <div className="clean-header-logo">🌿</div>
            <h1 className="clean-header-title">alerji takip</h1>
          </button>
          <div className="clean-header-right">
            {/* Şehir seçici (minimal dropdown) */}
            <CityDropdown
              locations={locations}
              selected={selectedLocation}
              onSelect={updateLocation}
            />
            <span className="clean-header-date">{dateStr}</span>
            <ThemeToggle />
            <AccountMenu />
          </div>
        </div>
      </header>

      <main className="clean-main">
        {/* ═══════════ HERO ZONE ═══════════ */}
        {!alerts ? <HeroSkeleton /> : (
        <section className="clean-hero" aria-label="Bugünkü risk durumu" style={{ '--risk-color': riskInfo.color }}>
          {/* Risk başlığı — büyük, sade tipografi. Emoji ve gradient yok. */}
          <div className="clean-hero-top">
            <div>
              <div
                className="text-[11px] font-medium uppercase tracking-[0.18em] mb-2"
                style={{ color: 'var(--text-muted)' }}
              >
                {selectedLocation.name} · Bugün
              </div>
              <div
                className="text-[44px] sm:text-[52px] font-light leading-none tracking-tight"
                style={{ color: riskInfo.color }}
              >
                {riskLabel} risk
              </div>
            </div>
            <p
              className="clean-hero-action mt-4 text-[15px] leading-relaxed max-w-[44ch]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {getActionSentence()}
            </p>
          </div>

          {/* Polen türleri inline (nötr renk ailesi) */}
          {alerts?.alerts && alerts.alerts.length > 0 && (
            <div className="clean-hero-pollens">
              {alerts.alerts.map(a => {
                const lvl = a.level;
                const lvlColor = lvl === 'high' ? 'var(--risk-high)' : lvl === 'medium' ? 'var(--risk-medium)' : 'var(--risk-low)';
                return (
                  <div key={a.key} className="clean-hero-pollen-item">
                    <span className="clean-hero-pollen-icon">{a.icon}</span>
                    <div className="clean-hero-pollen-info">
                      <span className="clean-hero-pollen-name">{a.name}</span>
                      <span className="clean-hero-pollen-value">{a.peakValue} µg/m³</span>
                    </div>
                    <span className="clean-hero-pollen-level" style={{ color: lvlColor, background: `${lvlColor}1F` }}>
                      {lvl === 'high' ? 'Yüksek' : lvl === 'medium' ? 'Orta' : 'Düşük'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Alerjen seçilmemiş uyarısı */}
          {(!alerts?.alerts || alerts.alerts.length === 0) && (
            <div className="clean-hero-no-allergens">
              <span>🔔</span>
              <p>Kişisel risk uyarıları için profilinizden alerjenlerinizi seçin.</p>
            </div>
          )}

          {/* 5 günlük tahmin — minimal dot strip */}
          {forecast && forecast.length > 0 && (
            <div className="clean-hero-forecast" role="list" aria-label="5 günlük tahmin">
              {forecast.map((day, i) => (
                <div key={i} className="clean-hero-forecast-day" role="listitem" title={`${day.dayName}: ${day.risk === 'low' ? 'Düşük' : day.risk === 'medium' ? 'Orta' : 'Yüksek'}`}>
                  <span className="clean-hero-forecast-label">{day.dayName}</span>
                  <span className="clean-hero-forecast-dot" style={{ background: day.riskInfo.color, boxShadow: `0 0 8px ${day.riskInfo.color}40` }} />
                </div>
              ))}
            </div>
          )}

          {/* Tavsiyeler */}
          {alerts?.advice && alerts.advice.length > 0 && (
            <div className="clean-hero-advice">
              {alerts.advice.map((a, i) => (
                <div key={i} className="clean-hero-advice-item">
                  <span className="clean-hero-advice-num" style={{ background: `${riskInfo.color}1F`, color: riskInfo.color }}>
                    {i + 1}
                  </span>
                  <span>{a}</span>
                </div>
              ))}
            </div>
          )}
        </section>
        )}

        {/* ═══════════ HAVA DURUMU — TEK SATIR ═══════════ */}
        {/* (Hava durumu şeridi kaldırıldı — uydurma veriydi.
            Açık hava verisi gerektiğinde Open-Meteo /weather endpoint'i bağlanacak.) */}

        {/* ═══════════ SAATLİK GRAFİK ═══════════ */}
        <section className="clean-chart-section" aria-label="24 saatlik polen yoğunluğu">
          <div className="clean-chart-header">
            <div>
              <h2 className="clean-chart-title">24 Saatlik Polen Yoğunluğu</h2>
              <p className="clean-chart-subtitle">
                {showAllPollens
                  ? `Tüm ${POLLEN_TYPES.length} tür`
                  : activeTypes.length === 1
                    ? `${activeTypes[0].icon} ${activeTypes[0].name} (en riskli)`
                    : `${activeTypes.length} tür`
                } • µg/m³
              </p>
            </div>
            <button
              className={`clean-chart-toggle ${showAllPollens ? 'active' : ''}`}
              onClick={() => {
                setShowAllPollens(!showAllPollens);
                if (!showAllPollens) setVisibleTypes(null);
              }}
            >
              {showAllPollens ? '✓ Tümü' : 'Tümünü Göster'}
            </button>
          </div>

          {/* Legend — tıklanabilir */}
          <div className="clean-chart-legend">
            {POLLEN_TYPES.map(type => {
              const isActive = activeTypes.some(t => t.key === type.key);
              return (
                <button
                  key={type.key}
                  className={`clean-chart-legend-item ${isActive ? 'active' : ''}`}
                  onClick={() => togglePollenType(type.key)}
                  aria-pressed={isActive}
                >
                  <span className="clean-chart-legend-dot" style={{ background: isActive ? type.color : '#c7b89d' }} />
                  <span>{type.icon} {type.name}</span>
                </button>
              );
            })}
          </div>

          {/* Grafik */}
          {hourlyData && hourlyData.length > 0 ? (
            <div className="clean-chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    {activeTypes.map(type => (
                      <linearGradient key={type.key} id={`clean-grad-${type.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={type.color} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={type.color} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(74,58,34,0.06)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: '#8a9487', fontSize: 11 }} tickLine={false}
                         axisLine={{ stroke: 'rgba(74,58,34,0.08)' }} interval={2} dy={8} />
                  <YAxis tick={{ fill: '#8a9487', fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(111,150,89,0.25)', strokeWidth: 1 }} />
                  {activeTypes.map(type => (
                    <Area
                      key={type.key}
                      type="monotone"
                      dataKey={type.key}
                      name={`${type.icon} ${type.name}`}
                      stroke={type.color}
                      strokeWidth={2.25}
                      fill={`url(#clean-grad-${type.key})`}
                      dot={false}
                      activeDot={{ r: 4, fill: type.color, stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : hourlyData === null || hourlyData === undefined ? (
            <div className="skeleton skeleton-chart" />
          ) : (
            <div className="clean-chart-empty">
              <span>📊</span>
              <span>Saatlik veri bulunamadı</span>
              <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>
                Farklı bir konum seçmeyi deneyin
              </span>
            </div>
          )}
        </section>

        {/* ═══════════ KATLANMIŞ BÖLÜMLER ═══════════ */}
        <CollapsibleSection title="Mevsimsel Bağlam İpucu" icon={seasonalTip.emoji} defaultOpen={false}>
          <div className="clean-seasonal">
            <p className="clean-seasonal-text">{seasonalTip.text}</p>
            <span className="clean-seasonal-period">📆 {seasonalTip.period}</span>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Harita" icon="🗺️" defaultOpen={false}>
          <div className="clean-map-wrapper">
            <MapSelector isWrapped />
          </div>
        </CollapsibleSection>
      </main>

      {/* ═══════════ CHATBOT FAB ═══════════ */}
      <Chatbot />
    </div>
  );
}


// ─── ŞEHİR DROPDOWN (header inline) ────────────────────────────────
function CityDropdown({ locations, selected, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? locations.filter(l => l.name.toLowerCase().includes(query.toLowerCase()))
    : locations;

  return (
    <div className="clean-city-dropdown-wrapper" onBlur={(e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setIsOpen(false);
    }}>
      <button
        className="clean-city-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>📍</span>
        <span>{selected.name}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d={isOpen ? "M3 7.5L6 4.5L9 7.5" : "M3 4.5L6 7.5L9 4.5"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen && (
        <div className="clean-city-panel" role="listbox">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Şehir ara…"
            className="clean-city-search"
            autoFocus
          />
          <div className="clean-city-list">
            {filtered.map(loc => (
              <button
                key={loc.key}
                role="option"
                aria-selected={selected.key === loc.key}
                className={`clean-city-option ${selected.key === loc.key ? 'selected' : ''}`}
                onClick={() => { onSelect(loc); setIsOpen(false); setQuery(''); }}
              >
                📍 {loc.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="clean-city-empty">Sonuç bulunamadı</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
