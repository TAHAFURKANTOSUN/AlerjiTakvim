import { usePollen } from '../../context/PollenContext';

export default function ForecastPanel({ isWrapped }) {
  const { pollenData } = usePollen();
  const forecast = pollenData.forecast;
  if (!forecast || forecast.length === 0) return null;

  const content = (
    <div className="px-5 pb-5">
      <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide
                      lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
        {forecast.map((day, i) => (
          <div key={i}
               className="flex-shrink-0 w-[72px] lg:w-auto snap-center flex flex-col items-center gap-2
                          p-3 rounded-xl cursor-pointer transition-all duration-200
                          bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]
                          hover:bg-[rgba(255,255,255,0.06)] hover:border-[var(--glass-border-hover)] hover:scale-[1.03]">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              {day.dayName}
            </span>
            <span className="text-base font-extrabold text-[var(--text-primary)] leading-none">{day.date}</span>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-base transition-transform duration-200 hover:scale-110"
                 style={{ background: day.riskInfo.bg, border: `2px solid ${day.riskInfo.border}`, boxShadow: `0 0 12px ${day.riskInfo.color}20` }}>
              {day.riskInfo.emoji}
            </div>
            <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ color: day.riskInfo.color, background: `${day.riskInfo.color}15` }}>
              {day.risk === 'low' ? 'Düşük' : day.risk === 'medium' ? 'Orta' : 'Yüksek'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  if (isWrapped) return content;

  return (
    <div className="glass-card p-5 lg:p-6 animate-fade-in-up delay-3">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-[rgba(59,130,246,0.12)] flex items-center justify-center text-sm">
          📊
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          5 günlük tahmin
        </h3>
      </div>
      {content}
    </div>
  );
}
