// ============================================================
// CHATBOT PROXY  →  /api/chat
// optionalAuth + kota('chat'). Asıl orkestrasyon services/chat.js'te;
// route yalnızca istek doğrular ve servisi çağırır (ince controller).
// ============================================================

const express = require('express');

const { optionalAuth } = require('../middleware/auth');
const { enforceQuota } = require('../middleware/quota');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { generateChatReply } = require('../services/chat');

const router = express.Router();

router.post('/', optionalAuth, enforceQuota('chat'), asyncHandler(async (req, res) => {
    const { message, locationName, lat, lng, userAllergens, history } = req.body;

    if (!message || typeof message !== 'string') {
        throw ApiError.badRequest('Mesaj gerekli');
    }

    const result = await generateChatReply({ message, locationName, lat, lng, userAllergens, history });
    res.json(result);
}));

module.exports = router;
