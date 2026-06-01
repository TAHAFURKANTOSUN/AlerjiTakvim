// ============================================================
// Kota middleware'i — /api/pollen ve /api/chat için günlük limit.
// optionalAuth'tan SONRA kullanılır:
//   router.get('/', optionalAuth, enforceQuota('pollen'), handler)
// ============================================================

const usageService = require('../services/usage');
const { getPlan } = require('../config/plans');
const { getClientIp, resolveSubjectAndPlan } = require('../utils/billing');

// resource: 'pollen' | 'chat'
function enforceQuota(resource) {
    return async function quotaMiddleware(req, res, next) {
        try {
            const { subject, planKey } = await resolveSubjectAndPlan(req);

            const plan = getPlan(planKey);
            const limit = plan.limits[resource]; // null = sınırsız
            const result = await usageService.consume(subject, resource, limit);

            // Frontend rozetleri için header'lar
            res.set('X-Quota-Plan', planKey);
            res.set('X-Quota-Limit', limit === null ? 'unlimited' : String(limit));
            res.set('X-Quota-Used', String(result.used));

            if (!result.allowed) {
                return res.status(429).json({
                    error: planKey === 'anon'
                        ? 'Günlük misafir hakkınız doldu. Devam etmek için ücretsiz kayıt olun.'
                        : 'Bugünkü ücretsiz hakkınız doldu. Sınırsız kullanım için Premium\'a geçebilirsiniz.',
                    code: 'QUOTA_EXCEEDED',
                    resource,
                    plan: planKey,
                    limit,
                    used: result.used,
                    resetsAt: usageService.nextResetISO(),
                    // Misafir → kayıt öner; ücretsiz üye → premium öner.
                    action: planKey === 'anon' ? 'register' : 'upgrade',
                });
            }

            req.quota = { resource, plan: planKey, limit, used: result.used, remaining: result.remaining };
            next();
        } catch (err) {
            // DB erişilemezse isteği tıkama — hizmeti kapatmak yerine geçici
            // olarak izin ver (graceful degradation). Sorun loglanır.
            console.error('[Quota] kontrol hatası (isteğe izin verildi):', err.message);
            next();
        }
    };
}

// getClientIp geriye dönük uyumluluk için yeniden dışa aktarılır
// (artık asıl tanım utils/billing.js içinde).
module.exports = { enforceQuota, getClientIp };
