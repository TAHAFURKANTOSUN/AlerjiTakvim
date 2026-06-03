# Tasarım Belgesi — Alerji Takip

## 1. Genel mimari
İki bağımsız uygulama + iki yardımcı katman:

```
[ React (Vite)  frontend/ ]  ──HTTPS──▶  [ Express API  backend/ ]
                                                   │
                                                   ├── PostgreSQL (kullanıcı + kota + ödeme)
                                                   ├── Google Pollen API (birincil)  ─┐
                                                   │   Open-Meteo CAMS (fallback)    │  /api/pollen
                                                   ├── Groq SDK (Llama / GPT-OSS)    ─┐
                                                   │   rag/retriever  → vector-store │  /api/chat
                                                   └── iyzico (simüle veya canlı)    ─  /api/membership
```
- **Frontend:** React 19, Context API (Theme/Auth/Usage/Pollen), Recharts (grafik), React-Leaflet (harita).
- **Backend:** Express modüler — `app.js` (uygulama fabrikası, middleware zinciri) + `server.js` (dinleme, graceful shutdown), `routes/`, `services/`, `middleware/`, `utils/`, `payments/`, `db/`, `config/`.
- **Veri:** PostgreSQL (kullanıcı, günlük kota sayaçları, ödemeler) + dosya tabanlı RAG vektör mağazası (`data/vector-store.json`).

## 2. Veri modeli
`backend/db/schema.sql` içinde tam SQL. Üç tablo:

| Tablo | Anahtar alanlar | Amaç |
| --- | --- | --- |
| **users** | id, email (unique), password (bcrypt), name, avatar, allergies (jsonb), favorites (jsonb), plan ('free'\|'premium'), plan_expires_at, premium_since | Hesap kimliği + plan |
| **usage_daily** | (subject, usage_date) PK, pollen_count, chat_count | Günlük sayaç. `subject` = `user:<id>` veya `ip:<addr>`; gün dönünce yeni satır ile sıfırlanır |
| **payments** | id, user_id (FK), amount, currency, status, provider, provider_ref | Ödeme geçmişi (simüle veya iyzico) |

**Planlar** (`backend/config/plans.js`, .env ile override):
- Misafir: 3 polen + 3 chat / gün
- Ücretsiz üye: 10 polen + 5 chat / gün
- Premium: sınırsız (limit = null)

## 3. Ana akışlar

### 3.1 Kimlik & oturum
1. `POST /api/register` → e-posta benzersizliği + bcrypt hash + DB insert.
2. `POST /api/login` → bcrypt compare → JWT (7 gün, `config.jwtSecret`).
3. JWT `Authorization: Bearer <token>` ile her istekte gider.
4. `optionalAuth` (kota uçları için) token varsa `req.user`'ı doldurur; yoksa anonim akış devam.
5. 401 yakalanınca frontend `auth:unauthorized` olayı ile `AuthContext`'i temizler.

### 3.2 Polen verisi + günlük kota
1. Frontend `PollenContext.fetchLivePollenFor(lat,lng)` → `fetchPollen()` → `GET /api/pollen`.
2. `optionalAuth` → `enforceQuota('pollen')` middleware'i:
   - `resolveSubjectAndPlan(req)` ile `user:<id>` veya `ip:<addr>` ve plan belirlenir (`utils/billing.js`).
   - `usageService.consume(subject, 'pollen', limit)` **atomik** iki adımlı upsert ile artırır; limit dolarsa **HTTP 429** + `{ code:'QUOTA_EXCEEDED', action:'register'|'upgrade' }`.
   - `X-Quota-{Plan,Limit,Used}` header'ları frontend rozeti için döner.
3. Handler `getPollenData()` → önce Google Pollen (`tools/pollenProviders/google.js`, anahtar fallback'i), başarısızsa Open-Meteo (`tools/pollenProviders/openMeteo.js`).
4. Frontend `livePollenAdapter` ile veriyi normalize eder, Recharts grafiği + hero kartını günceller.

### 3.3 AI sohbet (RAG destekli)
1. Kullanıcı Chatbot'ta mesaj yazar → `POST /api/chat`.
2. `optionalAuth + enforceQuota('chat')` (yine atomik günlük sayaç).
3. Paralel olarak:
   - `retrieveRelevantChunks(message, k=3)` — vektör arama (HuggingFace embedding).
   - `fetchPollenSummary({lat,lng,locationName})` — anlık polen değerleri (numerik bağlam).
4. Sistem promptu (`routes/chat.js`): Türkçe dil kilidi + kimlik (Polen Asistanı) + alerjen listesi + bilimsel kaynak bloğu + canlı polen bloğu + halüsinasyon karşıtı kurallar.
5. **Groq fallback döngüsü:** `groqKeyManager` (`backend/groqKeyManager.js`) önceliklendirilmiş model/anahtar çiftlerini sırayla dener; 429/401/403'te o çifti bloklar, sıradakine geçer.
6. Yanıt frontend'de baloncuk olarak gösterilir; kota dolarsa Chatbot inline mesajla "Premium'a geç" veya "kayıt ol" davet eder ve global `quota:exceeded` olayı modalı açar.

### 3.4 Premium yükseltme (simüle iyzico)
1. `POST /api/membership/checkout` → `payments/iyzico.createCheckout` (simüle mod token üretir; gerçek modda `iyzipay.checkoutFormInitialize.create`).
2. `payments` tablosuna `pending` kaydı düşülür.
3. `POST /api/membership/confirm` → `verifyPayment` (simüle: token format kontrolü; gerçek: `checkoutForm.retrieve`).
4. Başarılıysa `users.setPremium(id, {days:30})`, ödeme `success` olarak işaretlenir, kullanıcı objesi frontend'e döner.
5. Frontend `AccountMenu` / `UpgradeModal` planı anında günceller.

## 4. Önemli tasarım kararları
- **Atomik kota:** `INSERT … ON CONFLICT DO NOTHING` ardından `UPDATE … WHERE col < limit RETURNING` — yarış koşulsuz, FOR UPDATE'siz, PostgreSQL standart davranışı. Birim test edilebilir (pg-mem'de `CURRENT_DATE`'i sabitleyerek).
- **App / Server ayrımı:** `app.js` sadece kurulum yapar (export edilir, testlerde fonksiyon olarak çağrılabilir); `server.js` dinleme + sinyal yakalama yapar.
- **Merkezi hata yönetimi:** Route'lar `throw new ApiError(...)` der veya `asyncHandler` ile sarmalanır → tek `errorHandler` middleware tutarlı `{ error, code }` döner.
- **Env doğrulama (fail-fast):** `config/env.js` üretimde `JWT_SECRET` zorunlu kılar, fallback gizli anahtar kaldırılmıştır.
- **Lazy DB havuzu:** `db/pool.js` ilk sorguya kadar bağlanmaz → testte `setPoolForTesting()` ile pg-mem enjekte edilebilir.
- **Plan token'da bilgi amaçlı**, kota anında **DB'den doğrulanır** (token bayatlığı premium yükseltmeyi geciktirmesin).
- **Sağlayıcı çoklu fallback:** Hem polen (Google → Open-Meteo) hem AI (Groq anahtar/model matrisi) tek noktadan yönetilir; bir sağlayıcı çökse de uygulama çalışır.
- **Frontend modüler bağlamlar:** Auth/Usage/Pollen ayrı; modaller (`MembershipModals`) global olaylara (`quota:exceeded`, `auth:unauthorized`) tepki verir.
- **Tasarım sistemi:** CSS değişkenleri (sıcak-beyaz yüzey, katmanlı gölge, üst-parlaklık, ince film greni) açık ve koyu temada **eşleşen yapı** ile.
