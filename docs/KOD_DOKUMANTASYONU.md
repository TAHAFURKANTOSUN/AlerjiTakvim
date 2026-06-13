# Alerji Takip — Kod Dokümantasyonu

Her dosyanın amacı, dışa verdiği değerler ve içindeki tüm fonksiyonlar
imza + davranış olarak detaylı şekilde açıklanır.

İçindekiler:
- [Backend](#backend)
  - [Giriş noktaları](#giriş-noktaları): `server.js`, `app.js`
  - [config/](#config), [db/](#db), [middleware/](#middleware)
  - [routes/](#routes), [services/](#services), [utils/](#utils)
  - [prompts/](#prompts), [payments/](#payments), [tools/](#tools)
  - [groqKeyManager.js](#groqkeymanagerjs), [test/](#test)
- [Frontend](#frontend)
  - [Giriş + uygulama kabuğu](#frontend-giriş)
  - [context/](#context), [api/](#api)
  - [pages/](#pages), [components/dashboard/](#componentsdashboard), [components/membership/](#componentsmembership)
  - [data/](#data), [utils/](#frontend-utils)


---

# Backend

Bu uygulama Express 4 üzerinde, "uygulama fabrikası + sunucu giriş noktası"
ikilisi olarak kurulmuştur (`app.js` + `server.js`). Tüm tekrarlı try/catch
kalıpları `asyncHandler` + merkezi `errorHandler` ile ortadan kaldırılmıştır.
Ortam değerleri (env) tek bir `config/env.js` modülünden geçer; eksik kritik
değerler üretimde açılışı durdurur (fail-fast).

## Giriş noktaları

### `backend/server.js`
**Amaç.** Dinleme + açılış diagnostiği + graceful shutdown.

- Üst seviyede `app.js`'i `require` eder ve `config.port`'ta dinlemeye başlar.
- Açılışta loglar: PostgreSQL `ping` sonucu, Google Pollen anahtar durumu,
  Open-Meteo "Hazır" mesajı, Groq anahtar/model sayısı, RAG indeks dosyasının
  varlığı + boyutu.
- **Fonksiyon `shutdown(signal)`** — `SIGTERM`/`SIGINT`'te `server.close`
  çağırır, ardından `db.end()` ile pg havuzunu kapatır ve `process.exit(0)`.
  10 saniyelik bir `setTimeout` ile zorla çıkış güvencesi (açık bağlantı varsa).
- `process.on('SIGTERM' | 'SIGINT', ...)` ile sinyalleri yakalar.
- `module.exports = server` — testlerde sunucu nesnesine erişim için.

### `backend/app.js`
**Amaç.** Express uygulamasını yapılandırır ve dışa verir (HTTP açmadan).
Bu ayrım `app`'i fonksiyon olarak test edilebilir kılar.

Middleware zinciri (sıra önemlidir):
1. `app.set('trust proxy', config.trustProxy)` — reverse-proxy arkasında
   `X-Forwarded-For`'a kaç hop güveneceğini söyler.
2. `app.disable('x-powered-by')` — bilgi sızıntısını engeller.
3. `securityHeaders()` — helmet.
4. `corsMiddleware()` — CORS allowlist.
5. `express.json({ limit: config.jsonBodyLimit })` — gövde ayrıştırma + boyut sınırı.
6. `GET /` ve `GET /api/health` — rate-limit'ten önce; LB sağlık kontrolü etkilenmesin.
7. `app.use('/api', generalLimiter)` — tüm API uçlarına genel hız sınırı.
8. Route'lar: `authRouter` (`/api` köküne) + `/api/usage`, `/api/membership`,
   `/api/pollen`, `/api/chat`.
9. `notFoundHandler` (404) → `errorHandler` (4 argümanlı imza, merkezi hata).

`module.exports = app`.


## config/

### `config/env.js`
**Amaç.** Tüm `process.env` okumaları tek noktadan; eksik kritik değerleri
açılışta yakala (fail-fast).

- **`int(value, fallback)`** — string'i tam sayıya çevir; başarısızsa fallback.
- **`list(value)`** — virgülle ayrılmış string'i temiz parça dizisine çevir.
- **`resolveJwtSecret()`** — `JWT_SECRET`'ı 16+ karakterse kullanır.
  Üretimde eksikse `throw` (sunucu açılmaz). Geliştirmede 96 hex karakter
  rastgele sır üretir + uyarı basar (her restart'ta değişir).
- **`parseTrustProxy(raw, fallback)`** — `'true'/'false'/sayı`'yı Express'in
  `trust proxy` tipine çevirir.

Dışa verdiği `config` nesnesi:
- `nodeEnv`, `isProd`, `port`,
- `jwtSecret`, `jwtExpiresIn` (varsayılan `'7d'`),
- `corsOrigins` (dizi), `trustProxy`, `jsonBodyLimit`,
- `rateLimit { windowMs, max }` — genel API limit (15 dk / 300),
- `authRateLimit { windowMs, max }` — auth uçları için daha sıkı (15 dk / 20).

Yan etkiler: prod'da `corsOrigins` boş ise uyarı basar.

### `config/plans.js`
**Amaç.** Üyelik planları ve günlük kota limitleri.

- **`int(v, def)`** — yerel int yardımcısı.
- **`getPlan(key)`** — `PLANS[key]`'i döner; bilinmeyen anahtar → `PLANS.free`.

Dışa verdiği değerler:
- `PLANS` — `anon` (3/3), `free` (`FREE_POLLEN_DAILY`/`FREE_CHAT_DAILY`, vars. 10/5),
  `premium` (`{ pollen: null, chat: null }` = sınırsız). Her plan
  `{ key, label, limits: { pollen, chat } }`.
- `PREMIUM` — `{ price, currency, days }` (vars. 49.99 TRY / 30 gün).
- `PAYMENT_MODE` — `'simulate' | 'iyzico'` (varsayılan simülasyon).


## db/

### `db/pool.js`
**Amaç.** `pg` `Pool`'unu lazy şekilde kurar; testte enjekte edilebilir.

- **`buildPool()`** — `DATABASE_URL` ile `new Pool(...)` üretir; `DATABASE_SSL=true`
  ise `rejectUnauthorized: false` ekler; havuz `error` olayına bağlanır.
- **`getPool()`** — `_pool` yoksa `buildPool()` ile üretir; aksi halde mevcut.
- **`setPoolForTesting(pool)`** — `_pool`'u verilen objeyle değiştir.
  Birim testlerde `pg-mem` enjekte etmek için.
- **`query(text, params)`** — `getPool().query(...)` etrafında ince sarmalayıcı.
- **`ping()`** — `SELECT 1` çalıştırır (sağlık kontrolü).
- **`end()`** — `_pool.end()` çağırır ve `_pool = null` yapar (graceful shutdown).

### `db/schema.sql`
**Amaç.** PostgreSQL şeması (idempotent — tekrar çalıştırmak güvenli).
- `users` — id, name, email (UNIQUE), password, avatar, allergies (jsonb),
  favorites (jsonb), plan ('free'|'premium'), plan_expires_at, premium_since,
  created_at; index `idx_users_email`.
- `usage_daily` — `(subject, usage_date)` PK; `pollen_count`, `chat_count`.
- `payments` — id, user_id (FK), amount NUMERIC(10,2), currency, status, provider,
  provider_ref, created_at; index `idx_payments_user`.

### `db/migrate.js`
**Amaç.** Şemayı uygulamak + eski `users.json`'u içe aktarmak.

- **`migrate()`** (üst seviye async)
  1. `schema.sql`'i okur ve `pool.query` ile uygular.
  2. `backend/data/users.json` varsa parse eder; her kullanıcıyı
     `INSERT … ON CONFLICT (email) DO NOTHING` ile DB'ye yazar. JSON
     yoksa veya bozuksa sessizce geçer (uyarı loglar).
  3. `pool.end()` ile havuzu kapatır.


## middleware/

### `middleware/security.js`
**Amaç.** Güvenlik header'ları + CORS + rate-limit.

- **`securityHeaders()`** — `helmet({ contentSecurityPolicy:false, crossOriginResourcePolicy:'cross-origin' })`.
  JSON API olduğu için CSP gereksiz; CORP `cross-origin` ki farklı origin'de bulunan
  frontend yanıtı tüketebilsin.
- **`corsMiddleware()`** — `corsOrigins` boşsa `cors()` (her origin); doluysa
  `origin` callback ile beyaz liste; `credentials: true`.
- **`generalLimiter`** — `express-rate-limit` ile genel API limiti
  (`config.rateLimit`). `standardHeaders: true`, `legacyHeaders: false`,
  hata gövdesi `{ error, code:'RATE_LIMITED' }`.
- **`authLimiter`** — auth uçları için ayrı sıkı limit (`config.authRateLimit`),
  kaba kuvvet (brute force) saldırılarına karşı.

### `middleware/auth.js`
**Amaç.** JWT üretimi + iki ayrı auth davranışı.

- **`signToken(user)`** — payload `{ id, email, name, plan }`; `config.jwtSecret`
  ile imzalar; ömür `config.jwtExpiresIn` (vars. 7g).
- **`authMiddleware(req, res, next)`** — `Authorization: Bearer …` zorunlu;
  geçerli değilse 401. Doğrulanırsa `req.user` = decoded payload.
- **`optionalAuth(req, _res, next)`** — token varsa `req.user` doldurur;
  yoksa engellemez (misafir akışları için).
- **`getSecret()`** — geriye uyumluluk; içeride `config.jwtSecret` döner.

### `middleware/quota.js`
**Amaç.** `/api/pollen` ve `/api/chat`'e günlük limit uygula.

- **`enforceQuota(resource)`** — `'pollen' | 'chat'` alır; middleware fabrikası.
  - `resolveSubjectAndPlan(req)` ile subject (user/ip) + plan belirler
    (bkz. `utils/billing.js`).
  - `getPlan(planKey).limits[resource]` ile limiti okur (null = sınırsız).
  - `usageService.consume(subject, resource, limit)` ile günlük sayacı atomik artırır.
  - `X-Quota-Plan/Limit/Used` header'larını ekler.
  - `allowed:false` ise HTTP 429 + `{ error, code:'QUOTA_EXCEEDED', resource, plan, limit, used, resetsAt, action: 'register' | 'upgrade' }` döner.
  - Hata yakalanırsa **isteği bloklamadan `next()`** (graceful degradation;
    DB kapalıyken servis tamamen çökmesin).
- `getClientIp` `utils/billing`'ten yeniden dışa aktarılır (geriye uyumluluk).

### `middleware/errorHandler.js`
**Amaç.** 404 + merkezi hata işleyici (Express'in 4 argümanlı imzası).

- **`notFoundHandler(req, res, _next)`** — eşleşmeyen route → 404 +
  `{ error: 'Bulunamadı: METHOD URL', code:'NOT_FOUND' }`.
- **`errorHandler(err, req, res, next)`** —
  - `headersSent` ise Express'in varsayılan handler'ına devret.
  - CORS reddi (`err.message.startsWith('CORS')`) → 403.
  - `statusCode` türetir; geçersizse 500.
  - `isOperational`: `ApiError` instance'ı veya CORS hatası ya da `statusCode < 500`.
  - Beklenmeyen hatalar (programatik) tam stack loglanır; 5xx olanlar sade loglanır.
  - Üretimde 500 detayı kullanıcıya sızdırılmaz (genel "Sunucu hatası" mesajı).
  - Yanıt gövdesi `{ error, code?, ...details? }`.


## routes/

Her route ince controller'dır: istek doğrular ve servis çağırır.

### `routes/auth.js`
- `POST /api/register` (`authLimiter`) — `validateRegister` → `findByEmail`
  (varsa 400) → `createUser` → `signToken` → `{ message, token, user }` (201).
- `POST /api/login` (`authLimiter`) — `validateLogin` → `findByEmail` (yoksa 401) →
  `bcrypt.compare` (yanlışsa 401) → `signToken` → `{ message, token, user }`.
- `GET /api/me` (`authMiddleware`) — `findById(req.user.id)` → `publicUser`.
- `PUT /api/profile` (`authMiddleware`) — `name` (≥2), `avatar`, `allergies` opsiyonel;
  `updateProfile` çağırır.
- `PUT /api/favorites` (`authMiddleware`) — `updateFavorites(id, req.body.favorites)`.
- `DELETE /api/account` (`authMiddleware`) — şifre gönderildiyse `bcrypt.compare`
  doğrular, ardından `deleteUser`.

### `routes/usage.js`
- `GET /api/usage` (`optionalAuth`)
  - `resolveSubjectAndPlan(req)` → subject + planKey + planExpiresAt
  - `usageService.getCounts(subject)` (artırmaz)
  - `fmt(resource, used)` → `{ used, limit, remaining }`
  - Yanıt: `{ plan, planExpiresAt, resetsAt, usage:{pollen, chat} }`

### `routes/membership.js`
Üç eylem + 1 plan bilgisi:
- `GET /plans` — `{ paymentMode, premium:{label,price,currency,days}, limits:{anon,free,premium} }`.
- `POST /checkout` (`authMiddleware`) — `findById` → `payments.createCheckout`
  (sağlayıcı/konfig hatası 500'e dönüştürülür) → `payments` tablosuna `pending`
  kaydı (`pay_<hex>`) → `{ paymentId, ...checkout }`.
- `POST /confirm` (`authMiddleware`) — `payments.verifyPayment` → başarısızsa
  402 ve kaydı `failed` işaretle; başarılıysa kaydı `success` + `provider_ref`,
  `users.setPremium(id, { days: PREMIUM.days })`, güncel kullanıcıyı döner.
- `POST /cancel` (`authMiddleware`) — `users.setFree(id)` ile plan'ı `free`'ye düşür.

### `routes/pollen.js`
- `GET /status` (`authMiddleware`) — `getKeyManagerStatus()` döner (maskeli durum
  bilgisi — anahtarlar tam görünmez).
- `GET /` (`optionalAuth`, `enforceQuota('pollen')`) —
  - `lat`/`lng` zorunlu (yoksa 400).
  - `getPollenData({ lat, lng, days })` (orchestrator) çağrılır.
  - Tüm sağlayıcılar başarısızsa 502.
  - `X-Pollen-Source` header'ı + JSON yanıt.

### `routes/chat.js`
- `POST /` (`optionalAuth`, `enforceQuota('chat')`) —
  - `message` zorunlu string (yoksa 400).
  - `generateChatReply(payload)` (services/chat) çağırılır ve yanıt geri döner.


## services/

### `services/users.js`
Veritabanı arkalı kullanıcı işlemleri + premium yaşam döngüsü.

- **`genId()`** — kısa, yarı-okunaklı ID (`Date.now().toString(36) + 4 byte hex`).
- **`normalizePlan(row)`** — Premium expire olduysa raporlanan plan'ı `'free'`'ye
  düşür (lazy downgrade) — DB yazımı yok, sadece nesne kopyası.
- **`publicUser(row)`** — API'ye dönecek güvenli kullanıcı (şifre yok).
  Çıkış: `{ id, name, email, avatar, allergies, favorites, plan, planExpiresAt }`.
- **`findByEmail(email)`** — lowercased, küçük/büyük harf duyarsız.
- **`findById(id)`** — birincil anahtarla.
- **`createUser({ name, email, password })`** — bcrypt(10) → `INSERT … RETURNING *`.
  Avatar `'👤'`, plan `'free'`, allergies/favorites `'[]'`.
- **`updateProfile(id, { name?, avatar?, allergies? })`** — yalnızca verilen alanları
  dinamik `UPDATE` ile günceller; allergies `JSON.stringify` edilir; yoksa
  `findById` döner.
- **`updateFavorites(id, favorites)`** — `favorites` jsonb sütununu yeniler.
- **`deleteUser(id)`** — `DELETE FROM users WHERE id=$1`.
- **`setPremium(id, { days })`** — mevcut `plan_expires_at` ilerideyse onun
  üstüne ekler, değilse şu andan + `days*86400000` ms; `premium_since` yoksa
  şu an. plan → `'premium'`.
- **`setFree(id)`** — plan='free', `plan_expires_at=NULL`.

### `services/usage.js`
Atomik günlük kota.

- **`nextResetISO()`** — bir sonraki gün başlangıcı (yerel saate göre yaklaşık),
  ISO string. UI "Sıfırlanma" tarihi için.
- **`getCounts(subject)`** — `SELECT pollen_count, chat_count FROM usage_daily
  WHERE subject=$1 AND usage_date=CURRENT_DATE`; yoksa `{0,0}` döner.
- **`consume(subject, resource, limit)`** — kritik fonksiyon:
  1. `limit !== null && limit <= 0` → erişim yok; `{ allowed:false, used, limit, remaining:0 }`.
  2. `INSERT … ON CONFLICT DO NOTHING` ile bugünün satırını garanti et.
  3. **Sınırsızsa (`limit === null`)**: koşulsuz `UPDATE … RETURNING col`.
  4. **Limitli ise**: `UPDATE … WHERE col < $2 RETURNING col`; satır boş dönerse
     `getCounts` ile gerçek değeri oku ve `allowed:false` döner.
  5. Aksi halde `{ allowed:true, used, limit, remaining:max(0,limit-used) }`.

  Bu desen "FOR UPDATE" gerektirmeden yarış koşulsuzdur (PostgreSQL satır kilidi).

### `services/chat.js`
Asistan akışının orchestrator'ı.

- **`tryGroqChat(apiKey, model, systemPrompt, messages)`** — `groq-sdk`'tan bir
  istek (`temperature: 0.4, max_tokens: 512`). İlk choice'in content'ini döner.
- **`gatherContext({ message, lat, lng, locationName })`** — `Promise.allSettled`
  ile **paralel** olarak `retrieveRelevantChunks(message, 3)` ve
  `fetchPollenSummary(...)`. Reject olanlar boş/null olur (sohbeti bloklamaz).
- **`generateChatReply({ message, locationName, lat, lng, userAllergens, history })`**
  - Context topla → `buildSystemPrompt(...)`
  - `toGroqHistory(history)` + `withLanguageLock(message)` ile son mesaj eklendi.
  - **Groq fallback döngüsü**: `getActiveConfig()` ile her (anahtar, model)
    çiftini sırayla dener. 429/401/403'te `markBlocked` ve sıradakine geç.
    Başarılı yanıtta `{ reply, provider:'groq', model }` döner.
  - Tüm kombinasyonlar tükendiyse `ApiError(502, ...)`.


## utils/

### `utils/ApiError.js`
HTTP hataları için tek tip sınıf.
- `new ApiError(statusCode, message, { code?, details? })` — `isOperational=true`
  taşır; merkezi handler bunu kullanıcıya gösterilebilir sayar.
- Statik kısayollar: `ApiError.badRequest`, `unauthorized`, `notFound`.

### `utils/asyncHandler.js`
- **`asyncHandler(fn)`** — async route handler'ı sarar; reddedilen promise'leri
  otomatik `next(err)`'e iletir → merkezi `errorHandler` yakalar. Tekrarlı
  try/catch yazmaktan kurtarır.

### `utils/billing.js`
DRY — quota middleware ve `/api/usage` aynı çözümü kullanır.
- **`getClientIp(req)`** — `X-Forwarded-For`'un ilk değeri, yoksa `req.ip`,
  yoksa socket adresi.
- **`resolveSubjectAndPlan(req)`** —
  - Üye + DB'de varsa: `{ subject:'user:<id>', planKey: normalizePlan(u).plan, planExpiresAt }`.
  - Misafir veya silinmiş kullanıcı: `{ subject:'ip:<ip>', planKey:'anon', planExpiresAt:null }`.

### `utils/validation.js`
Auth uçları için kurallar (boş dizi = geçerli).
- **`isValidEmail(email)`** — basit regex.
- **`validateRegister({name,email,password,passwordConfirm})`** — isim ≥ 2,
  e-posta geçerli, şifre ≥ 6 + harf + rakam, şifre tekrarı eşleşir.
  Türkçe diakritik harfler `[a-zA-ZığüşöçİĞÜŞÖÇ]` regex'ine dahil.
- **`validateLogin({email,password})`** — e-posta geçerli + şifre ≥ 6.


## prompts/

### `prompts/chatPrompt.js`
- **`buildContextBlock(chunks)`** — RAG sonuçlarından "## 📚 İLGİLİ BİLİMSEL
  KAYNAKLAR" bloğu üretir; her chunk için `[n] source (s.page) — benzerlik X.XX`
  ve alıntı metni.
- **`buildPollenBlock(livePollen)`** — anlık polen özet metnini "## 🌱 ANLIK
  POLEN VERİLERİ (bugün)" bloğuna sarar.
- **`buildSystemPrompt({ locationName, userAllergens, chunks, livePollen })`**
  — tam Türkçe sistem promptu (dil kuralı + kimlik + görev + halüsinasyon karşıtı
  kurallar) inşa eder. `userAllergens` virgülle birleşir.
- **`withLanguageLock(message)`** — son kullanıcı mesajının sonuna "Lütfen
  cevabı SADECE TÜRKÇE yaz…" ekler; modelin prompt sonuna verdiği ağırlık
  nedeniyle dil kayması bu sayede minimuma iner.
- **`toGroqHistory(history)`** — frontend'in `{ from:'user'|'bot', text }`
  formatını OpenAI/Groq'un `{ role, content }` formatına çevirir.


## payments/

### `payments/iyzico.js`
Ödeme sağlayıcı soyutlaması. Şu an simülasyon; canlıya geçmek için TODO blokları hazır.
- **`getIyzipayClient()`** — canlı modda `iyzipay` SDK'sını oluştururdu;
  şu an `throw` (yapılandırılmamış uyarısı).
- **`createCheckout({ user, amount, currency })`** —
  - `PAYMENT_MODE === 'iyzico'` ise gerçek SDK çağrısı (TODO blokları yorumlanmış).
  - Simülasyon: `'sim_' + 12 byte hex` token üretir; `{ simulated:true, token, amount, currency, message }`.
- **`verifyPayment({ token })`** —
  - iyzico modu: `iyzipay.checkoutForm.retrieve` (TODO).
  - Simülasyon: token `'sim_'` ile başlıyorsa `{ success:true, providerRef:token }`.


## tools/

### `tools/pollen.js`
Sağlayıcı orchestrator. Google → Open-Meteo.

- **`isGoogleBoycotted()`** — `Date.now() < googleBoycottUntil`.
- **`boycottGoogle(reason)`** — 5 dakika Google boykotu (peş peşe yüzlerce
  başarısız istekte gereksiz iş yapmamak için).
- **`getPollenData({ lat, lng, days = 1 })`** —
  - Koordinat doğrulaması.
  - Boykotta değilse Google'ı dener; UNAUTHORIZED/QUOTA → boykot.
  - Aksi halde Open-Meteo. Başarılı yanıta `_source: 'google' | 'open-meteo'`
    ekler.
- **`fetchPollenSummary({ lat, lng, locationName })`** — `getPollenData` ile
  bugünü çeker, türler ve aktif bitkiler için Türkçe kompakt özet metni
  döner. Chatbot'un sistem promptuna enjekte edilir.

### `tools/pollenProviders/google.js`
- **`class GoogleProviderError`** — `code: 'UNAUTHORIZED' | 'QUOTA' | 'OTHER'`.
- **`callGoogleOnce({ apiKey, lat, lng, days })`** — tek istek;
  HTTP koduna göre uygun `GoogleProviderError` fırlatır.
- **`fetchGooglePollen({ lat, lng, days })`** — `keyManager.totalKeys` kadar
  deneme. Her başarısız anahtarı `markBlocked` eder; tüm anahtarlar bloklu
  olursa `code:'QUOTA'` fırlatır.
- Dışa: `fetchGooglePollen`, `GoogleProviderError`, `getKeyManagerStatus()`.

### `tools/pollenProviders/googleKeyManager.js` (singleton)
- `apiKeys[]`, `currentIndex`, `blocked: Map<key, until>`, `BLOCK_DURATIONS`:
  429→1 saat, 403→24 saat, 401→10 dk, default→5 dk.
- **`getActiveKey()`** — `currentIndex`'ten itibaren bloklu olmayan ilk anahtarı
  bulur; `currentIndex`'i kalıcı olarak günceller (bir sonraki çağrı sıfırdan
  başlamaz).
- **`markBlocked(apiKey, statusCode)`** — uygun süreyle blokla, log bas, aktif
  anahtar buysa bir sonraki indekse ilerle.
- **`allBlocked()`** — tüm anahtarlar şu an bloklu mu?
- **`getStatus()`** — monitoring çıktısı (maskeli).
- **`_mask(key)`** — `XXXXX...YYYY`.

### `tools/pollenProviders/openMeteo.js`
- `POLLEN_VARIABLES`, `PLANT_META`, `TYPE_META`, `CATEGORY_LABELS` —
  Open-Meteo'nun değişken adları + Google API şekline çevirim için Türkçe meta.
- **`grainsToIndex(g)`** — grains/m³'ten 0–5 UPI benzeri indekse dönüşüm.
- **`fetchOpenMeteoPollen({ lat, lng, days = 1 })`** —
  - Saatlik veriyi gün anahtarına böler (`YYYY-MM-DD`).
  - Her gün için her bitkinin **PEAK** (maks) değerini alır.
  - `plantInfo` ve `pollenTypeInfo` (TREE/GRASS/WEED) dizileri inşa eder.
  - Sonuç **Google Pollen API ile aynı şekildedir** → frontend/chatbot tek satır
    değişmeden çalışır.


## groqKeyManager.js (singleton)

Model-öncelikli çoklu (anahtar × model) fallback yöneticisi.
- `apiKeys[]`, `models[]` (vars. `llama-3.3-70b-versatile → llama-4-scout-17b →
  gpt-oss-120b → gpt-oss-20b`), `currentModelIndex`, `currentKeyIndex`,
  `blocked: Map<"model::key", until>`, `blockDurationMs`.
- **`getActiveConfig()`** — model öncelik sırasında her modeli her anahtarla
  dener; bloklanmamış ilk kombinasyonu seçer, indeksleri kalıcı günceller,
  `{ apiKey, model, keyIndex, modelIndex }` döner. Hepsi bloklu → null.
- **`markBlocked(apiKey, model, statusCode)`** — 429: 60s; 401/403: 10dk.
  Aktif anahtarı bir sonrakine ilerletir; modelin tüm anahtarları bloklandıysa
  sonraki modele geçer.
- **`getStatus()`** — `{ totalKeys, totalModels, currentModel, currentKeyIndex,
  blockedCount, totalCombinations }`.
- **`hasAvailableKeys()`** — true/false.


## test/

### `test/users-and-quota.test.js`
`node:test` + `pg-mem`. Her test başında temiz DB kurar (`setupDb()`) ve
`pool.setPoolForTesting(wrapped)` ile enjekte eder. `CURRENT_DATE` literal
'2026-05-26' ile değiştirilir (pg-mem fidelity için; gerçek PG'de zaten aynı
gün boyu sabittir).

Dört test grubu:
- **users — temel CRUD + premium yaşam döngüsü** — createUser email normalize,
  findByEmail case-insensitive, publicUser şifre gizler, updateProfile (jsonb),
  setPremium expire yazımı, expired premium lazy downgrade, setFree.
- **usage.consume — misafir 3 / ücretsiz 10 / premium null + bağımsız sayaçlar**.
- **usage.getCounts — okur, artırmaz**.
- **usage.consume — limit=0** → reddedilir.


---

# Frontend

React 19 + Vite + Tailwind 4 + Recharts + React-Leaflet. State yönetimi 4
Context (Theme/Auth/Usage/Pollen). Yönlendirme yerine **durum tabanlı
görünüm** kullanılır (`PollenContext.currentView = 'dashboard' | 'profile'`)
ve modaller global olaylarla (`auth:unauthorized`, `quota:exceeded`,
`usage:changed`) tetiklenir.

## Frontend giriş

### `src/main.jsx`
- `createRoot(document.getElementById('root')).render(<StrictMode><App/></StrictMode>)`.

### `src/App.jsx`
Sağlayıcı yığını ve modaller:
```
<ThemeProvider>
  <AuthProvider>
    <UsageProvider>
      <PollenProvider>
        <CleanDashboard />
        <MembershipModals />   {/* AuthModal + UpgradeModal + NoticeToast */}
      </PollenProvider>
    </UsageProvider>
  </AuthProvider>
</ThemeProvider>
```

### `src/index.css`
Token tabanlı tema (CSS değişkenleri). Açık/koyu temalar yapısal olarak
**aynı isim**leri kullanır (`--bg-surface`, `--accent-primary`, vb.). Açık
temada sıcak-beyaz yüzeyler, katmanlı sıcak gölgeler, üst-parlaklık inset,
ince film greni dokusu (SVG fractal noise) ve üstten nazik gradient
aydınlanma uygulanır.


## context/

### `context/ThemeContext.jsx`
- **`getInitialTheme()`** — localStorage → sistem `prefers-color-scheme` → 'light'.
- **`ThemeProvider`** —
  - `useState(getInitialTheme)`,
  - Tema değişince `<html data-theme="…">` ayarlar + browser meta `theme-color`'u
    günceller + localStorage'a yazar.
  - `prefers-color-scheme` `change` olayını dinler; kullanıcı manuel set etmemişse
    senkronize eder.
  - **`toggleTheme()`** — toggle.
  - **`setTheme(next)`** — açık/koyu seçim.
- **`useTheme()`** — `{ theme, toggleTheme, setTheme, isDark }`.

### `context/AuthContext.jsx`
- **`AuthProvider`** —
  - `user` ve `loading` state'leri; mount'ta `checkAuth()` çalışır.
  - **`checkAuth()`** — localStorage'da token varsa `getMe()` çağırır, başarısızsa
    token silinir.
  - `auth:unauthorized` (apiClient'tan) olayını dinler → `setUser(null)`.
  - **`loginUser(userData)`** — `setUser(userData)`.
  - **`logoutUser()`** — `apiLogout()` + `setUser(null)`.
  - **`updateUserProfile(data)`** — `apiUpdateProfile(data)` çağırır ve dönen
    `user`'ı state'e yazar.
  - **`updateUserFavorites(favs)`** — `apiUpdateFavorites(favs)` çağırır ve
    state'i `setUser(prev => ({...prev, favorites: data.favorites}))` ile günceller.
  - **`clearUser()`** — localStorage token sil + `setUser(null)`.
- **`useAuth()`** — context değerini döner; provider dışında hata fırlatır.

### `context/UsageContext.jsx`
- **`UsageProvider`** —
  - `usage` state'i (server'dan), `authModal` (`null | 'login' | 'register'`),
    `upgradeOpen` (bool), `notice` (string).
  - `useAuth()` ile `user`'ı izler; her değişimde `refreshUsage()` çağırır.
  - **`refreshUsage()`** — `getUsage()` API'sini çağırır.
  - `usage:changed` olayını 400 ms debounce ile yakalar ve `refreshUsage()`'i tetikler
    (polen/chat sonrası rozetler tazelenir).
  - `quota:exceeded` olayını yakalar; `detail.action === 'upgrade'` → premium modalını,
    aksi halde kayıt modalını açar; `refreshUsage()`'i tetikler.
  - Modal açma/kapama fonksiyonları: `openLogin`, `openRegister`, `closeAuth`,
    `openUpgrade`, `closeUpgrade`, `clearNotice`.
- **`useUsage()`** — provider dışında hata fırlatır.

### `context/PollenContext.jsx`
Konum + alerjen seçimi + canlı polen verisi durumu (büyük context).
- **`initialLocation()`** — localStorage'dan kayıtlı konumu yükle; sabit
  illerden eşleşeni varsa ona düş; yoksa varsayılan İstanbul.
- **`PollenProvider`** —
  - `selectedLocation`, `userAllergens` (localStorage), `showAllPollens`,
    `currentView` (`'dashboard' | 'profile'`), `livePollen`, `pollenLoading`,
    `pollenError`. `requestIdRef` ile yarış koşulu önleme.
  - **`fetchLivePollenFor(lat, lng)`** — `fetchPollen(lat, lng, 1)`'i çağırır;
    sadece SON istek yanıtını uygular. 401/429/diğer hatalar için kullanıcı
    dostu mesaj.
  - `userName/userAvatar` (localStorage) ve setter'ları (`setUserName`, `setUserAvatar`).
  - `pollenData` (`useMemo`) — `livePollen` varsa `adaptLivePollen` ile widget
    şekline; yoksa boş yapı (widget skeleton gösterir).
  - **`updateLocation(location)`** — `setSelectedLocation` + `saveLocation`.
  - **`goHome()`** — `setCurrentView('dashboard')` (konuma dokunmaz).
  - **`updateLocationFromCoords(lat, lng)`** — harita tıklamasından ham
    koordinat; ~5 km içindeyse en yakın şehrin adını kullanır ama koordinatları
    ezmez; `saveLocation` çağırır.
  - `selectedLocation` değiştiğinde `useEffect` → `fetchLivePollenFor` otomatik.
  - **`toggleAllergen(key)`** ve **`setAllergens(list)`** — `userAllergens`
    state'ini + localStorage'ı günceller.
  - Value memoize edilmiş; provider re-render maliyetini azaltır.

## api/

### `src/api/client.js`
Tüm REST çağrılarının ortak fetch sarmalayıcısı.
- **`getToken()`** — localStorage `'token'`.
- **`apiRequest(endpoint, options?)`** —
  - `Authorization: Bearer <token>` ekler (token varsa).
  - JSON yanıtı parse eder; yanıt OK değilse:
    - 401 (login/register dışı) → token sil + `auth:unauthorized` event.
    - 429 + `code === 'QUOTA_EXCEEDED'` → `quota:exceeded` event (detail = yanıt).
    - `throw { status, ...data }`.
- **`login(email, password)`** — `POST /api/login` + token kaydet.
- **`register(name, email, password, passwordConfirm)`** — `POST /api/register` + token kaydet.
- **`getMe()`** — `GET /api/me`.
- **`updateProfile(profileData)`** — `PUT /api/profile`.
- **`updateFavorites(favorites)`** — `PUT /api/favorites`.
- **`deleteAccount(password)`** — `DELETE /api/account` + token sil.
- **`fetchPollen(lat, lng, days = 5)`** — `GET /api/pollen?...`; başarılı yanıtta
  `usage:changed` event yayar (badge tazelensin).
- **`sendChatMessage(message, locationName, lat, lng, userAllergens, history)`**
  — `POST /api/chat`; başarıda `usage:changed` event.
- **`getUsage()`** — `GET /api/usage`.
- **`getPlans()`** — `GET /api/membership/plans`.
- **`startCheckout()`** — `POST /api/membership/checkout`.
- **`confirmMembership(paymentId, token)`** — `POST /api/membership/confirm`.
- **`cancelMembership()`** — `POST /api/membership/cancel`.
- **`logout()`** — yalnızca localStorage token silimi.


## pages/

### `src/pages/CleanDashboard.jsx`
Ana sayfa bileşeni. Yardımcı fonksiyonlar:
- **`getIntensityLevel(value)`** — µg/m³ değerini "Az/Orta/Çok" etiketi + renk.
- **`getSeasonalTip()`** — ay aralığına göre Türkçe mevsimsel tavsiye.
- **`ChartTooltip({ active, payload, label })`** — Recharts için özel tooltip.
- **`HeroSkeleton()`** — hero kart yüklenirken iskelet.
- **`CollapsibleSection({ title, icon, children, defaultOpen })`** — açılabilir
  bölüm; aria-expanded.
- **`CleanDashboard()`** — ana bileşen:
  - `usePollen()` ile state çek.
  - `highestRiskType` (`useMemo`) — kullanıcının takip ettiği polenler arasından
    en yüksek günlük toplama sahip türü bulur.
  - `activeTypes` — "Tümünü göster" durumuna + manuel seçime göre filtrelenmiş tür dizisi.
  - **`togglePollenType(key)`** — efsanede türü ekler/çıkarır (en az bir tane kalır).
  - `getActionSentence()` — risk seviyesine göre kullanıcıya cümle.
  - Profil görünümünde `<DashboardProfilePage onClose=...>` render edilir; aksi
    halde hero + saatlik grafik (Recharts AreaChart) + collapsible (mevsimsel
    ipucu, harita) + alttan `<Chatbot />`.
- **`CityDropdown({ locations, selected, onSelect })`** — header'daki şehir
  açılır listesi; arama + onBlur close.

### `src/pages/RegisterPage.jsx`, `LoginPage.jsx`, `ProfilePage.jsx`,
### `FavoritesPage.jsx`, `DashboardPage.jsx`, `PollenDashboard.jsx`, `PollenPage.jsx`
Eski router tabanlı sayfalar — modal akışına geçildikten sonra **bağlanmış değiller**
(`App.jsx` yalnızca `CleanDashboard` render eder). Repo'da referans/yedek olarak
duruyorlar; bundle'a girmezler.


## components/dashboard/

### `Chatbot.jsx`
Yüzen sohbet FAB + açılır panel.
- `usePollen` ile `selectedLocation` ve `userAllergens`'i alır.
- State: `messages[]`, `input`, `isTyping`, `endRef`, `inputRef`.
- Otomatik kaydırma (`endRef.scrollIntoView`) + input odak yönetimi.
- **`askWith(text)`** — boş/typing değilse mesajı listele, `sendChatMessage`
  ile API'ye gönder, dönen yanıtı baloncuk olarak ekler. Hata yakalanırsa:
  - `err.status === 429 || err.code === 'QUOTA_EXCEEDED'` → kullanıcıya
    "Premium'a geç" veya "kayıt ol" davetli mesaj.
  - Diğer hatalarda genel hata mesajı.

### `MapSelector.jsx`
React-Leaflet ile harita konum seçici. `usePollen.updateLocationFromCoords`
ile entegre — kullanıcı tıkladığı noktanın ham koordinatları konuma yazılır
(snap yok).

### `CitySelector.jsx`, `ForecastPanel.jsx`, `DailySummary.jsx`,
### `DensityChart.jsx`, `HourlyChart.jsx`, `MinimizableCard.jsx`
Eski dashboard widget'ları. `PollenContext.pollenData`'dan beslenir; çoğu
"clean" yeni dashboard sürümünde doğrudan kullanılmıyor.

### `ProfileButton.jsx`
- `usePollen` (alerjen sayısı, avatar) + `useAuth` (kullanıcı adı).
- Tek bir düğme: avatar + label. Giriş yapılmışsa label = `user.name`, değilse
  `'profil'`. Tıklayınca `setCurrentView('profile')`.
- Avatar'da küçük bir rozet alerjen sayısını gösterir.

### `DashboardProfilePage.jsx`
Profil ve alerji ayarları paneli.
- `usePollen` + `useAuth` + `useUsage` (giriş yapmamışsa "Giriş yap" daveti).
- **`handleAvatar(opt)`** — `setUserAvatar(opt)` (yerel) + giriş varsa
  `updateUserProfile({ avatar:opt })` (hesaba kaydet).
- Üst kart "Kişisel Bilgiler":
  - Giriş varsa: avatar + "Hoş geldiniz, [Ad]" + email + plan rozeti +
    **salt-okunur ad alanı** ("hesap kimliği — değiştirilemez" notu) + avatar seçici.
  - Misafir: "Misafir kullanıcı" + "Giriş yap / Kayıt ol" düğmesi.
- Alerji tercihleri kartı: gruplar halinde çoklu seçim (`toggleAllergen`).
- İstatistikler kartı: takip edilen / toplam alerjen.

### `ThemeToggle.jsx`
- `useTheme()` → tema durumunda göre Güneş veya Ay ikonu.
- `aria-pressed`, `title` ile erişilebilir.


## components/membership/

### `AccountMenu.jsx`
Sağ üstte tek dropdown menü.
- `useAuth`, `useUsage`, `usePollen` (görünüm değiştirme).
- **`QuotaRow({ icon, label, info })`** — limit null → "Sınırsız", limit dolu
  → kırmızı, aksi halde "X/Y kaldı".
- Tetikleyici düğme: avatar + isim/`Misafir` + chevron.
- Açılır panel:
  - Kimlik bölümü (büyük avatar + isim + email + plan rozeti).
  - Premium değilse kota satırları + "Kota her gün yenilenir" notu.
  - Aksiyonlar: misafir → Giriş/Kayıt; ücretsiz üye → "Premium'a geç";
    premium → "Premium üyeliğim". Ardından "Profil ve Ayarlar" ve "Çıkış".
- `onBlur` ile menü dışına tıklanınca kapanır.

### `AuthModal.jsx`
Giriş/Kayıt birleşik modal (sekmeli).
- `useUsage.authModal` durumuna göre kendi varlığını kontrol eder.
- **`handleSubmit(e)`** — mod'a göre frontend validation; `apiLogin` veya
  `apiRegister` çağırır. Başarıda `loginUser(data.user)` + `refreshUsage()` +
  `closeAuth()`. Hata mesajı `mb-error` kutusunda gösterilir.

### `UpgradeModal.jsx`
Premium yükseltme akışı.
- **`fmtDate(iso)`** — ISO'yu `tr-TR` "1 Haziran 2026" formatına çevirir.
- `getPlans()` ile fiyat çek; başarısızsa düz varsayılan.
- **`handleUpgrade()`** — `startCheckout()` → `confirmMembership(paymentId, token)` →
  `loginUser(res.user)` (premium artık aktif) + `refreshUsage()` + `setDone(true)`.
- **`handleCancel()`** — `cancelMembership()` → `loginUser(res.user)`.
- Giriş yapılmamış kullanıcıya "Önce giriş yapın" daveti; premium kullanıcıya
  süresi + iptal düğmesi; ücretsiz üyeye plan karşılaştırma + ödeme düğmesi.
- `paymentMode === 'simulate'` olduğunda küçük bir test notu.

### `MembershipBar.jsx` (eski, AccountMenu ile değiştirildi)
Hâlâ depoda olan ama header'a bağlı olmayan sürüm — sağda kota chip + giriş /
çıkış / premium rozeti.

### `HeaderPremiumButton.jsx` (kaldırıldı, AccountMenu içinde)
Eski "sol üst Premium butonu". Şimdi import edilmiyor; AccountMenu'deki
"Premium'a geç" satırı yerine geçti.

### `MembershipModals.jsx`
- **`NoticeToast()`** — `notice` mevcut ve hiçbir modal açık değilse alt
  ortada kısa bir bildirim ve "Kapat" düğmesi.
- **`MembershipModals()`** — `AuthModal`, `UpgradeModal`, `NoticeToast`'u
  birlikte render eder; uygulamanın köküne yerleştirilir.

### `membership.css`
AccountMenu, AuthModal, UpgradeModal'ın tüm görsel kuralları — uygulama
token'larını (`--bg-surface`, `--accent-primary` vb.) kullanır. Hesap menüsü
panel stili (`.acct-panel`), kota satırı (`.acct-quota-row`), eylem (`.acct-action`)
stilleri ve toast (`.mb-notice`) burada.


## data/

### `data/livePollenAdapter.js`
Google/Open-Meteo JSON'unu dashboard widget'larının şekline çevirir (eski
mock generator'ların yerini alır; uydurma veri yok).
- `ALLERGEN_TO_API_CODES` — `cimen|zeytin|pelin|sedir|mese|kayin` →
  Google + Open-Meteo plant kodları eşleşmesi.
- **`indexToRisk(value)`** — 0–5 → `'low' | 'medium' | 'high'`.
- **`findPlantValue(plantInfo, codes)`** — bitkinin indeks değerini bulur.
- **`adaptDailySummary(livePollen)`** — bugünün genel risk seviyesi
  (`pollenTypeInfo`'nun max'ı).
- **`adaptForecast(livePollen)`** — 5 günlük tahmin şeridi verisi (gün adı +
  risk seviyesi).
- **`adaptCategoryDistribution(livePollen)`** — TREE/GRASS/WEED dağılımı
  (donut chart için).
- Ek fonksiyonlar (`adaptHourly`, `adaptAlerts`, `adaptLivePollen`) — saatlik
  veriyi yorumlar, alerjik kullanıcıya özel uyarı/tavsiye listesi üretir.

### `data/mockData.js`, `data/staticReference.js`, `data/turkishProvinces.js`
- `mockData.js` — eski örnek veri (yeni adapter ile artık kullanılmıyor).
- `staticReference.js` — `POLLEN_TYPES`, `RISK_LEVELS`, `ALLERGEN_OPTIONS`
  (grup başlıklı sözlük; profil paneli bundan üretir).
- `turkishProvinces.js` — 81 il + lat/lng + key sözlüğü; CityDropdown bundan
  beslenir.


## Frontend utils

### `utils/constants.js`
- **`API_BASE`** — prod'da boş (Nginx aynı origin'den proxy yapar); dev'de
  `VITE_API_BASE` veya `http://localhost:3001`.
- `MONTHS_TR`, `DAYS_TR`, `UPI_*`, `POLLEN_TYPE_*`, `PLANT_ICONS`,
  `TURKISH_CITIES`, `HOURLY_PATTERN` — UI sabitleri.
- **`translateCategory(cat)`** — İngilizce kategori → Türkçe etiket.
- **`hexToRGBA(hex, a)`** — hex'i `rgba()` string'e çevirir (overlay'ler için).
- **`getCountryName(code)`** — ISO 2 harf → Türkçe ülke adı.
- **`getMaxLevel(dayInfo)`** — bir günün max polen indeksini bulur.

### `utils/locationStorage.js`
- **`isValidLocation(loc)`** — `{ key, name, lat, lng }` şeklini doğrular.
- **`saveLocation(location)`** — sadece taşınabilir alanları yazar; hata sessizce
  yutulur.
- **`loadLocation()`** — JSON parse + şekil doğrulama; bozuksa `clearLocation()`
  çağırıp null döner.
- **`clearLocation()`** — `localStorage.removeItem`.
- Versiyonlu anahtar (`pollen.selectedLocation.v1`) — şema değişiminde eski
  veri yutulur.

### `utils/validators.js`
- **`validateEmail(email)`** — regex.
- **`validateLoginForm(email, password)`** — `{ email?, password? }` hata objesi.
- **`validateRegisterForm(name, email, password, passwordConfirm)`** — aynı
  formatta hata objesi (frontend ile backend kuralları örtüşür).

---

# Eski/yedek bileşenler

Aşağıdaki dosyalar **mevcut akışta kullanılmıyor** ama eski router tabanlı
mimariden kaldıkları için repo'da duruyor. Import edilmedikleri için bundle'a
girmezler.

- `frontend/src/components/Navbar.jsx`, `BottomTabBar.jsx`,
  `ForecastCards.jsx`, `HourlyTimeline.jsx`, `MapModal.jsx`, `Toast.jsx`,
  `PollenResults.jsx`, `ProtectedRoute.jsx`.
- `frontend/src/pages/` altındaki tüm sayfa bileşenleri (CleanDashboard hariç).

Bunlar gelecekte temizlenebilir; şimdilik dokümante etmeye gerek yok çünkü
çalışmayı etkilemiyorlar.

---

Belge sonu.
