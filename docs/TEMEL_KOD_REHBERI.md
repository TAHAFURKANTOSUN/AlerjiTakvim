# Alerji Takip — Temel Kod Rehberi

Bu belge sadece **uygulamanın çalışması için zorunlu** dosyaları ve içlerindeki
**temel kodu** kısa örneklerle anlatır. Yan dosyalar, eski yedekler ve detay
yardımcılar hariç tutuldu.

---

## Backend — temel akış

```
İstek geldiğinde:
  güvenlik → JSON parse → kim olduğunu çöz (token) → kotayı kontrol et →
  route handler → servis → DB / Groq / Google → yanıt
```

Beş katman:
1. **Giriş** — `server.js`, `app.js`
2. **Yapılandırma** — `config/env.js`, `config/plans.js`
3. **Veritabanı** — `db/pool.js`, `db/schema.sql`
4. **Güvenlik & Kimlik** — `middleware/auth.js`, `middleware/quota.js`
5. **İş mantığı** — `routes/*.js`, `services/*.js`

---

### 1. Giriş noktası

**`backend/server.js`** — Express uygulamasını alır ve dinlemeye başlar:

```js
const app = require('./app');
const config = require('./config/env');
const db = require('./db/pool');

const server = app.listen(config.port, () => {
    console.log(`🌿 Backend: http://localhost:${config.port}`);
    db.ping().then(/* başarı */).catch(/* hata */);
});

// Ctrl+C / PM2 reload: DB havuzunu düzgün kapat
process.on('SIGTERM', () => server.close(() => db.end()));
```

**`backend/app.js`** — Middleware zinciri (sıra önemlidir):

```js
const app = express();
app.set('trust proxy', config.trustProxy);
app.use(securityHeaders());       // helmet
app.use(corsMiddleware());        // CORS allowlist
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', healthHandler);  // LB sağlık kontrolü için (rate-limit dışı)

app.use('/api', generalLimiter);  // genel hız sınırı
app.use('/api', authRouter);             // /register, /login, /me, /profile
app.use('/api/usage', usageRouter);
app.use('/api/membership', membershipRouter);
app.use('/api/pollen', pollenRouter);
app.use('/api/chat', chatRouter);

app.use(notFoundHandler);  // 404
app.use(errorHandler);     // her yerden gelen hatayı tek noktada
module.exports = app;
```

`server.js` dinleyen sunucu, `app.js` ise sadece kurulum. Bu ayrım Express'i test
ederken ağ açmadan çağırabilmeyi sağlar.

---

### 2. Yapılandırma

**`config/env.js`** — Tüm ortam değişkenlerini tek yerden okur ve doğrular:

```js
function resolveJwtSecret() {
    const s = process.env.JWT_SECRET;
    if (s && s.length >= 16) return s;
    if (isProd) throw new Error('JWT_SECRET zorunlu (min 16 karakter)');
    return crypto.randomBytes(48).toString('hex');  // dev: rastgele
}

module.exports = {
    port: int(process.env.PORT, 3001),
    jwtSecret: resolveJwtSecret(),
    jwtExpiresIn: '7d',
    rateLimit: { windowMs: 15*60*1000, max: 300 },
    ...
};
```

**Önemli:** Üretimde `JWT_SECRET` yoksa sunucu **açılışta durur** (fail-fast).
Eski `'fallback-secret-key'` deliği kaldırıldı.

**`config/plans.js`** — Plan limitleri:

```js
const PLANS = {
    anon:    { limits: { pollen: 3,  chat: 3  } },   // misafir (IP bazlı)
    free:    { limits: { pollen: 10, chat: 5  } },   // ücretsiz üye
    premium: { limits: { pollen: null, chat: null } } // null = sınırsız
};
const PREMIUM = { price: 49.99, currency: 'TRY', days: 30 };
```

Her plan günde sıfırlanır.

---

### 3. Veritabanı

**`db/pool.js`** — PostgreSQL bağlantı havuzu. **Lazy** — ilk sorguya kadar bağlanmaz:

```js
let _pool = null;
function getPool() {
    if (!_pool) _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return _pool;
}
async function query(text, params) { return getPool().query(text, params); }
async function ping() { await getPool().query('SELECT 1'); return true; }
async function end() { if (_pool) { await _pool.end(); _pool = null; } }

// Test için (pg-mem enjekte etmek için)
function setPoolForTesting(pool) { _pool = pool; }
```

**`db/schema.sql`** — Üç tablo:

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT, email TEXT UNIQUE, password TEXT,   -- bcrypt hash
    avatar TEXT, allergies JSONB, favorites JSONB,
    plan TEXT DEFAULT 'free',                       -- 'free' | 'premium'
    plan_expires_at TIMESTAMPTZ
);

CREATE TABLE usage_daily (
    subject TEXT,           -- 'user:<id>' veya 'ip:<addr>'
    usage_date DATE,
    pollen_count INTEGER, chat_count INTEGER,
    PRIMARY KEY (subject, usage_date)
);

CREATE TABLE payments (
    id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id),
    amount NUMERIC, status TEXT, provider TEXT
);
```

---

### 4. Güvenlik & Kimlik

**`middleware/auth.js`** — JWT token üretimi ve iki ayrı doğrulama:

```js
// Token üret (giriş başarılı olunca çağrılır)
function signToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, plan: user.plan },
        config.jwtSecret,
        { expiresIn: '7d' }
    );
}

// Zorunlu auth — token yoksa 401
function authMiddleware(req, res, next) {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Yetkilendirme gerekli' });
    try {
        req.user = jwt.verify(h.split(' ')[1], config.jwtSecret);
        next();
    } catch { return res.status(401).json({ error: 'Geçersiz token' }); }
}

// İsteğe bağlı auth — token varsa req.user'ı doldur, yoksa engellemez
function optionalAuth(req, _res, next) {
    const h = req.headers.authorization;
    if (h?.startsWith('Bearer ')) {
        try { req.user = jwt.verify(h.split(' ')[1], config.jwtSecret); } catch {}
    }
    next();  // her durumda devam et (misafir akışı için)
}
```

**`middleware/quota.js`** — Günlük limit. Bu, kotayı uygulayan asıl yer:

```js
function enforceQuota(resource) {  // 'pollen' veya 'chat'
    return async (req, res, next) => {
        const { subject, planKey } = await resolveSubjectAndPlan(req);
        const limit = getPlan(planKey).limits[resource];  // null = sınırsız
        const result = await usageService.consume(subject, resource, limit);

        res.set('X-Quota-Plan', planKey);
        res.set('X-Quota-Used', String(result.used));

        if (!result.allowed) {
            return res.status(429).json({
                error: planKey === 'anon'
                    ? 'Hakkınız doldu. Kayıt olun.'
                    : 'Hakkınız doldu. Premium\'a geçin.',
                code: 'QUOTA_EXCEEDED',
                action: planKey === 'anon' ? 'register' : 'upgrade'
            });
        }
        next();  // sayaç artırıldı, devam
    };
}
```

`subject` "kim sayacı kullanıyor": üye için `user:<id>`, misafir için `ip:<addr>`.

---

### 5. İş mantığı — Route'lar ve servisler

**`routes/auth.js`** — Kayıt ve giriş:

```js
// KAYIT
router.post('/register', authLimiter, asyncHandler(async (req, res) => {
    const { name, email, password, passwordConfirm } = req.body;
    const errors = validateRegister({ name, email, password, passwordConfirm });
    if (errors.length) throw ApiError.badRequest(errors[0]);

    if (await usersService.findByEmail(email))
        throw ApiError.badRequest('Bu e-posta zaten kayıtlı');

    const created = await usersService.createUser({ name, email, password });
    const token = signToken(usersService.publicUser(created));
    res.status(201).json({ token, user: usersService.publicUser(created) });
}));

// GİRİŞ
router.post('/login', authLimiter, asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const row = await usersService.findByEmail(email);
    if (!row) throw ApiError.unauthorized('E-posta veya şifre hatalı');

    const ok = await bcrypt.compare(password, row.password);
    if (!ok) throw ApiError.unauthorized('E-posta veya şifre hatalı');

    const token = signToken(usersService.publicUser(row));
    res.json({ token, user: usersService.publicUser(row) });
}));
```

**`services/users.js`** — Kullanıcı işlemleri. En önemli iki fonksiyon:

```js
async function createUser({ name, email, password }) {
    const hashed = await bcrypt.hash(password, 10);  // şifre hash'le
    const id = Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
    const { rows } = await query(
        `INSERT INTO users (id, name, email, password, plan)
         VALUES ($1, $2, $3, $4, 'free') RETURNING *`,
        [id, name.trim(), email.toLowerCase().trim(), hashed]
    );
    return rows[0];
}

// Premium'a yükselt: mevcut süre üzerine ekler (uzatma)
async function setPremium(id, { days }) {
    const cur = await findById(id);
    const base = cur.plan_expires_at && new Date(cur.plan_expires_at) > new Date()
        ? new Date(cur.plan_expires_at)  // mevcut bitiş ileri tarihteyse onun üzerine
        : new Date();                     // değilse şu andan başla
    const expires = new Date(base.getTime() + days * 86400000);
    const { rows } = await query(
        `UPDATE users SET plan='premium', plan_expires_at=$2 WHERE id=$1 RETURNING *`,
        [id, expires]
    );
    return rows[0];
}
```

**`services/usage.js`** — Atomik kota artırımı. Projenin en kritik SQL'i:

```js
async function consume(subject, resource, limit) {
    const col = resource === 'pollen' ? 'pollen_count' : 'chat_count';

    // 1) Bugünün satırını garanti et (yoksa oluştur)
    await query(
        `INSERT INTO usage_daily (subject, usage_date) VALUES ($1, CURRENT_DATE)
         ON CONFLICT (subject, usage_date) DO NOTHING`,
        [subject]
    );

    // 2) YALNIZCA limit altındaysa artır — atomik, yarış koşulsuz
    const { rows } = await query(
        `UPDATE usage_daily SET ${col} = ${col} + 1
         WHERE subject=$1 AND usage_date=CURRENT_DATE AND ${col} < $2
         RETURNING ${col} AS used`,
        [subject, limit]
    );

    if (rows.length === 0) {
        // Hiç satır güncellenmedi → kota dolu
        return { allowed: false, used: limit, limit, remaining: 0 };
    }
    return { allowed: true, used: rows[0].used, limit, remaining: limit - rows[0].used };
}
```

**Neden bu desen?** İki ifade aralarında bile aynı anda 1000 istek gelse,
PostgreSQL'in satır kilidi sayesinde sayaç doğru artar. `FOR UPDATE` gerekmez.

**`routes/pollen.js`** — Polen verisi (kotalı):

```js
router.get('/', optionalAuth, enforceQuota('pollen'), asyncHandler(async (req, res) => {
    const { lat, lng, days = 5 } = req.query;
    if (!lat || !lng) throw ApiError.badRequest('lat ve lng gerekli');

    // Google'ı dene → başarısızsa otomatik Open-Meteo
    const data = await getPollenData({ lat: +lat, lng: +lng, days: +days });
    res.set('X-Pollen-Source', data._source);  // hangi sağlayıcı yanıtladı
    res.json(data);
}));
```

**`routes/chat.js`** — AI sohbet (ince controller):

```js
router.post('/', optionalAuth, enforceQuota('chat'), asyncHandler(async (req, res) => {
    const { message, locationName, lat, lng, userAllergens, history } = req.body;
    if (!message) throw ApiError.badRequest('Mesaj gerekli');

    const result = await generateChatReply({ message, locationName, lat, lng, userAllergens, history });
    res.json(result);  // { reply, provider, model }
}));
```

**`services/chat.js`** — AI orchestrator. Üç aşama: bağlam topla → prompt kur →
Groq'a sor (fallback'li):

```js
async function generateChatReply({ message, locationName, lat, lng, userAllergens, history }) {
    // 1) PARALEL olarak RAG ve canlı polen verisini topla
    const [ragResult, pollenResult] = await Promise.allSettled([
        retrieveRelevantChunks(message, 3),       // bilimsel kaynaklar
        fetchPollenSummary({ lat, lng, locationName })  // anlık polen
    ]);
    const chunks = ragResult.status === 'fulfilled' ? ragResult.value : [];
    const livePollen = pollenResult.status === 'fulfilled' ? pollenResult.value : null;

    // 2) Sistem promptunu kur (dil kilidi + kimlik + kaynaklar + polen)
    const systemPrompt = buildSystemPrompt({ locationName, userAllergens, chunks, livePollen });

    // 3) Groq'a sor — anahtar/model matrisinde fallback
    const maxRetries = groqKeyManager.getStatus().totalCombinations;
    for (let i = 0; i < maxRetries; i++) {
        const cfg = groqKeyManager.getActiveConfig();
        if (!cfg) break;
        try {
            const reply = await tryGroqChat(cfg.apiKey, cfg.model, systemPrompt, history);
            if (reply) return { reply, provider: 'groq', model: cfg.model };
        } catch (err) {
            groqKeyManager.markBlocked(cfg.apiKey, cfg.model, err.status);
            // sıradaki anahtara/modele geç
        }
    }
    throw new ApiError(502, 'Tüm Groq anahtarları tükendi');
}
```

**`prompts/chatPrompt.js`** — Sistem promptu kurucusu:

```js
function buildSystemPrompt({ locationName, userAllergens, chunks, livePollen }) {
    return `# DİL KURALI (EN ÖNCELİKLİ)
SEN SADECE TÜRKÇE YANIT VEREN BİR ASİSTANSIN.

# KİMLİK
Sen "Polen Asistanı"sın. Konum: ${locationName}.
Kullanıcının alerjenleri: ${userAllergens.join(', ')}

${buildContextBlock(chunks)}    // RAG bağlam: bilimsel makale parçaları
${buildPollenBlock(livePollen)} // Anlık polen değerleri (sayısal)

# YANIT KURALLARI
- Anlık polen bloğu varsa: SADECE bu sayılara dayan. Uydurma.
- Kaynaklarda ve canlı veride yoksa: "Bu konuda elimde net veri yok" de.
- İlaç önerme, teşhis koyma. Ciddi belirtide doktora yönlendir.`;
}

// Son kullanıcı mesajına dil kilidini tekrar ekle
// (modeller prompt'un sonuna en çok dikkat eder)
function withLanguageLock(message) {
    return `${message}\n\n(Lütfen cevabı SADECE TÜRKÇE yaz.)`;
}
```

---

## Frontend — temel akış

```
main.jsx → App.jsx → Context'ler (Theme, Auth, Usage, Pollen) → CleanDashboard
```

Üç temel kavram:
1. **Context** — Global state (kullanıcı, kota, konum) tüm bileşenlerde erişilebilir.
2. **api/client.js** — Tüm sunucu çağrılarının tek noktası; 401/429 olayları yönetir.
3. **Bileşen** — Dashboard, hesap menüsü, modaller.

---

### 1. Giriş

**`main.jsx`** — React'i DOM'a bağlar:

```jsx
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

**`App.jsx`** — Sağlayıcı yığını (provider hierarchy):

```jsx
export default function App() {
  return (
    <ThemeProvider>            {/* açık/koyu tema */}
      <AuthProvider>           {/* kullanıcı oturumu */}
        <UsageProvider>        {/* kota + modal durumları */}
          <PollenProvider>     {/* konum + canlı polen */}
            <CleanDashboard />        {/* ana sayfa */}
            <MembershipModals />      {/* AuthModal + UpgradeModal + toast */}
          </PollenProvider>
        </UsageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

---

### 2. API istemcisi

**`api/client.js`** — Tüm fetch çağrılarının ortak sarmalayıcısı:

```js
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
        // Token süresi doldu → otomatik logout
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
        // Kota doldu → modali aç
        if (response.status === 429 && data.code === 'QUOTA_EXCEEDED') {
            window.dispatchEvent(new CustomEvent('quota:exceeded', { detail: data }));
        }
        throw { status: response.status, ...data };
    }
    return data;
}

// Kullanıma sunulan fonksiyonlar:
export async function login(email, password) { /* ... */ }
export async function register(name, email, password, passwordConfirm) { /* ... */ }
export async function getMe() { return apiRequest('/api/me'); }
export async function fetchPollen(lat, lng, days) {
    const data = await apiRequest(`/api/pollen?lat=${lat}&lng=${lng}&days=${days}`);
    window.dispatchEvent(new CustomEvent('usage:changed'));  // kota rozeti tazelensin
    return data;
}
```

**Olay tabanlı mimari:** 401 yakalanırsa `auth:unauthorized`, 429 yakalanırsa
`quota:exceeded`. Bu olayları **AuthContext** ve **UsageContext** dinler ve
gerekirse modali açar.

---

### 3. Context'ler

**`AuthContext.jsx`** — Oturum yönetimi:

```jsx
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    // Sayfa açılışında token varsa kim olduğunu sor
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) getMe().then(d => setUser(d.user)).catch(() => localStorage.removeItem('token'));
    }, []);

    // 401 olayını dinle (otomatik logout)
    useEffect(() => {
        const handler = () => setUser(null);
        window.addEventListener('auth:unauthorized', handler);
        return () => window.removeEventListener('auth:unauthorized', handler);
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            loginUser: setUser,           // AuthModal başarılı login sonrası çağırır
            logoutUser: () => { logout(); setUser(null); }
        }}>
            {children}
        </AuthContext.Provider>
    );
}
```

**`UsageContext.jsx`** — Kota + modallar:

```jsx
export function UsageProvider({ children }) {
    const { user } = useAuth();
    const [usage, setUsage] = useState(null);
    const [authModal, setAuthModal] = useState(null);  // 'login' | 'register' | null
    const [upgradeOpen, setUpgradeOpen] = useState(false);

    const refreshUsage = useCallback(() => getUsage().then(setUsage), []);

    // Oturum değişince kotayı tazele
    useEffect(() => { refreshUsage(); }, [user, refreshUsage]);

    // Kota doldu olayını dinle → uygun modali aç
    useEffect(() => {
        const handler = (e) => {
            if (e.detail.action === 'upgrade') setUpgradeOpen(true);  // free user
            else setAuthModal('register');                              // misafir
            refreshUsage();
        };
        window.addEventListener('quota:exceeded', handler);
        return () => window.removeEventListener('quota:exceeded', handler);
    }, [refreshUsage]);

    return (
        <UsageContext.Provider value={{ usage, authModal, upgradeOpen, ... }}>
            {children}
        </UsageContext.Provider>
    );
}
```

**`PollenContext.jsx`** — Konum + canlı polen:

```jsx
export function PollenProvider({ children }) {
    const [selectedLocation, setSelectedLocation] = useState(initialLocation);
    const [userAllergens, setUserAllergens] = useState(/* localStorage'dan */);
    const [livePollen, setLivePollen] = useState(null);

    // Konum değişince polen verisini çek
    useEffect(() => {
        fetchPollen(selectedLocation.lat, selectedLocation.lng, 1)
            .then(setLivePollen)
            .catch(/* hata */);
    }, [selectedLocation]);

    // API yanıtını widget'ların beklediği şekle çevir
    const pollenData = useMemo(
        () => livePollen ? adaptLivePollen(livePollen, userAllergens) : null,
        [livePollen, userAllergens]
    );

    return <PollenContext.Provider value={{ selectedLocation, pollenData, ... }} children={children} />;
}
```

---

### 4. Ana bileşenler

**`pages/CleanDashboard.jsx`** — Ana sayfa. PollenContext'ten veri çeker,
Recharts ile grafik çizer:

```jsx
export default function CleanDashboard() {
    const { selectedLocation, pollenData, userAllergens, currentView } = usePollen();

    // Profil görünümündeyse onu render et
    if (currentView === 'profile') {
        return <DashboardProfilePage onClose={() => setCurrentView('dashboard')} />;
    }

    return (
        <div className="clean-shell">
            <header>
                <CityDropdown />     {/* şehir seçici */}
                <ThemeToggle />      {/* açık/koyu */}
                <AccountMenu />      {/* hesap menüsü (dropdown) */}
            </header>
            <main>
                <HeroCard alerts={pollenData.alerts} />  {/* risk seviyesi */}
                <ResponsiveContainer height={300}>
                    <AreaChart data={pollenData.hourly}>
                        {/* 24 saatlik polen yoğunluğu grafiği */}
                    </AreaChart>
                </ResponsiveContainer>
            </main>
            <Chatbot />  {/* sağ altta yüzen FAB */}
        </div>
    );
}
```

**`components/dashboard/Chatbot.jsx`** — Sohbet penceresi:

```jsx
export default function Chatbot() {
    const { selectedLocation, userAllergens } = usePollen();
    const [messages, setMessages] = useState([{ from: 'bot', text: 'Merhaba!' }]);
    const [input, setInput] = useState('');

    async function askWith(text) {
        setMessages(prev => [...prev, { from: 'user', text }]);
        try {
            const data = await sendChatMessage(text, selectedLocation.name, ...);
            setMessages(prev => [...prev, { from: 'bot', text: data.reply }]);
        } catch (err) {
            // Kota doldu → kullanıcı dostu mesaj
            if (err.code === 'QUOTA_EXCEEDED') {
                const msg = err.action === 'upgrade'
                    ? '⭐ Sohbet hakkınız doldu. Premium\'a geçebilirsiniz.'
                    : '🔒 Misafir hakkınız doldu. Kayıt olun.';
                setMessages(prev => [...prev, { from: 'bot', text: msg }]);
            }
        }
    }
    /* ... render: mesaj listesi + input + öneri butonları ... */
}
```

**`components/membership/AccountMenu.jsx`** — Sağ üst hesap menüsü:

```jsx
export default function AccountMenu() {
    const { user, logoutUser } = useAuth();
    const { usage, openLogin, openUpgrade } = useUsage();
    const { setCurrentView } = usePollen();
    const [open, setOpen] = useState(false);

    const isPremium = user?.plan === 'premium';

    return (
        <div className="acct-wrap">
            <button onClick={() => setOpen(o => !o)}>
                {user?.name || 'Misafir'} ▾
            </button>
            {open && (
                <div className="acct-panel">
                    {/* Kimlik bölümü */}
                    <div>{user?.name || 'Misafir kullanıcı'}</div>
                    {/* Kota satırları (premium değilse) */}
                    {!isPremium && <QuotaRow info={usage?.usage.pollen} />}
                    {/* Aksiyonlar */}
                    {!user && <button onClick={openLogin}>Giriş yap</button>}
                    {user && !isPremium && <button onClick={openUpgrade}>★ Premium'a geç</button>}
                    <button onClick={() => setCurrentView('profile')}>⚙️ Profil ve Ayarlar</button>
                    {user && <button onClick={logoutUser}>Çıkış yap</button>}
                </div>
            )}
        </div>
    );
}
```

**`components/membership/AuthModal.jsx`** — Giriş/Kayıt modali:

```jsx
export default function AuthModal() {
    const { authModal, closeAuth } = useUsage();   // null | 'login' | 'register'
    const { loginUser } = useAuth();

    if (!authModal) return null;

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            const data = authModal === 'register'
                ? await apiRegister(name, email, password, passwordConfirm)
                : await apiLogin(email, password);
            loginUser(data.user);  // token client.js'te zaten saklandı
            closeAuth();
        } catch (err) {
            setError(err.error);
        }
    }
    /* ... form: ad/email/şifre alanları + sekme + hata mesajı ... */
}
```

**`components/membership/UpgradeModal.jsx`** — Premium yükseltme:

```jsx
export default function UpgradeModal() {
    const { upgradeOpen, closeUpgrade } = useUsage();
    const { user, loginUser } = useAuth();

    async function handleUpgrade() {
        const checkout = await startCheckout();                      // ödeme başlat
        const res = await confirmMembership(checkout.paymentId, checkout.token);  // doğrula
        loginUser(res.user);  // kullanıcı artık premium
    }

    if (!upgradeOpen) return null;
    /* ... plan karşılaştırma kartları + "Premium'a geç" butonu ... */
}
```

---

## Veri akışı — pratik örnek

**Bir kullanıcının chatbot'a soru sorması:**

```
1. Kullanıcı yazar:              Chatbot.askWith("bugün maske takmalı mıyım?")
2. İstemci API çağırır:          client.sendChatMessage(...)
3. Token + JSON ile POST:        fetch('/api/chat', { Authorization: 'Bearer ...' })
                                  ↓
4. Express middleware zinciri:   helmet → CORS → JSON → rate-limit →
                                  optionalAuth (req.user'ı doldur) →
                                  enforceQuota('chat') (kota sayacını artır)
                                  ↓
5. routes/chat.js handler:       generateChatReply(...) çağır
                                  ↓
6. services/chat.js:             - Promise.allSettled: RAG + canlı polen (PARALEL)
                                  - buildSystemPrompt(...) ile prompt kur
                                  - Groq'a anahtar/model matrisinde gönder
                                  ↓
7. Yanıt geri yolculuk:          { reply, provider:'groq', model } JSON
                                  ↓
8. İstemci tarafında:            usage:changed olayı yayılır
                                  → UsageContext kotayı tazeler
                                  → AccountMenu rozeti otomatik güncellenir
                                  ↓
9. Chatbot mesajı listeler:      bot baloncuğu olarak ekrana yazılır
```

**Kota dolduysa:** 6. adımda sunucu HTTP 429 + `{ code:'QUOTA_EXCEEDED', action:'upgrade' }`
döner. İstemcide `client.js` `quota:exceeded` olayı yayar. `UsageContext` bunu yakalar
ve `setUpgradeOpen(true)` ile Premium modalini açar. Chatbot ayrıca inline mesaj gösterir.

---

## Hangi sıraya çalıştırırsam ne olur?

```bash
cd backend
npm install           # bağımlılıklar (express, pg, jsonwebtoken, bcrypt, groq-sdk ...)
npm run migrate       # PostgreSQL'e şema kur (3 tablo)
npm start             # server.js → app.js → 3001 portunda dinler
npm test              # node:test + pg-mem ile 4 birim testi

cd ../frontend
npm install           # react, vite, recharts, leaflet ...
npm run dev           # Vite dev sunucusu (genelde 5173)
npm run build         # üretim derlemesi → dist/
```

Belge sonu.
