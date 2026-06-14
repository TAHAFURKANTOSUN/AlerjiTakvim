// ==========================================
// ALERJİ TAKİP BACKEND — Express UYGULAMA FABRİKASI
// ------------------------------------------------------------
// Bu dosya yalnızca Express app'ini KURAR ve dışa verir; sunucuyu
// BAŞLATMAZ. Dinleme/diagnostik/graceful-shutdown → server.js.
// Bu ayrım (app vs. server) test edilebilirliği ve okunabilirliği artırır.
//
// Akış:  güvenlik → gövde ayrıştırma → sağlık → kota'lı route'lar → 404 → hata
// ==========================================

const express = require('express');

const config = require('./config/env');
const db = require('./db/pool');
const { securityHeaders, corsMiddleware, generalLimiter } = require('./middleware/security');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Route modülleri
const authRouter = require('./routes/auth');
const usageRouter = require('./routes/usage');
const membershipRouter = require('./routes/membership');
const pollenRouter = require('./routes/pollen');
const environmentRouter = require('./routes/environment');
const chatRouter = require('./routes/chat');

const app = express();

// ── Temel ayarlar ──
// Nginx/proxy arkasında gerçek istemci IP'sini al (misafir kota + rate-limit).
// 'true' yerine hop sayısı (varsayılan 1) — X-Forwarded-For sahteciliğine karşı.
app.set('trust proxy', config.trustProxy);
app.disable('x-powered-by');

// ── Güvenlik & gövde ayrıştırma ──
app.use(securityHeaders());
app.use(corsMiddleware());
app.use(express.json({ limit: config.jsonBodyLimit }));

// ==========================================
// KÖK & SAĞLIK KONTROLÜ (rate-limit'ten muaf — LB/health-check için)
// Bu bir API sunucusudur; web arayüzünü SERVE ETMEZ.
// ==========================================
app.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'Alerji Takip API',
        hint: '(:Bu bir API sunucusudur:) ',
    });
});

app.get('/api/health', async (_req, res) => {
    let database = false;
    try { await db.ping(); database = true; } catch { /* DB kapalı/erişilemez */ }
    res.status(database ? 200 : 503).json({ status: 'ok', database });
});

// ==========================================
// API ROUTE'LARI  (genel rate-limit ardından)
//   /api/register · /login · /me · /profile · /favorites · /account   → auth
//   /api/usage · /api/membership/* · /api/pollen · /api/chat
// ==========================================
app.use('/api', generalLimiter);

app.use('/api', authRouter);
app.use('/api/usage', usageRouter);
app.use('/api/membership', membershipRouter);
app.use('/api/pollen', pollenRouter);
app.use('/api/environment', environmentRouter);
app.use('/api/chat', chatRouter);

// ── 404 + merkezi hata yönetimi (EN SONDA) ──
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
