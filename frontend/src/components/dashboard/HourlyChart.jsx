import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { POLLEN_TYPES } from '../../data/mockData';
import { usePollen } from '../../context/PollenContext';

// µg/m³ scaling thresholds
function getIntensityLevel(value) {
  if (value <= 0) return { label: '—', color: '#64748b' };
  if (value < 20) return { label: 'Az', color: '#22c55e' };
  if (value <= 50) return { label: 'Orta', color: '#eab308' };
  return { label: 'Çok', color: '#ef4444' };
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  const totalLevel = getIntensityLevel(total);

  return (
    <div className="bg-[rgba(17,21,40,0.97)] border border-[var(--glass-border)] rounded-xl p-4
                    backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] min-w-[200px]">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[rgba(255,255,255,0.06)]">
        <p className="text-sm font-bold text-[var(--text-primary)]">🕐 {label}</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-[var(--text-muted)] bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded-full">
            {total.toFixed(1)} µg/m³
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ color: totalLevel.color, background: `${totalLevel.color}20` }}>
            {totalLevel.label}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {payload.map((entry, i) => {
          const level = getIntensityLevel(entry.value);
          return (
            <div key={i} className="flex items-center gap-2.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color, boxShadow: `0 0 6px ${entry.color}40` }} />
              <span className="text-[var(--text-secondary)] flex-1">{entry.name}</span>
              <span className="font-bold text-[var(--text-primary)] tabular-nums">
                {entry.value} <span className="text-[var(--text-muted)] font-normal text-[10px]">µg/m³</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ color: level.color, background: `${level.color}15` }}>
                {level.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function HourlyChart() {
  const { pollenData, userAllergens, showAllPollens, setShowAllPollens } = usePollen();
  const data = pollenData.hourly;
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-6 lg:p-8 animate-fade-in-up flex flex-col">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">
          saatlik polen yoğunluğu ve türleri
        </h3>
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] text-sm gap-3 min-h-[300px]">
          <span className="text-4xl opacity-30">📊</span>
          <span>Konum seçerek verileri görüntüleyin</span>
        </div>
      </div>
    );
  }

  const trackedCount = userAllergens.length;
  const allCount = POLLEN_TYPES.length;

  return (
    <div className="glass-card p-5 lg:p-7 animate-fade-in-up flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setIsCollapsed(prev => !prev)}>
          <div className="w-8 h-8 rounded-lg bg-[rgba(139,92,246,0.12)] flex items-center justify-center text-base">📈</div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">
              Saatlik Polen Yoğunluğu
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {showAllPollens ? `Tüm ${allCount} tür` : `${trackedCount} takip edilen tür`} • 24 saat
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Show All toggle */}
          <button
            onClick={() => setShowAllPollens(!showAllPollens)}
            className={`text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg border transition-all duration-200
              ${showAllPollens
                ? 'bg-[var(--accent-violet)] text-white border-[var(--accent-violet)] shadow-md shadow-[rgba(139,92,246,0.3)]'
                : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)] border-[rgba(255,255,255,0.06)] hover:text-[var(--text-secondary)]'
              }`}
          >
            {showAllPollens ? '✓ Tümü' : 'Tümünü Göster'}
          </button>
          {/* Collapse toggle */}
          <button
            onClick={() => setIsCollapsed(prev => !prev)}
            className={`minimize-toggle-btn ${isCollapsed ? 'minimized' : ''}`}
            title={isCollapsed ? 'Genişlet' : 'Küçült'}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d={isCollapsed ? "M3 5.5L7 9.5L11 5.5" : "M3 9.5L7 5.5L11 9.5"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span className="text-[10px] text-[var(--text-muted)] bg-[rgba(255,255,255,0.05)] px-3 py-1.5 rounded-full border border-[rgba(255,255,255,0.05)] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-emerald)] animate-pulse" />
            Canlı
          </span>
        </div>
      </div>

      {/* Intensity Legend + Chart — conditionally rendered */}
      {!isCollapsed && (
        <>
          <div className="flex items-center gap-4 mb-4 px-1">
            <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">Yoğunluk:</span>
            {[
              { label: 'Az', color: '#22c55e', range: '<20' },
              { label: 'Orta', color: '#eab308', range: '20-50' },
              { label: 'Çok', color: '#ef4444', range: '>50' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                <span className="text-[10px] font-bold" style={{ color: l.color }}>{l.label}</span>
                <span className="text-[9px] text-[var(--text-muted)]">({l.range} µg/m³)</span>
              </div>
            ))}
          </div>

          <div style={{ width: '100%', height: 360 }}>
            <ResponsiveContainer width="100%" height={360}>
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  {POLLEN_TYPES.map((type) => (
                    <linearGradient key={type.key} id={`gradient-${type.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={type.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={type.color} stopOpacity={0.01} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} tickLine={false}
                       axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} interval={2} dy={8} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} tickLine={false} axisLine={false} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />

                {POLLEN_TYPES.map((type) => {
                  const isTracked = userAllergens.includes(type.key);
                  const isVisible = showAllPollens || isTracked;
                  if (!isVisible) return null;

                  return (
                    <Area
                      key={type.key}
                      type="monotone"
                      dataKey={type.key}
                      name={`${type.icon} ${type.name}`}
                      stroke={isTracked ? type.color : `${type.color}40`}
                      strokeWidth={isTracked ? 2.5 : 1}
                      fill={isTracked ? `url(#gradient-${type.key})` : 'transparent'}
                      strokeDasharray={isTracked ? undefined : '4 4'}
                      dot={false}
                      activeDot={isTracked ? { r: 5, fill: type.color, stroke: '#111528', strokeWidth: 2 } : false}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Collapsed hint */}
      {isCollapsed && (
        <div className="flex items-center justify-center py-6 text-[var(--text-muted)] text-xs gap-2 cursor-pointer
                        hover:text-[var(--text-secondary)] transition-colors duration-200"
             onClick={() => setIsCollapsed(false)}>
          <span>📈</span>
          <span>Grafiği görmek için tıklayın</span>
        </div>
      )}
    </div>
  );
}
