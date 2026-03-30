import { DAYS_TR, MONTHS_TR, UPI_LEVEL_NAMES, UPI_COLORS, getMaxLevel } from '../utils/constants';

export default function ForecastCards({ dailyInfo, onDaySelect }) {
    if (!dailyInfo?.length) return null;
    
    return (
        <div className="forecast-section">
            <h3>📅 5 Günlük Tahmin</h3>
            <div className="forecast-cards">
                {dailyInfo.map((day, i) => {
                    if (!day.date) return null;
                    const jsDate = new Date(day.date.year, day.date.month - 1, day.date.day);
                    const dayName = DAYS_TR[jsDate.getDay()];
                    const maxLvl = getMaxLevel(day);
                    return (
                        <div
                            key={i}
                            className={`forecast-card${i === 0 ? ' active' : ''}`}
                            onClick={(e) => {
                                document.querySelectorAll('.forecast-card').forEach(x => x.classList.remove('active'));
                                e.currentTarget.classList.add('active');
                                if (onDaySelect) onDaySelect(day);
                            }}
                        >
                            <span className="forecast-card-day">{dayName}</span>
                            <span className="forecast-card-date">{day.date.day}</span>
                            <span className={`forecast-card-dot dot-${maxLvl}`}></span>
                            <span className="forecast-card-level" style={{ color: UPI_COLORS[maxLvl] }}>
                                {UPI_LEVEL_NAMES[maxLvl]}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
