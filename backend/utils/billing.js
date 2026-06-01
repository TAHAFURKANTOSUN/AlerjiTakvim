// ============================================================
// Kota/plan çözümleme yardımcıları.
// ------------------------------------------------------------
// Aynı "subject + plan" hesabı hem quota middleware'inde hem de
// /api/usage route'unda tekrar ediyordu. Tek kaynağa toplandı (DRY).
//   • Üye (geçerli token + DB'de mevcut) → subject `user:<id>`, DB planı
//     (premium süresi dolduysa lazy downgrade ile 'free').
//   • Aksi halde (misafir / silinmiş kullanıcı) → `ip:<ip>`, plan 'anon'.
// ============================================================

const users = require('../services/users');

// İstemcinin gerçek IP'sini al. Reverse-proxy (Nginx) arkasındaki
// kurulumlarda X-Forwarded-For başlığının ilk değeri kullanılır.
// Not: app, trust-proxy ayarıyla çalıştığından req.ip de güvenilirdir.
function getClientIp(req) {
    const xff = req.headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();
    return req.ip || req.socket?.remoteAddress || 'unknown';
}

async function resolveSubjectAndPlan(req) {
    if (req.user && req.user.id) {
        const u = await users.findById(req.user.id);
        if (u) {
            const norm = users.normalizePlan(u);
            return {
                subject: `user:${u.id}`,
                planKey: norm.plan,                       // 'free' | 'premium'
                planExpiresAt: norm.plan_expires_at || null,
            };
        }
    }
    // Misafir veya token geçerli ama kullanıcı silinmiş.
    return { subject: `ip:${getClientIp(req)}`, planKey: 'anon', planExpiresAt: null };
}

module.exports = { getClientIp, resolveSubjectAndPlan };
