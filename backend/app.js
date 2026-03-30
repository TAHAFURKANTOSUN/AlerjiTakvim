// ==========================================
// ALERJİ TAKİP BACKEND - Express.js Sunucusu
// Auth + Pollen API Proxy
// ==========================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

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
// POLLEN API PROXY
// ==========================================
app.get('/api/pollen', authMiddleware, async (req, res) => {
    try {
        const { lat, lng, days = 5 } = req.query;
        
        if (!lat || !lng) {
            return res.status(400).json({ error: 'lat ve lng parametreleri gerekli' });
        }
        
        if (!POLLEN_API_KEY) {
            return res.status(500).json({ error: 'Pollen API key yapılandırılmamış' });
        }
        
        const url = `https://pollen.googleapis.com/v1/forecast:lookup?key=${POLLEN_API_KEY}&location.latitude=${lat}&location.longitude=${lng}&days=${days}&languageCode=tr&plantsDescription=true`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errData = await response.json().catch(() => null);
            if (response.status === 403) {
                return res.status(502).json({ error: 'Pollen API anahtarı geçersiz veya API etkinleştirilmemiş' });
            }
            if (response.status === 429) {
                return res.status(429).json({ error: 'API istek limiti aşıldı' });
            }
            return res.status(502).json({ error: errData?.error?.message || `API hatası: ${response.status}` });
        }
        
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('Pollen proxy error:', err);
        res.status(500).json({ error: 'Polen verileri alınırken hata oluştu' });
    }
});

// ==========================================
// BAŞLAT
// ==========================================
app.listen(PORT, () => {
    console.log(`🌿 Alerji Takip Backend çalışıyor: http://localhost:${PORT}`);
    console.log(`   Pollen API Key: ${POLLEN_API_KEY ? '✅ Yapılandırılmış' : '❌ Eksik'}`);
});
