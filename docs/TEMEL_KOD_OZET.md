# Alerji Takip — Temel Kod Özeti

Sadece projenin **çekirdek akışını** oluşturan dosyalar ve onların **temel
mantığı**. Yardımcı, isteğe bağlı veya nadir kullanılan fonksiyonlar atlandı.

---

## Backend

### `server.js` — Sunucuyu başlatır
Tek iş: `app.js`'yi alır, dinlemeye geçer, kapanırken DB havuzunu temizler.
```js
const app = require('./app');
const server = app.listen(config.port, () => { /* açılış logu */ });

// SIGTERM / Ctrl+C → server.close → db.end → process.exit
process.on('SIGTERM', shutdown);
```

### `app.js` — Express uygulamasını kurar
Middleware'ler sırayla zincirlenir, route'lar bağlanır, sonunda merkezi hata
işleyici eklenir.
```js
app.set('trust proxy', config.trustProxy);
app.use(securityHeaders());     // helmet
app.use(corsMiddleware());      // CORS
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', ...);    // DB ping ile sağlık
app.use('/api', generalLimiter);

app.use('/api', authRouter);
app.use('/api/usage', usageRouter);
app.use('/api/membership', membershipRouter);
app.use('/api/pollen', pollenRouter);
app.use('/api/chat', chatRouter);

app.use(notFoundHandler);
app.use(errorHandler);
```

### `config/env.js` — Ortam değişkenleri (fail-fast)
Tüm `process.env` okumaları burada. Üretimde `JWT_SECRET` zorunludur; eksikse
sunucu açılışta durur.
```js
function resolveJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16) return s;
  if (isProd) throw new Error('JWT_SECRET zorunlu');
  return crypto.randomBytes(48).toString('hex'); // dev: rastgele
}
module.exports = { port, jwtSecret, jwtExpiresIn, corsOrigins, ... };
```

### `db/pool.js` — PostgreSQL bağlantısı
Lazy havuz — ilk sorguda kurulur. Test enjeksiyonu için `setPoolForTesting` var.
```js
function getPool() {
  if (!_pool) _pool = new Pool({ connectionString: DATABASE_URL });
  return _pool;
}
async function query(text, params) { return getPool().query(text, params); }
async function end() { if (_pool) await _pool.end(); }
```

### `db/schema.sql` — Üç tablo
```sql
users        (id PK, email UNIQUE, password,  plan, plan_expires_at, ...)
usage_daily  ((subject, usage_date) PK, pollen_count, chat_count)
payments     (id PK, user_id FK, amount, status, provider, ...)
```

### `middleware/auth.js` — JWT
```js
function signToken(user) {  // 7 gün
  return jwt.sign({ id, email, name, plan }, config.jwtSecret, { expiresIn: '7d' });
}
function authMiddleware(req, res, next) { /* Bearer token yoksa 401 */ }
function optionalAuth(req, _res, next)  { /* token varsa doldur, yoksa devam */ }
```

### `middleware/quota.js` — Günlük kota uygulama
`enforceQuota('pollen' | 'chat')` middleware fabrikası. Subject (user veya IP)
belirlenir, atomik `consume()` çağırılır, limit dolarsa **HTTP 429**.
```js
function enforceQuota(resource) {
  return async (req, res, next) => {
    const { subject, planKey } = await resolveSubjectAndPlan(req);
    const limit = getPlan(planKey).limits[resource];
    const result = await usageService.consume(subject, resource, limit);
    if (!result.allowed) {
      return res.status(429).json({
        code: 'QUOTA_EXCEEDED',
        action: planKey === 'anon' ? 'register' : 'upgrade',
        ...
      });
    }
    next();
  };
}
```

### `services/users.js` — Kullanıcı CRUD + premium yaşam döngüsü
Çekirdek fonksiyonlar:
- `createUser({name,email,password})` — bcrypt(10) + DB insert.
- `findByEmail(email)` / `findById(id)` — temel okuma.
- `setPremium(id, {days})` — `plan='premium'`, mevcut süreyi uzatır.
- `normalizePlan(row)` — süresi geçen premium → `'free'` (DB yazımı yok).
- `publicUser(row)` — şifre gizleyen güvenli dış sürüm.

### `services/usage.js` — Atomik günlük kota
**Yarış koşulsuz iki adım** (FOR UPDATE yok):
```js
async function consume(subject, resource, limit) {
  // 1) Bugünün satırını garanti et
  await query(`INSERT INTO usage_daily(subject, usage_date)
               VALUES ($1, CURRENT_DATE)
               ON CONFLICT (subject, usage_date) DO NOTHING`, [subject]);

  // 2) Yalnızca limit altındaysa atomik artır
  const { rows } = await query(
    `UPDATE usage_daily SET ${col} = ${col} + 1
      WHERE subject=$1 AND usage_date=CURRENT_DATE AND ${col} < $2
      RETURNING ${col} AS used`,
    [subject, limit]
  );
  if (rows.length === 0) return { allowed: false, ... };   // limit dolu
  return { allowed: true, used: rows[0].used, ... };
}
```

### `routes/auth.js` — Kayıt / giriş / profil
Her uç ince — validasyon, bir servis çağrısı, yanıt. Hatalar `ApiError` ile.
```js
router.post('/register', authLimiter, asyncHandler(async (req, res) => {
  const errors = validateRegister(req.body);
  if (errors.length) throw ApiError.badRequest(errors[0]);
  if (await usersService.findByEmail(email)) throw ApiError.badRequest('Zaten kayıtlı');
  const u = await usersService.createUser({ name, email, password });
  res.status(201).json({ token: signToken(u), user: publicUser(u) });
}));

router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const u = await usersService.findByEmail(email);
  if (!u || !await bcrypt.compare(password, u.password))
    throw ApiError.unauthorized('E-posta veya şifre hatalı');
  res.json({ token: signToken(u), user: publicUser(u) });
}));
```
Diğer uçlar (`/me`, `/profile`, `/favorites`, `/account`) aynı kalıpla.

### `routes/pollen.js` — Polen verisi
```js
router.get('/', optionalAuth, enforceQuota('pollen'), asyncHandler(async (req, res) => {
  const { lat, lng, days } = req.query;
  if (!lat || !lng) throw ApiError.badRequest('lat ve lng gerekli');
  const data = await getPollenData({ lat, lng, days });    // Google → Open-Meteo
  res.set('X-Pollen-Source', data._source);
  res.json(data);
}));
```

### `routes/chat.js` — AI sohbet
İnce controller; asıl orchestrator `services/chat.js`'te.
```js
router.post('/', optionalAuth, enforceQuota('chat'), asyncHandler(async (req, res) => {
  const result = await generateChatReply(req.body);
  res.json(result);
}));
```

### `services/chat.js` — RAG + Groq orchestrator
```js
async function generateChatReply({ message, locationName, lat, lng, ... }) {
  // RAG + canlı polen verisini PARALEL al
  const { chunks, livePollen } = await gatherContext({ message, lat, lng, locationName });

  // Sistem promptunu kur (dil kilidi + kimlik + kaynaklar + canlı veri + kurallar)
  const systemPrompt = buildSystemPrompt({ locationName, userAllergens, chunks, livePollen });

  // Son mesaja dil kilidi eki
  const history = toGroqHistory(prev);
  history.push({ role: 'user', content: withLanguageLock(message) });

  // Groq anahtar/model matrisinde fallback
  for (let i = 0; i < maxRetries; i++) {
    const cfg = groqKeyManager.getActiveConfig();
    if (!cfg) break;
    try {
      const reply = await tryGroqChat(cfg.apiKey, cfg.model, systemPrompt, history);
      if (reply) return { reply, model: cfg.model };
    } catch (err) {
      groqKeyManager.markBlocked(cfg.apiKey, cfg.model, err.status);  // sıradakine geç
    }
  }
  throw new ApiError(502, 'Tüm anahtarlar tükendi');
}
```

### `prompts/chatPrompt.js` — Sistem promptu
Modelin gördüğü her şey burada şekillenir:
```
# DİL KURALI: SADECE TÜRKÇE
# KİMLİK: Polen Asistanı (konum, alerjenler)
## 📚 BİLİMSEL KAYNAKLAR  (k=3 RAG)
## 🌱 ANLIK POLEN VERİLERİ (bugün)
# YANIT KURALLARI: veri yoksa uydurma, tıbbi tanı koyma, vb.
```
Son kullanıcı mesajına `withLanguageLock(msg)` ile dil kilidi yeniden iliştirilir.

### `tools/pollen.js` — Sağlayıcı orchestrator
```js
async function getPollenData({ lat, lng, days }) {
  if (!isGoogleBoycotted()) {
    try { return { ...await fetchGooglePollen(...), _source: 'google' }; }
    catch (err) { /* QUOTA/UNAUTHORIZED → 5 dk boykot */ }
  }
  return await fetchOpenMeteoPollen(...);   // anahtarsız fallback
}
```

### `groqKeyManager.js` — Anahtar/model fallback matrisi
`getActiveConfig()` öncelik sırasında her modeli her anahtarla dener;
429/401/403'te `markBlocked` ile o çifti süreli durdurur.

---

## Frontend

### `main.jsx` + `App.jsx` — Sağlayıcı yığını
```jsx
<ThemeProvider>
  <AuthProvider>
    <UsageProvider>
      <PollenProvider>
        <CleanDashboard />
        <MembershipModals />   {/* AuthModal + UpgradeModal + Toast */}
      </PollenProvider>
    </UsageProvider>
  </AuthProvider>
</ThemeProvider>
```

### `index.css` — Tasarım token'ları
CSS değişkenleriyle açık/koyu tema. Sıcak-beyaz yüzeyler (`#FFFDF7`),
katmanlı gölgeler, sage accent (`#5F8A48`), ince film greni dokusu.

### `context/AuthContext.jsx` — Oturum durumu
```jsx
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Mount'ta token varsa /api/me ile kullanıcıyı yükle
  useEffect(() => { checkAuth(); }, []);

  // 401 olayında oturumu temizle
  useEffect(() => {
    const h = () => setUser(null);
    window.addEventListener('auth:unauthorized', h);
    return () => window.removeEventListener('auth:unauthorized', h);
  }, []);

  return <AuthContext.Provider value={{ user, loginUser, logoutUser, ... }}>
    {children}
  </AuthContext.Provider>;
}
```

### `context/UsageContext.jsx` — Kota + modal orkestrasyon
```jsx
function UsageProvider({ children }) {
  const { user } = useAuth();
  const [usage, setUsage] = useState(null);
  const [authModal, setAuthModal] = useState(null);  // 'login'|'register'|null
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Kullanıcı değişince kota tazele
  useEffect(() => { refreshUsage(); }, [user]);

  // /api/pollen veya /api/chat sonrası rozetleri yenile
  useEffect(() => {
    const h = debounce(refreshUsage, 400);
    window.addEventListener('usage:changed', h);
    return () => window.removeEventListener('usage:changed', h);
  }, []);

  // Kota dolduğunda otomatik uygun modalı aç
  useEffect(() => {
    const h = (e) => {
      if (e.detail.action === 'upgrade') setUpgradeOpen(true);
      else setAuthModal('register');
    };
    window.addEventListener('quota:exceeded', h);
    return () => window.removeEventListener('quota:exceeded', h);
  }, []);

  return <UsageContext.Provider value={{ usage, openLogin, openUpgrade, ... }}>
    {children}
  </UsageContext.Provider>;
}
```

### `context/PollenContext.jsx` — Konum + canlı polen
```jsx
function PollenProvider({ children }) {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);  // localStorage
  const [userAllergens, setUserAllergens] = useState(loadAllergens);          // localStorage
  const [livePollen, setLivePollen] = useState(null);
  const requestIdRef = useRef(0);   // yarış koşulu önleme

  // Konum değişince /api/pollen'i çağır
  useEffect(() => {
    const myReqId = ++requestIdRef.current;
    fetchPollen(lat, lng, 1).then(data => {
      if (myReqId === requestIdRef.current) setLivePollen(data);
    });
  }, [selectedLocation]);

  // Widget'lar için uyarlanmış veri
  const pollenData = useMemo(
    () => livePollen ? adaptLivePollen(livePollen, userAllergens) : { hourly:[], ... },
    [livePollen, userAllergens]
  );
}
```

### `api/client.js` — Tüm REST çağrıları
Tek `apiRequest` sarmalayıcısı; 401 ve 429'da global olay yayar.
```js
async function apiRequest(endpoint, options) {
  const token = localStorage.getItem('token');
  const r = await fetch(API_BASE + endpoint, { ..., headers: { Authorization: `Bearer ${token}` } });
  const data = await r.json();
  if (!r.ok) {
    if (r.status === 401) {
      localStorage.removeItem('token');
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: data }));
    }
    if (r.status === 429 && data.code === 'QUOTA_EXCEEDED') {
      window.dispatchEvent(new CustomEvent('quota:exceeded', { detail: data }));
    }
    throw { status: r.status, ...data };
  }
  return data;
}

export const login    = (e,p)   => apiRequest('/api/login',    { method:'POST', body: ... });
export const register = (...)   => apiRequest('/api/register', { method:'POST', body: ... });
export const getMe     = ()     => apiRequest('/api/me');
export const fetchPollen      = (lat,lng,days) => { /* + usage:changed yay */ };
export const sendChatMessage  = (...)          => { /* + usage:changed yay */ };
export const getUsage          = ()    => apiRequest('/api/usage');
export const startCheckout     = ()    => apiRequest('/api/membership/checkout', { method:'POST' });
export const confirmMembership = (id,t)=> apiRequest('/api/membership/confirm',  { ... });
```

### `pages/CleanDashboard.jsx` — Ana ekran
Tek sayfada her şey: header (logo + şehir + tarih + tema + hesap menüsü),
hero risk kartı, 24 saatlik Recharts AreaChart, mevsimsel ipucu, harita ve
alttan sohbet FAB. `PollenContext.currentView === 'profile'` ise tüm gövdeyi
profil sayfası bileşeni değiştirir.

### `components/dashboard/Chatbot.jsx` — Sohbet paneli
```jsx
async function askWith(text) {
  setMessages(prev => [...prev, { from:'user', text }]);
  setIsTyping(true);
  try {
    const data = await sendChatMessage(text, location, lat, lng, allergens, history);
    setMessages(prev => [...prev, { from:'bot', text: data.reply }]);
  } catch (err) {
    // 429 → bağlama uygun davet mesajı (kayıt ol veya premium'a geç)
    const isQuota = err.status === 429;
    setMessages(prev => [...prev, { from:'bot', text: isQuota ? upgradeMsg : errorMsg }]);
  }
  setIsTyping(false);
}
```

### `components/membership/AccountMenu.jsx` — Tek hesap menüsü
Header'daki tüm hesap işlemleri tek dropdown'da: kimlik, kota satırları,
Premium'a geç, Profil/Ayarlar, Çıkış (misafir için Giriş/Kayıt).

### `components/membership/AuthModal.jsx` — Giriş/Kayıt modalı
```jsx
async function handleSubmit(e) {
  e.preventDefault();
  // Frontend validasyon
  if (mode === 'register' && password !== passwordConfirm) return setError('Eşleşmiyor');

  const data = mode === 'register'
    ? await apiRegister(name, email, password, passwordConfirm)
    : await apiLogin(email, password);

  loginUser(data.user);    // AuthContext'i güncelle
  await refreshUsage();    // kotayı tazele
  closeAuth();
}
```

### `components/membership/UpgradeModal.jsx` — Premium yükseltme
```jsx
async function handleUpgrade() {
  const checkout = await startCheckout();                  // payment_id + token
  const res = await confirmMembership(checkout.paymentId, checkout.token);
  loginUser(res.user);    // artık premium
  await refreshUsage();
  setDone(true);
}
```

---

## Akışlar — Tek bakışta

**Polen sorgusu**
```
Frontend (PollenContext) → /api/pollen
   → optionalAuth → enforceQuota('pollen') → atomik consume
   → tools/pollen orchestrator: Google → Open-Meteo
   → ham JSON + X-Pollen-Source header
   → frontend livePollenAdapter → widget'lar
```

**Sohbet**
```
Chatbot.askWith(text) → /api/chat
   → optionalAuth → enforceQuota('chat')
   → services/chat: paralel (RAG, canlı polen) → sistem promptu inşa
   → groqKeyManager.getActiveConfig() ile Groq dene → fallback
   → { reply, model } → baloncuk
```

**Premium yükseltme**
```
UpgradeModal.handleUpgrade
   → POST /api/membership/checkout (payments.createCheckout — simüle/iyzico)
   → POST /api/membership/confirm  (payments.verifyPayment)
   → users.setPremium (30 gün)
   → frontend AuthContext güncellenir
```

**Kota dolduğunda**
```
herhangi bir API yanıtı: 429 + code:'QUOTA_EXCEEDED'
   → api/client.js yanıtı yakalar, 'quota:exceeded' olayı yayar
   → UsageContext dinler: misafire kayıt modalı, ücretsiz üyeye premium modalı
```

Belge sonu.
