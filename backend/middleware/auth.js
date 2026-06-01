// ============================================================
// Kimlik doğrulama middleware'leri + token üretimi
// JWT sırrı artık config/env üzerinden gelir (prod'da zorunlu;
// eski 'fallback-secret-key' güvenlik açığı kaldırıldı).
// ============================================================

const jwt = require('jsonwebtoken');
const config = require('../config/env');

// 7 günlük JWT üretir. plan token'a bilgi amaçlı gömülür;
// kota kontrolünde her zaman DB'deki güncel plan esas alınır.
function signToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name, plan: user.plan || 'free' },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );
}

// Zorunlu auth — geçerli token yoksa 401.
function authMiddleware(req, res, next) {
    const h = req.headers.authorization;
    if (!h || !h.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Yetkilendirme gerekli' });
    }
    try {
        req.user = jwt.verify(h.split(' ')[1], config.jwtSecret);
        next();
    } catch {
        return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
    }
}

// İsteğe bağlı auth — token varsa req.user'ı doldurur, yoksa engellemez.
// Misafir (anonim) kullanım akışları için kullanılır.
function optionalAuth(req, _res, next) {
    const h = req.headers.authorization;
    if (h && h.startsWith('Bearer ')) {
        try { req.user = jwt.verify(h.split(' ')[1], config.jwtSecret); } catch { /* misafir devam */ }
    }
    next();
}

// getSecret geriye dönük uyumluluk için korunur (artık config'ten gelir).
module.exports = { authMiddleware, optionalAuth, signToken, getSecret: () => config.jwtSecret };
