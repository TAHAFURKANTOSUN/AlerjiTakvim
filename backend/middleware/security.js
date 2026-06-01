// ============================================================
// GÜVENLİK MIDDLEWARE'LERİ
//   • helmet         → güvenli HTTP header'ları
//   • cors           → origin beyaz listesi (config.corsOrigins)
//   • rate-limit     → genel + auth'a özel sıkı limit (brute-force)
// Tümü config/env üzerinden yapılandırılır.
// ============================================================

const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('../config/env');

// ── Helmet ──
// Bu bir JSON API'si (HTML servis etmez); CSP'ye gerek yok ama diğer
// koruyucu header'lar açık. CORP'u 'cross-origin' yapıyoruz ki farklı
// origin'deki frontend yanıtları tüketebilsin.
function securityHeaders() {
    return helmet({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    });
}

// ── CORS ──
// corsOrigins boşsa: her origin'e izin (dev kolaylığı, prod'da config/env uyarır).
// Doluysa: yalnızca listedeki origin'ler + origin'siz istekler (curl, mobil, SSR).
function corsMiddleware() {
    const allow = config.corsOrigins;

    if (allow.length === 0) {
        return cors(); // origin: * (yansıtmalı)
    }

    return cors({
        origin(origin, callback) {
            if (!origin || allow.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error(`CORS engellendi: ${origin}`));
        },
        credentials: true,
    });
}

// ── Rate limiting ──
const quotaMessage = {
    error: 'Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.',
    code: 'RATE_LIMITED',
};

// Tüm /api trafiği için genel limit.
const generalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,  // RateLimit-* header'ları
    legacyHeaders: false,
    message: quotaMessage,
});

// Auth uçları (login/register) için daha sıkı — kaba kuvvet saldırısına karşı.
const authLimiter = rateLimit({
    windowMs: config.authRateLimit.windowMs,
    max: config.authRateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Çok fazla giriş/kayıt denemesi. Lütfen biraz sonra tekrar deneyin.',
        code: 'RATE_LIMITED',
    },
});

module.exports = { securityHeaders, corsMiddleware, generalLimiter, authLimiter };
