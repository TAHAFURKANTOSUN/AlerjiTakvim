// ============================================================
// WEATHER TOOL -- Open-Meteo current weather
// Free API, no key required. Returns a structured object
// and a short Turkish text summary for the chat prompt.
// ============================================================

const https = require('https');

// WMO weather code -> Turkish label
const WMO_LABELS = {
    0: 'Açık',
    1: 'Çoğunlukla açık', 2: 'Parçalı bulutlu', 3: 'Bulutlu',
    45: 'Sisli', 48: 'Buzlanma sisi',
    51: 'Hafif çisenti', 53: 'Orta çisenti', 55: 'Yoğun çisenti',
    61: 'Hafif yağmur', 63: 'Orta yağmur', 65: 'Şiddetli yağmur',
    71: 'Hafif kar', 73: 'Orta kar', 75: 'Yoğun kar',
    80: 'Hafif sağanak', 81: 'Orta sağanak', 82: 'Şiddetli sağanak',
    95: 'Fırtına', 96: 'Dolu fırtınası', 99: 'Ağır dolu fırtınası',
};

function windLabel(kmh) {
    if (kmh < 5)  return 'Durgun';
    if (kmh < 20) return 'Hafif rüzgar';
    if (kmh < 40) return 'Orta rüzgar';
    if (kmh < 60) return 'Kuvvetli rüzgar';
    return 'Fırtınamsı';
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 7000 }, (res) => {
            let raw = '';
            res.on('data', (c) => { raw += c; });
            res.on('end', () => {
                try { resolve(JSON.parse(raw)); }
                catch (e) { reject(new Error('Weather JSON parse error: ' + e.message)); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Weather request timeout')); });
    });
}

/**
 * Fetches current weather from Open-Meteo.
 * @returns {{ data: object, summary: string }}
 */
async function getWeather({ lat, lng }) {
    const url = `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation` +
        `&timezone=auto`;

    const json = await fetchJson(url);
    const c = json.current;
    if (!c) throw new Error('Unexpected Open-Meteo weather response');

    const data = {
        temperature:    Math.round(c.temperature_2m ?? 0),
        feelsLike:      Math.round(c.apparent_temperature ?? 0),
        humidity:       Math.round(c.relative_humidity_2m ?? 0),
        windSpeed:      Math.round(c.wind_speed_10m ?? 0),
        precipitation:  c.precipitation ?? 0,
        weatherCode:    c.weather_code ?? 0,
        condition:      WMO_LABELS[c.weather_code] || 'Bilinmiyor',
        windLabel:      windLabel(c.wind_speed_10m ?? 0),
    };

    const summary =
        `Sicaklik: ${data.temperature}°C (hissedilen ${data.feelsLike}°C), ` +
        `Nem: %${data.humidity}, ` +
        `Ruzgar: ${data.windSpeed} km/s (${data.windLabel}), ` +
        `Durum: ${data.condition}` +
        (data.precipitation > 0 ? `, Yagis: ${data.precipitation} mm` : '');

    return { data, summary };
}

module.exports = { getWeather };
