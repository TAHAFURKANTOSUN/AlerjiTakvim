// ============================================================
// Kimlik doğrulama middleware'leri + token üretimi
// ============================================================

const jwt = require('jsonwebtoken');

function getSecret() {
    return process.env.JWT_SECRET || 'fallback-secret-key';
}

// 7 günlük JWT üretir. plan token'a bilgi amaçlı gömülür;
// kota kontrolünde her zaman DB'deki güncel plan esas alınır.
function signToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name, plan: user.plan || 'free' },
        getSecret(),
        { expiresIn: '7d' }
    );
}

// Zorunlu auth — geçerli token yoksa 401.
function authMiddleware(req, res, next) {
    const h = req.headers.authorization;
    if (!h || !h.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Yetkilendirme gerekli' });
    }
    try {
        req.user = jwt.verify(h.split(' ')[1], getSecret());
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
        try { req.user = jwt.verify(h.split(' ')[1], getSecret()); } catch { /* misafir devam */ }
    }
    next();
}

module.exports = { authMiddleware, optionalAuth, signToken, getSecret };
