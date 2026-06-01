// ============================================================
// POLLEN API PROXY  →  /api/pollen
//   GET /         polen verisi (optionalAuth + kota; Google→Open-Meteo)
//   GET /status   anahtar yöneticisi durumu (auth — maskeli bilgi sızmasın)
// API anahtarları her zaman sunucu tarafında kalır.
// ============================================================

const express = require('express');

const { optionalAuth, authMiddleware } = require('../middleware/auth');
const { enforceQuota } = require('../middleware/quota');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getPollenData } = require('../tools/pollen');
const { getKeyManagerStatus } = require('../tools/pollenProviders/google');

const router = express.Router();

// Anahtar durumu (debug/monitoring) — top-level require ile (eskiden
// handler içinde require ediliyordu).
router.get('/status', authMiddleware, (req, res) => {
    res.json(getKeyManagerStatus());
});

// Polen verisi
router.get('/', optionalAuth, enforceQuota('pollen'), asyncHandler(async (req, res) => {
    const { lat, lng, days = 5 } = req.query;

    if (!lat || !lng) {
        throw ApiError.badRequest('lat ve lng parametreleri gerekli');
    }

    let data;
    try {
        // Orchestrator: Google → başarısızsa otomatik Open-Meteo
        data = await getPollenData({
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            days: parseInt(days, 10) || 1,
        });
    } catch (err) {
        // Tüm sağlayıcılar başarısız → yukarı akış (upstream) hatası: 502.
        console.error('Pollen proxy error:', err.message);
        throw new ApiError(502, 'Polen verileri alınamadı (tüm sağlayıcılar başarısız)');
    }

    // Hangi sağlayıcıdan geldiğini header'a koy (debug + frontend dileğine göre)
    res.set('X-Pollen-Source', data._source || 'unknown');
    res.json(data);
}));

module.exports = router;
