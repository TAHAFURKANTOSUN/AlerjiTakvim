// ============================================================
// MERKEZİ ORTAM (ENV) YAPILANDIRMASI + DOĞRULAMA
// ------------------------------------------------------------
// Tüm process.env okumaları TEK yerden geçer. Böylece:
//   • Eksik/yanlış değerler sunucu açılırken yakalanır (fail-fast).
//   • Güvenlik açısından kritik değerler (JWT_SECRET) prod'da zorunlu olur.
//   • Diğer modüller process.env yerine bu nesneyi import eder (test edilebilir).
// ============================================================

const path = require('path');
const crypto = require('crypto');

// .env'yi her zaman backend kökünden yükle (cwd ne olursa olsun).
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

// ── Yardımcılar ──
function int(value, fallback) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
}

function list(value) {
    return String(value || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

// ── JWT secret (güvenlik açısından kritik) ──
// Eski kod: process.env.JWT_SECRET || 'fallback-secret-key'  → tahmin edilebilir
// sır, herkes token üretebilirdi. Artık prod'da ZORUNLU.
function resolveJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (secret && secret.length >= 16) return secret;

    if (isProd) {
        // Üretimde sessizce devam etmek tehlikeli — açılışı durdur.
        throw new Error(
            '[env] JWT_SECRET tanımlı değil veya çok kısa (min 16 karakter). ' +
            'Üretimde zorunludur. backend/.env dosyasına güçlü bir değer ekleyin.'
        );
    }

    // Geliştirmede: her açılışta rastgele üret (kalıcı değil — restart'ta
    // mevcut token'lar geçersiz olur, dev için sorun değil) + uyar.
    console.warn(
        '[env] ⚠️  JWT_SECRET tanımlı değil. Geliştirme için geçici rastgele ' +
        'bir sır üretildi (her restart\'ta değişir). Üretimde MUTLAKA .env\'de tanımlayın.'
    );
    return crypto.randomBytes(48).toString('hex');
}

const config = {
    nodeEnv: NODE_ENV,
    isProd,
    port: int(process.env.PORT, 3001),

    jwtSecret: resolveJwtSecret(),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

    // CORS: izinli origin listesi (virgülle ayrılmış).
    // Boş ise: dev'de her origin'e izin verilir; prod'da uyarı verilir.
    corsOrigins: list(process.env.CORS_ORIGINS),

    // Reverse-proxy (Nginx) arkasında kaç hop var? IP bazlı kota güvenliği
    // için önemli — 'true' (hepsine güven) X-Forwarded-For sahteciliğine açıktır.
    // Varsayılan 1 (tek Nginx). Kendi kurulumunuza göre ayarlayın.
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY, 1),

    // İstek gövdesi boyut limiti (büyük payload DoS'una karşı).
    jsonBodyLimit: process.env.JSON_BODY_LIMIT || '1mb',

    // Genel rate-limit (tüm /api için): pencere + maksimum istek.
    rateLimit: {
        windowMs: int(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000), // 15 dk
        max: int(process.env.RATE_LIMIT_MAX, 300),                       // IP başına
    },
    // Auth uçları için daha sıkı limit (brute-force'a karşı).
    authRateLimit: {
        windowMs: int(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
        max: int(process.env.AUTH_RATE_LIMIT_MAX, 20),
    },
};

function parseTrustProxy(raw, fallback) {
    if (raw === undefined || raw === '') return fallback;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
}

// Prod'da güvenlik açısından zayıf yapılandırmaları görünür kıl.
if (isProd && config.corsOrigins.length === 0) {
    console.warn(
        '[env] ⚠️  CORS_ORIGINS boş — API tüm origin\'lere açık. ' +
        'Üretimde frontend alan adınızı CORS_ORIGINS olarak tanımlayın.'
    );
}

module.exports = config;
