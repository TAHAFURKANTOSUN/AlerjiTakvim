// ============================================================
// AIR QUALITY TOOL -- Open-Meteo Air Quality API
// Free API, no key required. Returns structured AQI data
// and a short Turkish text summary for the chat prompt.
// European AQI scale used (0-500).
// ============================================================

const https = require('https');

// European AQI bands
function aqiBand(aqi) {
    if (aqi === null || aqi === undefined) return { label: 'Veri yok', color: '#8a9487', level: 'unknown' };
    if (aqi <= 20)  return { label: 'Cok iyi',  color: '#4caf6e', level: 'good' };
    if (aqi <= 40)  return { label: 'Iyi',      color: '#8bc34a', level: 'fair' };
    if (aqi <= 60)  return { label: 'Orta',     color: '#ffc107', level: 'moderate' };
    if (aqi <= 80)  return { label: 'Kotu',     color: '#ff7043', level: 'poor' };
    if (aqi <= 100) return { label: 'Cok kotu', color: '#e53935', level: 'very_poor' };
    return             { label: 'Tehlikeli',    color: '#7b1fa2', level: 'hazardous' };
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 7000 }, (res) => {
            let raw = '';
            res.on('data', (c) => { raw += c; });
            res.on('end', () => {
                try { resolve(JSON.parse(raw)); }
                catch (e) { reject(new Error('AQI JSON parse error: ' + e.message)); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('AQI request timeout')); });
    });
}

/**
 * Fetches current air quality from Open-Meteo.
 * @returns {{ data: object, summary: string }}
 */
async function getAirQuality({ lat, lng }) {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality` +
        `?latitude=${lat}&longitude=${lng}` +
        `&current=pm10,pm2_5,european_aqi,us_aqi,dust,uv_index` +
        `&timezone=auto`;

    const json = await fetchJson(url);
    const c = json.current;
    if (!c) throw new Error('Unexpected Open-Meteo AQI response');

    const europeanAqi = c.european_aqi ?? null;
    const band = aqiBand(europeanAqi);

    const data = {
        europeanAqi,
        usAqi:       c.us_aqi       ?? null,
        pm25:        c.pm2_5        ?? null,
        pm10:        c.pm10         ?? null,
        dust:        c.dust         ?? null,
        uvIndex:     c.uv_index     ?? null,
        band,
    };

    const pm25str = data.pm25  !== null ? `PM2.5: ${data.pm25.toFixed(1)} ug/m3` : '';
    const pm10str = data.pm10  !== null ? `PM10: ${data.pm10.toFixed(1)} ug/m3`  : '';
    const aqiStr  = europeanAqi !== null ? `Avrupa HKI: ${europeanAqi} (${band.label})` : 'HKI verisi yok';
    const uvStr   = data.uvIndex !== null ? `UV endeksi: ${data.uvIndex.toFixed(1)}` : '';

    const summary = [aqiStr, pm25str, pm10str, uvStr].filter(Boolean).join(', ');

    return { data, summary };
}

module.exports = { getAirQuality };
