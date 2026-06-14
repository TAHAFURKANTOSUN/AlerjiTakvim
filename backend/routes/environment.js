// ============================================================
// ENVIRONMENT ROUTE  ->  /api/environment
//   GET /?lat=&lng=   weather + AQI in one call (parallel)
// Uses Open-Meteo (free, no API key). optionalAuth + quota.
// ============================================================

const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { enforceQuota } = require('../middleware/quota');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getWeather } = require('../tools/weather');
const { getAirQuality } = require('../tools/airQuality');

const router = express.Router();

router.get('/', optionalAuth, enforceQuota('pollen'), asyncHandler(async (req, res) => {
    const { lat, lng } = req.query;

    if (!lat || !lng) throw ApiError.badRequest('lat ve lng parametreleri gerekli');

    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) {
        throw ApiError.badRequest('Gecersiz koordinat');
    }

    // Her iki API paralel -- birinin hata vermesi digerini bloklamaz
    const [weatherResult, aqiResult] = await Promise.allSettled([
        getWeather({ lat: numLat, lng: numLng }),
        getAirQuality({ lat: numLat, lng: numLng }),
    ]);

    const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
    const aqi     = aqiResult.status     === 'fulfilled' ? aqiResult.value     : null;

    if (weatherResult.status === 'rejected') {
        console.warn('[Env] Weather fetch failed:', weatherResult.reason?.message);
    }
    if (aqiResult.status === 'rejected') {
        console.warn('[Env] AQI fetch failed:', aqiResult.reason?.message);
    }

    // Her iki servis de basarisiz olduysa 502
    if (!weather && !aqi) {
        throw new ApiError(502, 'Cevre verileri alinamadi');
    }

    res.json({ weather, aqi });
}));

module.exports = router;
