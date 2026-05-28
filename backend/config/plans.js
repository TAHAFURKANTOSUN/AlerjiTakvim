// ============================================================
// Üyelik planları ve kota limitleri
// Tüm sayılar .env üzerinden override edilebilir. limit === null → sınırsız.
// Kotalar GÜNLÜK sıfırlanır.
// ============================================================

function int(v, def) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : def;
}

const PLANS = {
    // Giriş yapmamış misafir — küçük deneme hakkı (IP bazlı takip)
    anon: {
        key: 'anon',
        label: 'Misafir',
        limits: {
            pollen: int(process.env.ANON_POLLEN_DAILY, 3),
            chat: int(process.env.ANON_CHAT_DAILY, 3),
        },
    },
    // Ücretsiz üye
    free: {
        key: 'free',
        label: 'Ücretsiz',
        limits: {
            pollen: int(process.env.FREE_POLLEN_DAILY, 10),
            chat: int(process.env.FREE_CHAT_DAILY, 5),
        },
    },
    // Premium üye — sınırsız
    premium: {
        key: 'premium',
        label: 'Premium',
        limits: {
            pollen: null,
            chat: null,
        },
    },
};

const PREMIUM = {
    price: parseFloat(process.env.PREMIUM_PRICE || '49.99'),
    currency: process.env.PREMIUM_CURRENCY || 'TRY',
    days: int(process.env.PREMIUM_DAYS, 30),
};

// 'simulate' → gerçek para hareketi yok (varsayılan).
// 'iyzico'   → gerçek iyzico entegrasyonu (anahtarlar .env'de gerekir).
const PAYMENT_MODE = (process.env.PAYMENT_MODE || 'simulate').toLowerCase();

function getPlan(key) {
    return PLANS[key] || PLANS.free;
}

module.exports = { PLANS, PREMIUM, PAYMENT_MODE, getPlan };
