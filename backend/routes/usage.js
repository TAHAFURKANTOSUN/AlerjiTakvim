// ============================================================
// KULLANIM / KOTA DURUMU  →  /api/usage
// optionalAuth: üye ise plan + kotası, değilse misafir (IP) kotası döner.
// ============================================================

const express = require('express');

const usageService = require('../services/usage');
const { getPlan } = require('../config/plans');
const { optionalAuth } = require('../middleware/auth');
const { resolveSubjectAndPlan } = require('../utils/billing');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', optionalAuth, asyncHandler(async (req, res) => {
    const { subject, planKey, planExpiresAt } = await resolveSubjectAndPlan(req);

    const plan = getPlan(planKey);
    const counts = await usageService.getCounts(subject);

    const fmt = (resource, used) => {
        const limit = plan.limits[resource];
        return { used, limit, remaining: limit === null ? null : Math.max(0, limit - used) };
    };

    res.json({
        plan: planKey,
        planExpiresAt,
        resetsAt: usageService.nextResetISO(),
        usage: {
            pollen: fmt('pollen', counts.pollen_count),
            chat: fmt('chat', counts.chat_count),
        },
    });
}));

module.exports = router;
