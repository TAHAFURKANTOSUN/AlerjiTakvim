// ============================================================
// ENV CARDS -- Polen · Hava Kalitesi · Hava Durumu
// Minimalist 3-kart serit. Semantik renkler, genis whitespace.
// ============================================================

// AQI renk skalasi (Avrupa HKI)
function aqiColor(aqi) {
  if (aqi === null || aqi === undefined) return '#8a9487';
  if (aqi <= 20) return '#4caf6e';
  if (aqi <= 40) return '#8bc34a';
  if (aqi <= 60) return '#ffc107';
  if (aqi <= 80) return '#ff7043';
  if (aqi <= 100) return '#e53935';
  return '#7b1fa2';
}

function aqiLabel(aqi) {
  if (aqi === null || aqi === undefined) return '—';
  if (aqi <= 20) return 'Çok iyi';
  if (aqi <= 40) return 'İyi';
  if (aqi <= 60) return 'Orta';
  if (aqi <= 80) return 'Kötü';
  if (aqi <= 100) return 'Çok kötü';
  return 'Tehlikeli';
}

// Polen riski rengi
function pollenRiskColor(risk) {
  if (risk === 'high')   return 'var(--risk-high,   #c4664f)';
  if (risk === 'medium') return 'var(--risk-medium, #c9a14a)';
  return                        'var(--risk-low,    #6f9659)';
}

function pollenRiskLabel(risk) {
  if (risk === 'high')   return 'Yüksek';
  if (risk === 'medium') return 'Orta';
  return 'Düşük';
}

// Kart iskeleti (yukleniyor)
function CardSkeleton({ label, icon }) {
  return (
    <div className="env-card">
      <div className="env-card-label">{icon} {label}</div>
      <div className="skeleton" style={{ height: 36, width: '55%', borderRadius: 6, marginTop: 8 }} />
      <div className="skeleton skeleton-line" style={{ width: '70%', marginTop: 10 }} />
    </div>
  );
}

// Polen karti
function PollenCard({ alerts, loading }) {
  if (loading || !alerts) return <CardSkeleton label="Polen" icon="🌿" />;
  const color = pollenRiskColor(alerts.overallRisk);
  const label = pollenRiskLabel(alerts.overallRisk);
  const topAllergen = alerts.alerts?.[0];

  return (
    <div className="env-card">
      <div className="env-card-label">🌿 Polen</div>
      <div className="env-card-value" style={{ color }}>{label} risk</div>
      {topAllergen && (
        <div className="env-card-sub">
          {topAllergen.icon} {topAllergen.name} — {topAllergen.peakValue} µg/m³
        </div>
      )}
      {!topAllergen && (
        <div className="env-card-sub" style={{ opacity: 0.55 }}>Seçili alerjen yok</div>
      )}
    </div>
  );
}

// AQI karti
function AqiCard({ aqi, loading }) {
  if (loading) return <CardSkeleton label="Hava Kalitesi" icon="💨" />;
  if (!aqi?.data) {
    return (
      <div className="env-card">
        <div className="env-card-label">💨 Hava Kalitesi</div>
        <div className="env-card-value" style={{ color: '#8a9487' }}>—</div>
        <div className="env-card-sub" style={{ opacity: 0.5 }}>Veri alınamadı</div>
      </div>
    );
  }
  const { europeanAqi, pm25, pm10 } = aqi.data;
  const color = aqiColor(europeanAqi);
  const label = aqiLabel(europeanAqi);

  return (
    <div className="env-card">
      <div className="env-card-label">💨 Hava Kalitesi</div>
      <div className="env-card-value" style={{ color }}>
        {europeanAqi !== null ? europeanAqi : '—'}
        <span className="env-card-unit"> AQI</span>
      </div>
      <div className="env-card-badge" style={{ color, background: `${color}18` }}>{label}</div>
      <div className="env-card-sub">
        {pm25 !== null && <>PM2.5: {pm25.toFixed(1)}</>}
        {pm25 !== null && pm10 !== null && ' · '}
        {pm10 !== null && <>PM10: {pm10.toFixed(1)}</>}
      </div>
    </div>
  );
}

// Hava durumu karti
function WeatherCard({ weather, loading }) {
  if (loading) return <CardSkeleton label="Hava Durumu" icon="🌤️" />;
  if (!weather?.data) {
    return (
      <div className="env-card">
        <div className="env-card-label">🌤️ Hava Durumu</div>
        <div className="env-card-value" style={{ color: '#8a9487' }}>—</div>
        <div className="env-card-sub" style={{ opacity: 0.5 }}>Veri alınamadı</div>
      </div>
    );
  }
  const { temperature, feelsLike, humidity, windSpeed, windLabel, condition } = weather.data;

  return (
    <div className="env-card">
      <div className="env-card-label">🌤️ Hava Durumu</div>
      <div className="env-card-value" style={{ color: 'var(--text-primary)' }}>
        {temperature}°C
        <span className="env-card-unit" style={{ fontSize: '0.75em', opacity: 0.65 }}>
          {' '}hissedilen {feelsLike}°C
        </span>
      </div>
      <div className="env-card-sub">{condition}</div>
      <div className="env-card-sub">
        💧 %{humidity} · 🌬️ {windSpeed} km/s ({windLabel})
      </div>
    </div>
  );
}

// ── ANA BILESen ─────────────────────────────────────────────
export default function EnvCards({ alerts, pollenLoading, weather, aqi, envLoading }) {
  return (
    <section className="env-cards-strip" aria-label="Çevre özeti">
      <PollenCard alerts={alerts} loading={pollenLoading} />
      <AqiCard    aqi={aqi}       loading={envLoading} />
      <WeatherCard weather={weather} loading={envLoading} />
    </section>
  );
}
