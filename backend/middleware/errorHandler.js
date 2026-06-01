// ============================================================
// GLOBAL HATA YÖNETİMİ (404 + merkezi error handler)
// ------------------------------------------------------------
// Tüm route'lardaki tekrar eden try/catch'in yerini alır. Route'lar
// artık ya `throw new ApiError(...)` der ya da asyncHandler sayesinde
// reddedilen promise'i buraya bırakır. Yanıt biçimi tek noktadan
// belirlenir → tutarlı { error, code } gövdesi (frontend toast'ları için).
// ============================================================

const config = require('../config/env');
const ApiError = require('../utils/ApiError');

// Eşleşmeyen route → 404 (router zincirinin EN SONUNA konur).
function notFoundHandler(req, res, _next) {
    res.status(404).json({
        error: `Bulunamadı: ${req.method} ${req.originalUrl}`,
        code: 'NOT_FOUND',
    });
}

// Merkezi hata işleyici (4 argümanlı imza → Express bunu error handler sayar).
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    // Yanıt zaten başladıysa Express'in varsayılan işleyicisine devret.
    if (res.headersSent) return next(err);

    // CORS reddi (cors middleware'i Error fırlatır) → 403.
    const isCorsError = typeof err?.message === 'string' && err.message.startsWith('CORS');

    let statusCode = err.statusCode || err.status || (isCorsError ? 403 : 500);
    if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
        statusCode = 500;
    }

    const isOperational = err instanceof ApiError || isCorsError || statusCode < 500;

    // Beklenmeyen (programatik) hatalar her zaman tam loglanır.
    if (!isOperational) {
        console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
    } else if (statusCode >= 500) {
        console.error(`[error] ${req.method} ${req.originalUrl}:`, err.message);
    }

    // Üretimde 500 detayını sızdırma — eski davranışla aynı genel mesaj.
    const message = isOperational
        ? err.message
        : (config.isProd ? 'Sunucu hatası' : err.message);

    const body = { error: message || 'Sunucu hatası' };
    if (err.code) body.code = err.code;
    if (err.details && typeof err.details === 'object') Object.assign(body, err.details);

    res.status(statusCode).json(body);
}

module.exports = { notFoundHandler, errorHandler };
