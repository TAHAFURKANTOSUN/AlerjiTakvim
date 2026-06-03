# Alerji Takip — Proje Raporu

**Proje:** Alerji Takip (Polen Takip Paneli)
**Tür:** Tam-yığın web uygulaması (React + Express + PostgreSQL + AI/RAG)
**Belge sürümü:** 1.0
**Yaşam döngüsü aşaması:** Geliştirme tamamlandı · birim test geçti · deployment hazır

---

## 1. Yönetici özeti

Alerji Takip, polen alerjisi olan kullanıcıların **bulundukları konuma özel**, **anlık ve tahmini polen yoğunluğunu** takip etmesini sağlayan, **AI destekli bir sohbet asistanı** sunan tam-yığın bir web uygulamasıdır. Türkiye'nin tüm illerini kapsar; harita üzerinden serbest konum seçimi, 24 saatlik saatlik grafik, 5 günlük tahmin ve alerjen-özelinde risk uyarısı sağlar.

Uygulama; **misafir** (girişsiz, sınırlı kullanım), **ücretsiz üye** (günlük kota) ve **premium üye** (sınırsız) olarak üç katmanlı bir üyelik modeline sahiptir. Ödeme entegrasyonu **iyzico** üzerine kurulmuştur (şu anda simülasyon modunda; canlıya geçiş tek `.env` ayarıyla yapılabilir).

---

## 2. Çözülen problem

Polen alerjisi olan kullanıcılar için mevcut alternatifler ya yabancı dil ağırlıklı, ya hava durumu içinde gömülü, ya da bilimsel referansı zayıf bilgilerle gelir. Bu proje üç boşluğu doldurur:

1. **Türkiye-yerel + alerjen-özelinde** anlık polen verisi (Google Pollen API → Open-Meteo CAMS fallback).
2. **Halüsinasyon karşıtı, kaynaklı** bir asistan (RAG: yerel bilimsel makaleler vektör mağazasından).
3. **Erişilebilir günlük kullanım** modeli (misafir bile kısıtlı şekilde deneyebilir; premium gerçek kullanıcılar için).

---

## 3. Teknoloji yığını

| Katman | Teknoloji | Sürüm | Rolü |
| --- | --- | --- | --- |
| Frontend | React | 19.2 | UI bileşen ağacı |
| Frontend | Vite | 8.0 (rolldown) | Geliştirme + üretim derleme |
| Frontend | React Router DOM | 7.13 | (Şu an durum-tabanlı görünüm; ileride yönlendirme için hazır) |
| Frontend | Recharts | 3.8 | Saatlik polen grafiği |
| Frontend | React-Leaflet + Leaflet | 5.0 / 1.9 | Konum seçim haritası |
| Frontend | Tailwind CSS | 4.2 | Utility CSS (CSS değişkenleri ile token tabanlı tema) |
| Backend | Node.js | ≥ 18 | Çalışma zamanı |
| Backend | Express | 4.21 | REST API çatısı |
| Backend | helmet | 7.2 | Güvenlik header'ları |
| Backend | express-rate-limit | 7.5 | Genel hız sınırı |
| Backend | jsonwebtoken | 9.0 | Oturum (JWT 7g) |
| Backend | bcryptjs | 2.4 | Şifre hash |
| Veritabanı | PostgreSQL | ≥ 14 | Üyelik + kota + ödeme |
| AI | groq-sdk | 1.1 | LLM çağrıları (Llama, GPT-OSS) |
| AI | @huggingface/transformers (dolaylı) | — | Embedding (vektör mağaza inşası) |
| Ödeme | iyzipay (opsiyonel) | — | Canlı modda gerçek ödeme |
| Test | node:test + pg-mem | yerleşik / 3.0 | Birim + entegrasyon testleri |
| DevOps | PM2 + Nginx | — | Süreç yönetimi + reverse proxy |

---

## 4. Yüksek seviye mimari

```
            ┌──────────────────────────────┐
            │  React (Vite)  · frontend/   │
            │   - Context: Theme/Auth/     │
            │     Usage/Pollen             │
            │   - Bileşen: CleanDashboard, │
            │     Chatbot, AccountMenu,    │
            │     UpgradeModal, AuthModal  │
            └──────────────┬───────────────┘
                           │  /api/...  (JSON over HTTPS)
                           ▼
            ┌──────────────────────────────┐
            │ Express API  · backend/      │
            │                              │
            │  güvenlik → JSON parse →     │
            │  sağlık → rate-limit →       │
            │  auth/usage/membership/      │
            │  pollen/chat → 404 → hata    │
            └──┬───────┬───────┬───────┬───┘
               │       │       │       │
               ▼       ▼       ▼       ▼
        ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐
        │Postgres │ │ Google  │ │ Groq    │ │ iyzico   │
        │ users,  │ │ Pollen  │ │ LLM(s)  │ │ (canlı   │
        │ usage,  │ │  API    │ │   +     │ │  opsiyon)│
        │payments │ │  ─OR─   │ │ RAG     │ │          │
        │         │ │OpenMeteo│ │ vektör  │ │          │
        └─────────┘ └─────────┘ │ store   │ └──────────┘
                                └─────────┘
```

### 4.1 Backend modüler yapısı

```
backend/
├── app.js                 # Express uygulama fabrikası (kurulum + middleware zinciri)
├── server.js              # Dinleme + graceful shutdown (SIGTERM/SIGINT)
├── config/
│   ├── env.js             # Merkezi env doğrulama (fail-fast)
│   └── plans.js           # Plan limitleri + premium fiyat
├── db/
│   ├── pool.js            # Lazy pg havuzu (test enjeksiyon destekli)
│   ├── schema.sql         # 3 tablo: users, usage_daily, payments
│   └── migrate.js         # Şema uygulama + eski users.json içe aktarımı
├── middleware/
│   ├── auth.js            # signToken + authMiddleware + optionalAuth
│   ├── quota.js           # enforceQuota('pollen'|'chat')
│   ├── security.js        # helmet + CORS + rate-limit
│   └── errorHandler.js    # 404 + merkezi error handler
├── routes/
│   ├── auth.js            # /api/register, /login, /me, /profile, /favorites, /account
│   ├── usage.js           # /api/usage
│   ├── membership.js      # /api/membership/{plans,checkout,confirm,cancel}
│   ├── pollen.js          # /api/pollen + /api/pollen/status
│   └── chat.js            # /api/chat (Groq + RAG + canlı polen bağlamı)
├── services/
│   ├── users.js           # DB-arkalı kullanıcı + premium yaşam döngüsü
│   └── usage.js           # Atomik günlük kota tüketimi
├── utils/
│   ├── ApiError.js        # HTTP hata sınıfı
│   ├── asyncHandler.js    # Promise sarmalayıcı (try/catch tekrarını yok eder)
│   ├── validation.js      # Kayıt/giriş kuralları
│   └── billing.js         # subject + planKey çözümü, IP çıkarımı
├── payments/
│   └── iyzico.js          # createCheckout/verifyPayment (simüle ↔ canlı)
├── tools/
│   ├── pollen.js          # Sağlayıcı orchestrator (Google → Open-Meteo)
│   └── pollenProviders/
│       ├── google.js      # Anahtar yöneticili Google Pollen API
│       └── openMeteo.js   # CAMS Europe fallback (anahtarsız)
├── groqKeyManager.js      # Çoklu Groq anahtarı + model fallback matrisi
└── test/
    └── users-and-quota.test.js
```

### 4.2 Frontend yapısı (özet)

```
frontend/src/
├── main.jsx · App.jsx
├── pages/CleanDashboard.jsx         # Ana sayfa: hero + grafik + harita
├── context/
│   ├── ThemeContext · AuthContext · UsageContext · PollenContext
├── components/
│   ├── dashboard/  (Chatbot, ProfileButton, ThemeToggle, MapSelector,
│   │                ForecastPanel, DailySummary, ...)
│   └── membership/ (AccountMenu, AuthModal, UpgradeModal,
│                    MembershipModals, membership.css)
├── api/client.js                    # apiRequest + 401/429 olay yönetimi
└── index.css                        # Tema token'ları (açık + koyu)
```

---

## 5. Özellikler

### 5.1 Kullanıcı yönetimi
- **Kayıt** (`POST /api/register`): İsim, e-posta, şifre + tekrar; backend ve frontend'te aynı kurallar (isim ≥ 2, geçerli e-posta, şifre ≥ 6, harf+rakam içerir, eşleşme).
- **Giriş** (`POST /api/login`): bcrypt karşılaştırma; başarılıysa JWT (7 gün).
- **Profil** (`GET /api/me`, `PUT /api/profile`): isim (read-only kimlik olarak), avatar (kişiselleştirme), alerjenler.
- **Çıkış**: token istemcide silinir + `AuthContext.logoutUser`.
- **Hesap silme** (`DELETE /api/account`): şifre doğrulamalı.

### 5.2 Üyelik & kota
Günlük sıfırlanan üç katmanlı kota:

| Plan | Polen / gün | Sohbet / gün |
| --- | --- | --- |
| Misafir (IP bazlı) | 3 | 3 |
| Ücretsiz üye | 10 | 5 |
| Premium | sınırsız | sınırsız |

- Kota dolunca **HTTP 429** + `{ code: 'QUOTA_EXCEEDED', action: 'register' | 'upgrade' }`.
- Frontend bu olayı yakalayıp uygun modalı açar (misafire kayıt, ücretsiz üyeye premium).
- `X-Quota-{Plan,Limit,Used}` header'ları her isteğe iliştirilir (rozet için).

### 5.3 AI sohbet asistanı (RAG destekli, Türkçe)
`POST /api/chat`:
1. `optionalAuth` + `enforceQuota('chat')` ile kota uygulanır.
2. **Paralel** olarak: RAG retriever (k=3 en alakalı bilimsel parça) + canlı polen özeti.
3. Sistem promptu kurar: **dil kilidi (sadece Türkçe)**, alerjen listesi, bilimsel kaynaklar, anlık polen değerleri, halüsinasyon karşıtı kurallar (numerik veriye dayan, kaynak yoksa "verim yok" de).
4. **Groq fallback matrisi**: model öncelik sırasına göre her modeli her anahtarla dener; 429/401/403'te o çifti süre bazlı bloklar (1s/24s/10dk), sıradakine geçer.

### 5.4 Polen verisi
`GET /api/pollen?lat&lng&days`:
1. Google Pollen API (çoklu anahtar fallback).
2. Anahtarlar tükenirse / 403 alırsa otomatik **Open-Meteo CAMS Europe** (anahtarsız, son çare).
3. Yanıt `X-Pollen-Source` header'ı ile hangi sağlayıcıdan geldiğini söyler.

### 5.5 Dinamik dashboard
- **Hardcoded veri YOK**; tüm değerler API'den gelir.
- **Hero kartı**: risk seviyesi (Düşük/Orta/Yüksek), aksiyon cümlesi, alerjen-özelinde polen değerleri, 5 günlük tahmin şeridi, tavsiye listesi.
- **Saatlik grafik**: Recharts `AreaChart`, gradient dolgulu, tıklanabilir efsane ile tür filtreleme, en riskli polen türünü varsayılan olarak gösterir.
- **Harita** (Leaflet): Serbest konum seçimi (en yakın şehre snap olmadan ham koordinat).
- **Profil paneli**: Kimlik kartı (Hoş geldiniz + e-posta + plan rozeti), alerjen seçimi, istatistikler.

### 5.6 Premium yükseltme (iyzico-uyumlu)
- `GET /api/membership/plans`: plan bilgisi + fiyat.
- `POST /api/membership/checkout`: simüle modda token üretir; canlı modda iyzico `checkoutFormInitialize.create` çağrısı (TODO bloklarıyla iskelet hazır).
- `POST /api/membership/confirm`: `payments` tablosunda `success` işaretler, kullanıcı planını 30 gün premium yapar.
- `POST /api/membership/cancel`: premium iptali.

### 5.7 Tasarım sistemi
- **Token tabanlı tema** (CSS değişkenleri): yüzeyler, kenarlıklar, accent (sage), risk renkleri, gölgeler.
- **Açık tema**: sıcak-beyaz (`#fffdf7`) yüzeyler, katmanlı sıcak-tonlu gölgeler, üst-parlaklık inset, ince film greni dokusu, üstten nazik aydınlanma gradyanı.
- **Koyu tema**: orman gecesi yeşili, eşleşen yapısal token'lar.
- **Tipografi**: Inter, -0.006em letter-spacing, `cv11 ss01` stilistik setler.
- **Hesap menüsü**: tek dropdown'da kimlik + kota + premium + ayarlar + çıkış.

---

## 6. Veri modeli

```sql
-- backend/db/schema.sql
users (
  id            TEXT PK,
  name, email (UNIQUE), password (bcrypt),
  avatar, allergies (jsonb), favorites (jsonb),
  plan ('free'|'premium'), plan_expires_at, premium_since,
  created_at
)

usage_daily (
  subject TEXT,           -- 'user:<id>' veya 'ip:<addr>'
  usage_date DATE,        -- CURRENT_DATE
  pollen_count, chat_count,
  PRIMARY KEY (subject, usage_date)
)

payments (
  id TEXT PK, user_id FK, amount, currency,
  status ('pending'|'success'|'failed'),
  provider ('simulated'|'iyzico'), provider_ref, created_at
)
```

**Atomik kota algoritması** (`services/usage.consume`):
```sql
-- 1) Bugünün satırını garanti et
INSERT INTO usage_daily(subject, usage_date) VALUES ($1, CURRENT_DATE)
ON CONFLICT (subject, usage_date) DO NOTHING;

-- 2) Yalnızca limit altındaysa artır (atomik, satır kilidi)
UPDATE usage_daily SET <col> = <col> + 1
WHERE subject = $1 AND usage_date = CURRENT_DATE AND <col> < $2
RETURNING <col> AS used;
```
- Sıfır satır dönerse → kota dolu, 429.
- Aksi takdirde → izinli, sayaç güncel.
- Yarış koşulsuz; FOR UPDATE gerekmez.

---

## 7. Önemli tasarım kararları

| Karar | Gerekçe |
| --- | --- |
| **App / Server ayrımı** (`app.js` = fabrika, `server.js` = dinleme) | Test edilebilirlik; `app`'i fonksiyon olarak çağırıp HTTP açmadan test edebilirsiniz. |
| **Lazy DB havuzu + `setPoolForTesting`** | Birim testte gerçek Postgres gerektirmeden pg-mem enjekte edilebilir. |
| **Atomik kota (FOR UPDATE'siz)** | İki ifadeli desen (ON CONFLICT DO NOTHING + koşullu UPDATE) hem PG'de hem pg-mem'de doğrulanabilir, yarış koşulsuz. |
| **Merkezi `errorHandler` + `ApiError` + `asyncHandler`** | Route'larda tekrarlı try/catch yok; tutarlı `{ error, code }` yanıt biçimi. |
| **`config/env.js` fail-fast** | Prod'da `JWT_SECRET` zorunlu; eski `fallback-secret-key` güvenlik açığı kaldırıldı. |
| **Plan token'da bilgi, doğrulama DB'den** | Token 7 gün; premium yükseltme bayatlamasın. |
| **Çoklu sağlayıcı fallback** (polen ve AI) | Tek sağlayıcı çöktüğünde sistem ayakta kalır. |
| **Frontend olay tabanlı orkestrasyon** (`auth:unauthorized`, `quota:exceeded`, `usage:changed`) | Bağlamlar gevşek bağlı; modal/toast koordinasyonu tek noktadan. |
| **Token tabanlı tema sistemi** | Açık/koyu temanın yapısal eşleşmesi; tek tema değiştirme = tüm bileşenler. |
| **`favorites`/`allergies` JSONB** | Şema esnekliği; ayrı join tablolarına ihtiyaç olmadan zenginleştirilebilir. |

---

## 8. Güvenlik

- **Şifre**: bcrypt, salt 10.
- **JWT**: 7 gün; sır `config.jwtSecret` (prod'da zorunlu).
- **HTTP başlıkları**: helmet (`security.js`).
- **CORS**: allowlist tabanlı.
- **Rate-limit**: `express-rate-limit` ile genel `/api` kotası (kötü niyetli trafik için ek katman; iş kotasından bağımsız).
- **AI anahtarları sunucuda**: Groq + Google Pollen anahtarları yalnızca backend `.env`'de; istemciye sızmaz.
- **`trust proxy` doğru ayar** (varsayılan 1 hop) — X-Forwarded-For sahtelemesine karşı.
- **Şifre değişiminde tekrar şifre soran hesap silme**.

---

## 9. Test stratejisi

`backend/test/users-and-quota.test.js` — node:test + pg-mem (in-process Postgres). **4 test, 4 geçti.**

| Test | Doğrulanan |
| --- | --- |
| `users — temel CRUD ve premium yaşam döngüsü` | createUser e-posta normalize, findByEmail case-insensitive, publicUser şifre gizler, updateProfile (jsonb), setPremium + lazy downgrade, setFree |
| `usage.consume — misafir/ücretsiz/premium + bağımsız sayaçlar` | 3/10/null limit dalları; polen-chat ayrı sayaç; limit dolduğunda 429 yolu |
| `usage.getCounts — günlük sayaçları okur (artırmaz)` | Okuma yan etkisi yok |
| `usage.consume — limit=0` | Erişim yok yolunda düzgün reddetme |

Çalıştırma:
```bash
cd backend && npm install && npm test
```

Manuel kapsam dışı: gerçek polen API'leri, gerçek Groq, gerçek iyzico, deployment smoke — bunlar staging ortamında doğrulanır (`docs/TESTING.md`).

---

## 10. Deployment

`DEPLOY.md` + `ecosystem.config.cjs` + `deploy/nginx/` ile süreç:

1. **Sunucu hazırlığı**: Node ≥ 18, PostgreSQL ≥ 14, Nginx.
2. **`.env` doldur**: `JWT_SECRET` (rastgele uzun), `DATABASE_URL`, `POLLEN_API_KEYS`, `GROQ_API_KEYS`, `PAYMENT_MODE`.
3. **Migration**: `cd backend && npm run migrate`.
4. **Süreç yönetimi**: `pm2 start ecosystem.config.cjs` (graceful shutdown destekli).
5. **Nginx**: `deploy/nginx/` örnek konfig; `/` için frontend `dist`, `/api` için 3001 portuna proxy.
6. **Sağlık**: `GET /api/health` → `{ status:'ok', database:true }` beklenir.

---

## 11. Geliştirme yaşam döngüsü (WDLC) izleri

| Aşama | Çıktı |
| --- | --- |
| **Gereksinim analizi** | `docs/REQUIREMENTS.md` (zorunlu gereksinim → kod eşlemesi) |
| **Tasarım** | `docs/DESIGN.md` (katmanlar, ana akışlar, kararlar) |
| **Geliştirme** | Git geçmişi + modüler kaynak ağacı (bkz. §4) |
| **Test** | `backend/test/`, `docs/TESTING.md` |
| **Deployment** | `DEPLOY.md`, `ecosystem.config.cjs`, `deploy/nginx/` |

---

## 12. Gelecek geliştirmeler

- **E-posta doğrulama** (kayıt sonrası onay maili — şu an doğrulama yok).
- **Şifre sıfırlama** akışı (token ile reset link).
- **Alerjen senkronizasyonu**: Şu an alerjen listesi `PollenContext` localStorage'da; hesaba bağlı hâle getirilebilir (`/api/profile` zaten allergies kabul ediyor; frontend bağı kurulacak).
- **Push bildirim** (servis çalışanı): yüksek riskli günlerde uyarı.
- **Premium çoklu fiyat planı** (aylık/yıllık).
- **Yönetici paneli** (admin role'ü) — kullanıcı/ödeme görünümü.
- **Test kapsamını genişletmek**: route entegrasyonu (supertest), frontend kritik akışlar (Playwright).
- **Localization**: İngilizce arayüz (şu an Türkçe + Türkçe sistem promptu).
- **PWA**: offline cache + ana ekrana ekleme.
- **Observability**: yapısal log + metric (Prometheus) + APM.

---

## 13. Sonuç

Alerji Takip, küçük bir niş probleme (Türkiye'de polen takibi) **modern, profesyonel** bir yaklaşım sunar: token tabanlı temalı bir React arayüzü, modüler bir Express backend, atomik kotalı PostgreSQL veri katmanı, halüsinasyon karşıtı RAG sohbet asistanı ve canlıya geçişe hazır iyzico iskelet. Sınırlı kapsamı içinde **üretim kalitesi** (güvenlik header'ları, env doğrulama, merkezi hata yönetimi, otomatik testler, graceful shutdown, çoklu sağlayıcı fallback) gözetilmiştir.

Belge sonu.
