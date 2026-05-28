// ==========================================
// ALERJİ TAKİP BACKEND - Express.js Sunucusu
// Auth + Pollen API Proxy + Groq Chat
// ==========================================

const path = require('path');
// .env'yi her zaman backend klasöründen yükle (cwd fark etmez)
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const Groq = require('groq-sdk');
const groqKeyManager = require('./groqKeyManager');

// ── Üyelik / kota altyapısı (PostgreSQL) ──
const db = require('./db/pool');
const usersService = require('./services/users');
const usageService = require('./services/usage');
const { authMiddleware, optionalAuth, signToken } = require('./middleware/auth');
const { enforceQuota, getClientIp } = require('./middleware/quota');
const { getPlan } = require('./config/plans');
const membershipRouter = require('./routes/membership');

// RAG + Pollen araçları (chat endpoint'i için)
const { retrieveRelevantChunks } = require('../rag/retriever');
const { fetchPollenSummary, getPollenData } = require('./tools/pollen');

const app = express();
const PORT = process.env.PORT || 3001;
const POLLEN_API_KEY = process.env.POLLEN_API_KEY;

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());
// Nginx/proxy arkasında gerçek istemci IP'sini al (misafir kota takibi için)
app.set('trust proxy', true);

// ==========================================
// KÖK & SAĞLIK KONTROLÜ
// Bu bir API sunucusudur; web arayüzünü SERVE ETMEZ.
// Arayüz için frontend ayrı çalışır:  cd frontend && npm run dev
// (Üretimde Nginx '/' için derlenmiş frontend'i, '/api' için bunu sunar.)
// ==========================================
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Alerji Takip API',
        hint: 'Bu bir API sunucusudur. Web arayüzü için frontend klasöründe `npm run dev` çalıştırın.',
    });
});

app.get('/api/health', async (req, res) => {
    let database = false;
    try { await db.ping(); database = true; } catch { /* DB kapalı/erişilemez */ }
    res.status(database ? 200 : 503).json({ status: 'ok', database });
});

// Auth, token üretimi ve kullanıcı saklama artık modüllere taşındı:
//   middleware/auth.js · services/users.js · db/pool.js

// ==========================================
// VALIDASYON
// ==========================================
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateRegister(name, email, password, passwordConfirm) {
    const errors = [];
    
    if (!name || name.trim().length < 2) {
        errors.push('İsim en az 2 karakter olmalıdır');
    }
    if (!email || !validateEmail(email)) {
        errors.push('Geçerli bir e-posta adresi girin');
    }
    if (!password || password.length < 6) {
        errors.push('Şifre en az 6 karakter olmalıdır');
    }
    if (password && !/[a-zA-ZığüşöçİĞÜŞÖÇ]/.test(password)) {
        errors.push('Şifre en az 1 harf içermelidir');
    }
    if (password && !/[0-9]/.test(password)) {
        errors.push('Şifre en az 1 rakam içermelidir');
    }
    if (password !== passwordConfirm) {
        errors.push('Şifreler eşleşmiyor');
    }
    
    return errors;
}

function validateLogin(email, password) {
    const errors = [];
    if (!email || !validateEmail(email)) {
        errors.push('Geçerli bir e-posta adresi girin');
    }
    if (!password || password.length < 6) {
        errors.push('Şifre en az 6 karakter olmalıdır');
    }
    return errors;
}

// ==========================================
// AUTH ENDPOINT'LERİ
// ==========================================

// KAYIT
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, passwordConfirm } = req.body;

        // Validasyon
        const errors = validateRegister(name, email, password, passwordConfirm);
        if (errors.length > 0) {
            return res.status(400).json({ error: errors[0], errors });
        }

        // E-posta kontrol
        const existing = await usersService.findByEmail(email);
        if (existing) {
            return res.status(400).json({ error: 'Bu e-posta adresi zaten kayıtlı' });
        }

        const created = await usersService.createUser({ name, email, password });
        const user = usersService.publicUser(created);
        const token = signToken(user);

        res.status(201).json({ message: 'Kayıt başarılı', token, user });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// GİRİŞ
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validasyon
        const errors = validateLogin(email, password);
        if (errors.length > 0) {
            return res.status(400).json({ error: errors[0], errors });
        }

        const row = await usersService.findByEmail(email);
        if (!row) {
            return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
        }

        const isMatch = await bcrypt.compare(password, row.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
        }

        const user = usersService.publicUser(row);
        const token = signToken(user);

        res.json({ message: 'Giriş başarılı', token, user });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// BEN KİMİM
app.get('/api/me', authMiddleware, async (req, res) => {
    try {
        const row = await usersService.findById(req.user.id);
        if (!row) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        res.json({ user: usersService.publicUser(row) });
    } catch (err) {
        console.error('Me error:', err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// PROFİL GÜNCELLE
app.put('/api/profile', authMiddleware, async (req, res) => {
    try {
        const { name, avatar, allergies } = req.body;
        if (name !== undefined && name.trim().length < 2) {
            return res.status(400).json({ error: 'İsim en az 2 karakter olmalıdır' });
        }
        const updated = await usersService.updateProfile(req.user.id, { name, avatar, allergies });
        if (!updated) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        res.json({ message: 'Profil güncellendi', user: usersService.publicUser(updated) });
    } catch (err) {
        console.error('Profile error:', err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// FAVORİLER GÜNCELLE
app.put('/api/favorites', authMiddleware, async (req, res) => {
    try {
        const updated = await usersService.updateFavorites(req.user.id, req.body.favorites);
        if (!updated) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        res.json({
            message: 'Favoriler güncellendi',
            favorites: usersService.publicUser(updated).favorites,
        });
    } catch (err) {
        console.error('Favorites error:', err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// HESAP SİL
app.delete('/api/account', authMiddleware, async (req, res) => {
    try {
        const { password } = req.body;
        const row = await usersService.findById(req.user.id);
        if (!row) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        // Şifre doğrulama (gönderildiyse)
        if (password) {
            const isMatch = await bcrypt.compare(password, row.password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Şifre hatalı' });
            }
        }
        await usersService.deleteUser(req.user.id);
        res.json({ message: 'Hesap başarıyla silindi' });
    } catch (err) {
        console.error('Delete account error:', err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// ==========================================
// KULLANIM / KOTA DURUMU
// optionalAuth: üye ise plan+kotası, değilse misafir (IP) kotası döner.
// ==========================================
app.get('/api/usage', optionalAuth, async (req, res) => {
    try {
        let subject = null;
        let planKey = 'anon';
        let planExpiresAt = null;

        if (req.user && req.user.id) {
            const u = await usersService.findById(req.user.id);
            if (u) {
                const norm = usersService.normalizePlan(u);
                subject = `user:${u.id}`;
                planKey = norm.plan;
                planExpiresAt = norm.plan_expires_at || null;
            }
        }
        if (!subject) subject = `ip:${getClientIp(req)}`;

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
    } catch (err) {
        console.error('Usage endpoint error:', err.message);
        res.status(500).json({ error: 'Kullanım bilgisi alınamadı' });
    }
});

// ==========================================
// ÜYELİK / ÖDEME  →  /api/membership/*
// ==========================================
app.use('/api/membership', membershipRouter);

// ==========================================
// POLLEN API DURUM (anahtarların durumu — debug/monitoring)
// auth gerekli (anahtar maskelenmiş bilgisi sızmasın)
// ==========================================
app.get('/api/pollen/status', authMiddleware, (req, res) => {
    const { getKeyManagerStatus } = require('./tools/pollenProviders/google');
    res.json(getKeyManagerStatus());
});

// ==========================================
// POLLEN API PROXY
// optionalAuth + enforceQuota('pollen'):
//   • Misafir (girişsiz) günde sınırlı sorgu yapabilir (IP bazlı).
//   • Ücretsiz üye günlük limitli, premium üye sınırsız.
//   • Limit dolunca 429 + { code:'QUOTA_EXCEEDED', action } döner.
//   • API anahtarları yine sunucu tarafında kalır.
// ==========================================
app.get('/api/pollen', optionalAuth, enforceQuota('pollen'), async (req, res) => {
    try {
        const { lat, lng, days = 5 } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ error: 'lat ve lng parametreleri gerekli' });
        }

        // Orchestrator: Google → başarısızsa otomatik Open-Meteo
        const data = await getPollenData({
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            days: parseInt(days, 10) || 1,
        });

        // Hangi sağlayıcıdan geldiğini header'a koy (debug + frontend dileğine göre)
        res.set('X-Pollen-Source', data._source || 'unknown');
        res.json(data);
    } catch (err) {
        console.error('Pollen proxy error:', err.message);
        res.status(502).json({
            error: 'Polen verileri alınamadı (tüm sağlayıcılar başarısız)',
        });
    }
});

// ==========================================
// CHATBOT PROXY — Groq (model-priority fallback)
// İlk model tüm keylerle denenir, bittikçe sıradaki
// modele geçilir.
// ==========================================

// Groq ile sohbet isteği gönder (tek deneme)
async function tryGroqChat(apiKey, model, systemPrompt, messages) {
    const client = new Groq({ apiKey });

    const groqMessages = [
        { role: 'system', content: systemPrompt },
        ...messages,
    ];

    const completion = await client.chat.completions.create({
        model,
        messages: groqMessages,
        temperature: 0.4, // Dil kaymasını önlemek için daha düşük (önceden 0.7 idi)
        max_tokens: 512,
    });

    return completion.choices[0]?.message?.content || '';
}

app.post('/api/chat', optionalAuth, enforceQuota('chat'), async (req, res) => {
    try {
        const { message, locationName, lat, lng, userAllergens, history } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Mesaj gerekli' });
        }

        // ══════════════════════════════════════════════════════════
        // RAG + POLLEN (paralel) — prompt'a enjekte edeceğimiz veri
        // ══════════════════════════════════════════════════════════
        const [ragResult, pollenResult] = await Promise.allSettled([
            retrieveRelevantChunks(message, 3),
            fetchPollenSummary({ lat, lng, locationName }),
        ]);

        const chunks = ragResult.status === 'fulfilled' ? ragResult.value : [];
        const livePollen = pollenResult.status === 'fulfilled' ? pollenResult.value : null;

        if (ragResult.status === 'rejected') {
            console.warn('[Chat] RAG retrieval başarısız:', ragResult.reason?.message);
        }

        // Kaynak bloğu (bilimsel makaleler)
        const contextBlock = chunks.length
            ? `\n\n## 📚 İLGİLİ BİLİMSEL KAYNAKLAR\n` +
              chunks.map((c, i) =>
                  `[${i + 1}] ${c.source} (s.${c.page}) — benzerlik ${c.score.toFixed(2)}\n"${c.text.trim()}"`
              ).join('\n\n')
            : '';

        // Anlık polen bloğu
        const pollenBlock = livePollen
            ? `\n\n## 🌱 ANLIK POLEN VERİLERİ (bugün)\n${livePollen}`
            : '';

        // Sistem promptu oluştur
        const allergenList = (userAllergens || []).join(', ') || 'belirtilmemiş';
        const systemPrompt = `# DİL KURALI (EN ÖNCELİKLİ)
SEN SADECE TÜRKÇE YANIT VEREN BİR ASİSTANSIN.
Kaynakların veya kullanıcı mesajının dili ne olursa olsun, cevabın HER ZAMAN TÜRKÇE olmalı.
İngilizce bir kaynaktan bilgi alırsan, onu önce Türkçe'ye çevir, sonra kullan.
Tek kelime bile İngilizce yazma (bilimsel tür adları hariç: ör. "Olea europaea" kalabilir).

# KİMLİK
Sen bir polen ve alerji asistanısın. Adın "Polen Asistanı".
Kullanıcının bulunduğu konum: ${locationName || 'belirtilmemiş'}
Kullanıcının alerjik olduğu polenler: ${allergenList}

# GÖREV
- Polen ve alerji hakkında bilgilendirici, kısa ve net yanıtlar ver
- Kullanıcının alerjilerine özel tavsiyeler sun
- Mevsimsel polen tahmini hakkında bilgi ver
- Korunma yöntemleri öner
- Yanıtlarını 2-3 cümle ile sınırlı tut, çok uzun yazma
- Emoji kullan, samimi ol
- Tıbbi teşhis koyma, doktora yönlendir
${contextBlock}
${pollenBlock}

# YANIT KURALLARI (KRİTİK — HALLÜSİNASYON YOK)
- "ANLIK POLEN VERİLERİ" bloğu mevcutsa: kullanıcının "bugün maske takmalı mıyım?", "polen durumu nasıl?", "risk yüksek mi?" gibi konum-spesifik tüm soruları SADECE bu blokta yazılı sayılara dayanarak yanıtla. Tahmin yürütme, genelleme yapma, ezbere konuşma.
- Verilen indeks değerlerini somutlaştır:
    0/5 = yok, 1/5 = çok düşük, 2/5 = düşük, 3/5 = orta, 4/5 = yüksek, 5/5 = çok yüksek.
- Maske/ev tavsiyesi verirken: kullanıcının ALERJİK OLDUĞU polenlerin (yukarıda listeli) bugünkü değerine bak; yüksekse maske/iç mekan öner, düşükse rahat olabileceğini söyle.
- "ANLIK POLEN VERİLERİ" bloğu YOKSA (veri alınamadıysa): "Şu anda \${locationName || 'bu konum'} için canlı polen verisi alamıyorum, biraz sonra tekrar deneyebilirsiniz" de — uydurma sayı verme.
- "BİLİMSEL KAYNAKLAR" bloğu varsa: tıbbi/biyolojik genel sorularda öncelikle ona dayandır. İngilizce metinden alıntı yaparken Türkçe'ye çevir; bilgi aldığında (Kaynak [1]) şeklinde referans ver.
- Kaynaklarda VE canlı veride hiç olmayan bir bilgi soruluyorsa: "Bu konuda elimde net veri yok" de — uydurma.
- İlaç ismi önerme, dozaj verme, teşhis koyma. Ciddi belirtilerde doktora yönlendir.

# SON HATIRLATMA
Cevabın TAMAMEN TÜRKÇE olmalı. İngilizce yazmak yasak.`;

        console.log(`[Chat] "${message.slice(0, 60)}..." — RAG: ${chunks.length} kaynak, Pollen: ${livePollen ? 'var' : 'yok'}`);

        // Mesaj geçmişini hazırla (Groq formatı — OpenAI uyumlu)
        const groqHistory = (history || []).map(msg => ({
            role: msg.from === 'user' ? 'user' : 'assistant',
            content: msg.text,
        }));

        // Son kullanıcı mesajına dil kilidi ekle — modelin prompt'un sonuna en çok
        // dikkat ettiği bilindiğinden "dil kayması" sorununa en etkili çözüm bu.
        const userMessageWithLangLock =
            `${message}\n\n(Lütfen cevabı SADECE TÜRKÇE yaz. Kaynaklar İngilizce olsa bile çevirip kullan.)`;
        groqHistory.push({ role: 'user', content: userMessageWithLangLock });

        // ── GROQ FALLBACK DÖNGÜSÜ ──
        const MAX_RETRIES = (groqKeyManager.getStatus().totalCombinations) || 1;
        let lastError = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            const config = groqKeyManager.getActiveConfig();
            if (!config) break; // Tüm keyler/modeller tükendi

            try {
                const maskedKey = config.apiKey.substring(0, 8) + '...';
                console.log(`[Chat] Groq deneniyor: model=${config.model} key=${maskedKey} (deneme ${attempt + 1})`);

                const reply = await tryGroqChat(config.apiKey, config.model, systemPrompt, groqHistory);

                if (reply) {
                    return res.json({
                        reply,
                        provider: 'groq',
                        model: config.model,
                    });
                }
            } catch (err) {
                lastError = err;
                const status = err?.status || err?.statusCode || err?.error?.status_code || 0;

                if (status === 429 || status === 401 || status === 403) {
                    // Rate limit veya auth hatası → bu key+model blokla, sonraki dene
                    groqKeyManager.markBlocked(config.apiKey, config.model, status);
                    continue;
                }

                // Bilinmeyen hata → logla, sonraki dene
                console.error(`[Chat] Groq hatası (${status}):`, err.message || err);
                groqKeyManager.markBlocked(config.apiKey, config.model, status || 500);
                continue;
            }
        }

        // Tüm Groq keyler/modeller tükendi
        const status = groqKeyManager.getStatus();
        console.error(`[Chat] Tüm Groq keyler/modeller tükendi. Bloklanmış: ${status.blockedCount}/${status.totalCombinations}`);
        res.status(502).json({
            error: 'Chatbot şu anda yanıt veremiyor. Tüm API anahtarları sınıra ulaştı. Lütfen birkaç dakika sonra tekrar deneyin.',
            status,
        });
    } catch (err) {
        console.error('Chat endpoint error:', err);
        res.status(500).json({ error: 'Chatbot yanıt veremedi' });
    }
});

// ==========================================
// BAŞLAT
// ==========================================
app.listen(PORT, () => {
    console.log(`🌿 Alerji Takip Backend çalışıyor: http://localhost:${PORT}`);

    // PostgreSQL bağlantısı (üyelik & kota için zorunlu)
    db.ping()
        .then(() => console.log('   PostgreSQL:     ✅ Bağlantı başarılı'))
        .catch((e) => console.log(`   PostgreSQL:     ❌ Bağlanılamadı (${e.message}). 'npm run migrate' çalıştırıp DATABASE_URL'i kontrol edin.`));

    // Pollen sağlayıcı durumu
    const { getKeyManagerStatus } = require('./tools/pollenProviders/google');
    const km = getKeyManagerStatus();
    console.log(`   Pollen Sağlayıcıları:`);
    if (km.totalKeys > 0) {
        console.log(`     • Google Pollen API: ✅ ${km.totalKeys} anahtar yüklü (aktif: #${km.activeKeyIndex + 1})`);
    } else {
        console.log(`     • Google Pollen API: ⚠️  Anahtar yok (Open-Meteo fallback'e düşülecek)`);
    }
    console.log(`     • Open-Meteo (CAMS Europe): ✅ Hazır (anahtar gerekmez, son çare fallback)`);
    const groqStatus = groqKeyManager.getStatus();
    console.log(`   Groq API Keys:  ${groqStatus.totalKeys > 0 ? `✅ ${groqStatus.totalKeys} key, ${groqStatus.totalModels} model` : '❌ Eksik'}`);
    if (groqStatus.totalKeys > 0) {
        console.log(`   Groq Model Sırası: ${groqKeyManager.models.join(' → ')}`);
    }

    // RAG indeksi hazır mı? (ilk chat isteğinde zaten lazy load olur, burada sadece bilgilendirme)
    const fsSync = require('fs');
    const indexPath = path.join(__dirname, '..', 'data', 'vector-store.json');
    if (fsSync.existsSync(indexPath)) {
        const sizeMB = (fsSync.statSync(indexPath).size / 1024 / 1024).toFixed(1);
        console.log(`   RAG Indeks:     ✅ ${indexPath} (${sizeMB} MB)`);
    } else {
        console.log(`   RAG Indeks:     ❌ Yok. 'node rag/build-index.js' ile oluştur.`);
    }
});
