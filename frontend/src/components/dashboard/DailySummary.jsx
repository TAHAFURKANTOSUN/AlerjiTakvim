import { usePollen } from '../../context/PollenContext';
import { POLLEN_TYPES } from '../../data/mockData';

export default function DailySummary({ isWrapped }) {
  const { pollenData, userAllergens } = usePollen();
  const { alerts } = pollenData;

  if (!alerts) return null;
  const { overallRisk, riskInfo, alerts: allergenAlerts, advice } = alerts;
  const hasAllergens = userAllergens.length > 0;

  const content = (
    <div className="px-5 pb-5" style={{ background: riskInfo.bg }}>
      {!hasAllergens ? (
        /* No allergens selected prompt */
        <div className="py-6 text-center">
          <span className="text-3xl block mb-3">🔔</span>
          <p className="text-sm text-[var(--text-secondary)] mb-2">
            Kişisel uyarılar almak için profilinizden alerjenlerinizi seçin.
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            Sağ üstteki "Profil" butonuna tıklayın
          </p>
        </div>
      ) : (
        <>
          {/* Overall risk badge */}
          <div className="flex items-center gap-4 py-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                 style={{ background: `${riskInfo.color}18` }}>
              {riskInfo.emoji}
            </div>
            <div>
              <div className="text-xl font-extrabold leading-tight" style={{ color: riskInfo.color }}>
                {riskInfo.label}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5 font-medium">
                Seçtiğiniz alerjenlere göre
              </div>
            </div>
          </div>

          {/* Individual allergen alerts */}
          {allergenAlerts.length > 0 && (
            <div className="space-y-2 mb-4">
              {allergenAlerts.map((alert) => (
                <div key={alert.key}
                     className="flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200"
                     style={{ background: `${alert.riskInfo.color}10`, border: `1px solid ${alert.riskInfo.color}20` }}>
                  <span className="text-base">{alert.icon}</span>
                  <span className="text-xs font-semibold text-[var(--text-primary)] flex-1">
                    {alert.name}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color: alert.riskInfo.color, background: `${alert.riskInfo.color}20` }}>
                    {alert.level === 'high' ? 'Yüksek' : alert.level === 'medium' ? 'Orta' : 'Düşük'}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] tabular-nums w-14 text-right">
                    {alert.peakValue} µg/m³
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-[var(--glass-border)] mb-3" />

          {/* Advice */}
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2.5 flex items-center gap-1.5">
            <span>💡</span> Kişisel Tavsiyeler
          </p>
          <div className="space-y-2">
            {advice.map((a, i) => (
              <div key={i} className="flex items-start gap-3 text-[13px] text-[var(--text-secondary)] leading-relaxed">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                      style={{ background: `${riskInfo.color}20`, color: riskInfo.color }}>
                  {i + 1}
                </span>
                <span>{a}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  if (isWrapped) return content;

  return (
    <div className="glass-card overflow-hidden animate-fade-in-up delay-2">
      <div className="p-5 pb-0">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
               style={{ background: `${riskInfo.color}20` }}>
            📋
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            günlük özet ve tavsiye
          </h3>
        </div>
      </div>
      {content}
    </div>
  );
}
