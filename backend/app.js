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
const jwt = require('jsonwebtoken');
const fs = require('fs');
const Groq = require('groq-sdk');
const groqKeyManager = require('./groqKeyManager');

// RAG + Pollen araçları (chat endpoint'i için)
const { retrieveRelevantChunks } = require('../rag/retriever');
const { fetchPollenSummary, getPollenData } = require('./tools/pollen');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const POLLEN_API_KEY = process.env.POLLEN_API_KEY;
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());

// ==========================================
// YARDIMCI FONKSİYONLAR
// ==========================================
function readUsers() {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

function writeUsers(users) {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// ==========================================
// AUTH MIDDLEWARE
// ==========================================
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Yetkilendirme gerekli' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
    }
}

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
        
        const users = readUsers();
        
        // E-posta kontrol
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            return res.status(400).json({ error: 'Bu e-posta adresi zaten kayıtlı' });
        }
        
        // Şifre hash
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Kullanıcı oluştur
        const newUser = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            avatar: '👤',
            allergies: [],
            favorites: [],
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        writeUsers(users);
        
        // Token oluştur
        const token = generateToken(newUser);
        
        res.status(201).json({
            message: 'Kayıt başarılı',
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                avatar: newUser.avatar,
                allergies: newUser.allergies,
                favorites: newUser.favorites
            }
        });
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
        
        const users = readUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
        
        if (!user) {
            return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
        }
        
        const token = generateToken(user);
        
        res.json({
            message: 'Giriş başarılı',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                allergies: user.allergies || [],
                favorites: user.favorites || []
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// BEN KİMİM
app.get('/api/me', authMiddleware, (req, res) => {
    const users = readUsers();
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    res.json({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            allergies: user.allergies || [],
            favorites: user.favorites || []
        }
    });
});

// PROFİL GÜNCELLE
app.put('/api/profile', authMiddleware, (req, res) => {
    const { name, avatar, allergies } = req.body;
    const users = readUsers();
    const idx = users.findIndex(u => u.id === req.user.id);
    if (idx === -1) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    
    if (name !== undefined) {
        if (name.trim().length < 2) {
            return res.status(400).json({ error: 'İsim en az 2 karakter olmalıdır' });
        }
        users[idx].name = name.trim();
    }
    if (avatar !== undefined) users[idx].avatar = avatar;
    if (allergies !== undefined) users[idx].allergies = allergies;
    
    writeUsers(users);
    
    res.json({
        message: 'Profil güncellendi',
        user: {
            id: users[idx].id,
            name: users[idx].name,
            email: users[idx].email,
            avatar: users[idx].avatar,
            allergies: users[idx].allergies,
            favorites: users[idx].favorites || []
        }
    });
});

// FAVORİLER GÜNCELLE
app.put('/api/favorites', authMiddleware, (req, res) => {
    const { favorites } = req.body;
    const users = readUsers();
    const idx = users.findIndex(u => u.id === req.user.id);
    if (idx === -1) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    
    users[idx].favorites = favorites || [];
    writeUsers(users);
    
    res.json({
        message: 'Favoriler güncellendi',
        favorites: users[idx].favorites
    });
});

// HESAP SİL
app.delete('/api/account', authMiddleware, async (req, res) => {
    try {
        const { password } = req.body;
        const users = readUsers();
        const user = users.find(u => u.id === req.user.id);
        
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        // Şifre doğrulama
        if (password) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Şifre hatalı' });
            }
        }
        
        const filtered = users.filter(u => u.id !== req.user.id);
        writeUsers(filtered);
        
        res.json({ message: 'Hesap başarıyla silindi' });
    } catch (err) {
        console.error('Delete account error:', err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

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
// PUBLIC — auth GEREKMEZ:
//   • Polen verisi hassas değil (Google/Open-Meteo zaten halka açık)
//   • API anahtarları sunucu tarafında kalıyor
//   • Login olmamış kullanıcı da haritayı görebilsin
//   • Kotaya karşı zaten çoklu key + Open-Meteo fallback var
// ==========================================
app.get('/api/pollen', async (req, res) => {
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

app.post('/api/chat', async (req, res) => {
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
