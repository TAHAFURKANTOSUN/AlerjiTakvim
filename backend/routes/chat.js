// ============================================================
// CHATBOT PROXY  ->  /api/chat
// optionalAuth + kota('chat'). Asil orkestrasyon services/chat.js'te;
// route yalnizca istek dogrular ve servisi cagirin (ince controller).
// ============================================================

const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { enforceQuota } = require('../middleware/quota');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { generateChatReply } = require('../services/chat');

const router = express.Router();

// Sunucu tarafi girdi sinirlari (DoS / token maliyeti korumasi)
const MESSAGE_MAX_LEN      = 2000;
const LOCATION_MAX_LEN     = 120;
const HISTORY_MAX_TURNS    = 10;
const HISTORY_TEXT_MAX_LEN = 2000;
const ALLERGENS_MAX        = 30;
const ALLERGEN_MAX_LEN     = 60;
const CLIENT_ENV_MAX_LEN   = 500; // weather/aqi summary max

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : undefined);

function sanitizeHistory(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .slice(-HISTORY_MAX_TURNS)
        .filter((m) => m && typeof m.text === 'string')
        .map((m) => ({
            from: m.from === 'user' ? 'user' : 'bot',
            text: m.text.slice(0, HISTORY_TEXT_MAX_LEN),
        }));
}

function sanitizeAllergens(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((a) => typeof a === 'string' && a.trim())
        .slice(0, ALLERGENS_MAX)
        .map((a) => a.slice(0, ALLERGEN_MAX_LEN));
}

function sanitizeClientText(raw, max) {
    if (typeof raw !== 'string' || !raw.trim()) return null;
    let cleaned = '';
    for (const ch of raw) {
        const code = ch.codePointAt(0);
        if (ch === '\n' || (code >= 32 && code !== 127)) cleaned += ch;
    }
    return cleaned.replace(/\s+/g, ' ').trim().slice(0, max) || null;
}

router.post('/', optionalAuth, enforceQuota('chat'), asyncHandler(async (req, res) => {
    const {
        message, locationName, lat, lng,
        userAllergens, history, clientPollen,
        clientWeather, clientAqi,
    } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
        throw ApiError.badRequest('Mesaj gerekli');
    }

    const result = await generateChatReply({
        message:      message.slice(0, MESSAGE_MAX_LEN),
        locationName: str(locationName, LOCATION_MAX_LEN),
        lat,
        lng,
        userAllergens: sanitizeAllergens(userAllergens),
        history:       sanitizeHistory(history),
        clientPollen:  sanitizeClientText(clientPollen, 2000),
        clientWeather: sanitizeClientText(clientWeather, CLIENT_ENV_MAX_LEN),
        clientAqi:     sanitizeClientText(clientAqi,     CLIENT_ENV_MAX_LEN),
    });
    res.json(result);
}));

module.exports = router;
