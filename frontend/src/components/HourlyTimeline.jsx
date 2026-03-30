import { HOURLY_PATTERN, UPI_LEVEL_NAMES, UPI_COLORS, POLLEN_TYPE_NAMES_TR, hexToRGBA } from '../utils/constants';

export default function HourlyTimeline({ dayInfo }) {
    if (!dayInfo) return null;
    let maxUPI = 0;
    const typeColors = [];
    if (dayInfo.pollenTypeInfo) {
        for (const t of dayInfo.pollenTypeInfo) {
            if (t.indexInfo?.value > maxUPI) maxUPI = t.indexInfo.value;
            const v = t.indexInfo?.value ?? 0;
            if (v > 0) typeColors.push({ code: t.code, value: v, name: POLLEN_TYPE_NAMES_TR[t.code] || t.displayName });
        }
    }

    // Peak summary
    const slots = [
        { emoji: '🌅', label: 'Sabah', range: '06:00 – 10:00', hours: [6,7,8,9,10] },
        { emoji: '☀️', label: 'Öğle', range: '11:00 – 15:00', hours: [11,12,13,14,15] },
        { emoji: '🌇', label: 'Akşam', range: '16:00 – 19:00', hours: [16,17,18,19] },
        { emoji: '🌙', label: 'Gece', range: '20:00 – 05:00', hours: [20,21,22,23,0,1,2,3,4,5] }
    ];

    return (
        <>
            <div className="hourly-section">
                <h3>⏰ Saatlik Yoğunluk Dağılımı</h3>
                <p className="hourly-subtitle">Günün saatlerine göre tahmini polen yoğunluğu</p>
                <div className="hourly-timeline">
                    {Array.from({ length: 24 }, (_, h) => {
                        const m = HOURLY_PATTERN[h];
                        const hPct = Math.max(4, m * 100);
                        const cl = Math.min(5, Math.max(0, Math.round(maxUPI * m)));
                        const hourStr = `${String(h).padStart(2, '0')}:00`;
                        return (
                            <div
                                key={h}
                                className="hour-bar"
                                style={{
                                    height: `${hPct}%`,
                                    background: `linear-gradient(to top, ${UPI_COLORS[cl]}, ${hexToRGBA(UPI_COLORS[cl], (0.5 + m * 0.5) * 0.7)})`,
                                    animationDelay: `${h * 30}ms`,
                                    animation: 'barGrow 0.6s cubic-bezier(0.34,1.56,0.64,1) both'
                                }}
                            >
                                <div className="hour-tooltip">
                                    <div className="hour-tooltip-time">{hourStr}</div>
                                    <div className="hour-tooltip-level" style={{ color: UPI_COLORS[cl] }}>
                                        {UPI_LEVEL_NAMES[cl]}
                                    </div>
                                    {typeColors.length > 0 && (
                                        <div style={{ marginTop: 4, fontSize: 10, opacity: 0.7 }}>
                                            {typeColors.map((t, i) => {
                                                const tl = Math.min(5, Math.max(0, Math.round(t.value * m)));
                                                return <div key={i}>{t.name}: {UPI_LEVEL_NAMES[tl]}</div>;
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="time-labels">
                    <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
                </div>
            </div>

            {/* Peak Summary */}
            <div className="peak-summary">
                <h3>🔥 En Yoğun Saatler</h3>
                <div className="peak-cards">
                    {slots.map((s, i) => {
                        let avg = 0;
                        for (const h of s.hours) avg += HOURLY_PATTERN[h];
                        avg /= s.hours.length;
                        const lvl = Math.min(5, Math.max(0, Math.round(maxUPI * avg)));
                        return (
                            <div key={i} className="peak-card">
                                <div className="peak-card-header">
                                    <span className="peak-card-emoji">{s.emoji}</span>
                                    <span className="peak-card-label">{s.label}</span>
                                </div>
                                <div className="peak-card-time">{s.range}</div>
                                <span className={`peak-card-level upi-${lvl}`}>{UPI_LEVEL_NAMES[lvl]}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
