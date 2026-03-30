import { POLLEN_TYPE_NAMES_TR, POLLEN_TYPE_ICONS, UPI_LEVEL_NAMES, UPI_COLORS, UPI_BG_COLORS, MONTHS_TR, translateCategory, getMaxLevel, PLANT_ICONS } from '../utils/constants';

export default function PollenResults({ dayInfo, cityName, regionCode }) {
    if (!dayInfo) return null;
    const maxLevel = getMaxLevel(dayInfo);
    const today = new Date();

    return (
        <div className="results-section">
            {/* Today Overview */}
            <div className="today-overview">
                <div className="overview-header">
                    <h3>📊 Bugünün Özeti</h3>
                    <span className="overview-date">
                        {today.getDate()} {MONTHS_TR[today.getMonth()]} {today.getFullYear()}
                    </span>
                </div>
                <div className="overview-level-badge" style={{ background: UPI_BG_COLORS[maxLevel] }}>
                    <span className={`badge-dot dot-${maxLevel}`}></span>
                    <span style={{ color: UPI_COLORS[maxLevel], fontWeight: 700, fontSize: 16 }}>
                        {UPI_LEVEL_NAMES[maxLevel]}
                    </span>
                </div>
            </div>

            {/* Pollen Types */}
            <div className="pollen-types-section">
                <h3>🌱 Polen Türleri</h3>
                <div className="pollen-types-grid">
                    {dayInfo.pollenTypeInfo?.length ? dayInfo.pollenTypeInfo.map((type, i) => {
                        const code = type.code || '';
                        const name = POLLEN_TYPE_NAMES_TR[code] || type.displayName || code;
                        const icon = POLLEN_TYPE_ICONS[code] || '🌱';
                        const lvl = type.indexInfo?.value ?? 0;
                        const cat = translateCategory(type.indexInfo?.category);
                        const inSeason = type.inSeason !== false;
                        return (
                            <div key={i} className={`pollen-type-card${inSeason ? '' : ' not-in-season'}`}>
                                <span className="pollen-type-icon">{icon}</span>
                                <div className="pollen-type-name">{name}</div>
                                <span className={`pollen-type-level upi-${lvl}`}>{cat}</span>
                                {!inSeason && <div className="pollen-type-season">Mevsim dışı</div>}
                            </div>
                        );
                    }) : (
                        <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>
                            Veri yok.
                        </p>
                    )}
                </div>
            </div>

            {/* Plants */}
            {dayInfo.plantInfo?.length > 0 && (
                <div className="plants-section">
                    <h3>🌺 Bitki Detayları</h3>
                    <div className="plants-list">
                        {[...dayInfo.plantInfo]
                            .sort((a, b) => {
                                if (a.inSeason && !b.inSeason) return -1;
                                if (!a.inSeason && b.inSeason) return 1;
                                return (b.indexInfo?.value ?? 0) - (a.indexInfo?.value ?? 0);
                            })
                            .map((p, i) => {
                                const code = p.code || '';
                                const name = p.displayName || code;
                                const icon = PLANT_ICONS[code] || '🌱';
                                const lvl = p.indexInfo?.value ?? 0;
                                const cat = translateCategory(p.indexInfo?.category);
                                const inS = p.inSeason !== false;
                                return (
                                    <div key={i} className={`plant-item${inS ? '' : ' not-in-season'}`}>
                                        <div className="plant-item-left">
                                            <span className="plant-emoji">{icon}</span>
                                            <div>
                                                <div className="plant-name">{name}</div>
                                                <div className="plant-season-tag">{inS ? '✅ Mevsimde' : '❌ Mevsim dışı'}</div>
                                            </div>
                                        </div>
                                        <span className={`plant-level-badge upi-${lvl}`}>
                                            <span className="plant-level-value">{lvl}</span>{cat}
                                        </span>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Health Recommendations */}
            {(() => {
                const recs = [];
                if (dayInfo.pollenTypeInfo) {
                    for (const t of dayInfo.pollenTypeInfo) {
                        if (t.healthRecommendations) recs.push(...t.healthRecommendations);
                    }
                }
                const unique = [...new Set(recs)];
                if (unique.length === 0) return null;
                return (
                    <div className="health-section">
                        <h3>💡 Sağlık Önerileri</h3>
                        <div className="health-list">
                            {unique.map((r, i) => (
                                <div key={i} className="health-item">
                                    <span className="health-bullet"></span>
                                    <span>{r}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
