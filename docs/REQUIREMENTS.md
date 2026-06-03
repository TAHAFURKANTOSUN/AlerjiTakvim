# Gereksinim Analizi — Alerji Takip

Bu belge, projenin zorunlu teknik gereksinimlerini kod tabanındaki gerçek
karşılıklarına eşler. Her madde için **durum** ve **referans dosya/uç** verilir.

## 1. React Kullanımı  · ✅
- Frontend tamamen React 19 (Vite + React Hooks + Context).
- Giriş noktası: `frontend/src/main.jsx`, ana bileşen `frontend/src/App.jsx`.
- Sağlayıcılar: `ThemeProvider · AuthProvider · UsageProvider · PollenProvider`.
- Yönlendirme yerine durum tabanlı görünüm (`PollenContext.currentView`) ve modal yaklaşımı kullanılır.

## 2. Kullanıcı Yönetimi  · ✅
| Gereksinim | Karşılık |
| --- | --- |
| Kayıt (register) | `POST /api/register` → `backend/routes/auth.js` · `services/users.createUser` |
| Giriş (login) | `POST /api/login` → `services/users.findByEmail` + `bcrypt.compare` |
| Çıkış (logout) | `frontend/src/api/client.js logout()` + `AuthContext.logoutUser` (token silinir, durum sıfırlanır) |
| Profil oku | `GET /api/me` (zorunlu auth) |
| Form validasyonu | **Frontend:** `frontend/src/components/membership/AuthModal.jsx` (e-posta regex, şifre uzunluğu, isim min., şifre eşleşmesi) · **Backend:** `backend/utils/validation.js` (aynı kurallar) |

JWT 7 günlük, sırrı `config/env.js` ile yönetilir (üretimde zorunlu).

## 3. AI Araç Entegrasyonu  · ✅  (kullanıcının ana akışında)
- **Özellik:** "Polen Asistanı" sohbet botu (RAG destekli soru-cevap).
- **Sağlayıcı:** Groq (`groq-sdk`) — model öncelik sırası `llama-3.3-70b-versatile → llama-4-scout → gpt-oss` (anahtar/model fallback'i `backend/groqKeyManager.js`).
- **Server-side çağrı:** `POST /api/chat` → `backend/routes/chat.js`. AI yalnızca sunucudan çağrılır; anahtarlar frontend'e sızmaz.
- **Dinamik yansıma:** `frontend/src/components/dashboard/Chatbot.jsx` mesajı `sendChatMessage` ile gönderir, yanıtı anında baloncuk olarak gösterir.
- **RAG katmanı:** `rag/retriever.js` + `data/vector-store.json` (HuggingFace embedding ile inşa edilen vektör mağaza); bilimsel makalelerden ilgili parçalar bilgi promptuna enjekte edilir.
- **Bağlam zenginleştirme:** Konum + alerjen + canlı polen verisi prompt'a iliştirilir; sıkı bir Türkçe-dil kilidi ile dil kayması önlenir.
- **Kota:** `optionalAuth + enforceQuota('chat')` middleware'i ile günlük limit (anonim 3 / ücretsiz 5 / premium sınırsız).

## 4. Dinamik Dashboard  · ✅
- Bileşen: `frontend/src/pages/CleanDashboard.jsx`.
- **Hardcoded veri YOK**; tüm veriler API'den çekilir:
  - Polen verisi: `GET /api/pollen?lat&lng&days` → Google Pollen API → otomatik Open-Meteo (CAMS Europe) fallback'i (`backend/routes/pollen.js` + `tools/pollenProviders/`).
  - Plan ve günlük kota: `GET /api/usage` → `UsageContext` 'usage:changed' olaylarında otomatik tazelenir.
- **Grafik:** Recharts `AreaChart` ile 24 saatlik polen yoğunluğu (gradient dolgulu, alerjen-spesifik), tıklanabilir efsane ile tür filtreleme.
- **Ek dinamik öğeler:** 5 günlük tahmin şeridi, en riskli alerjen kartı, alerjen-özelinde tavsiye listesi, mevsimsel ipucu, harita (Leaflet).
- **Profil paneli:** Hesap kimliği + plan rozeti + alerjen seçimi.

## 5. Back-End Gereksinimleri  · ✅
| Alt madde | Karşılık |
| --- | --- |
| REST API | Express, `backend/app.js` (uygulama fabrikası) + `backend/server.js` (dinleme + graceful shutdown) |
| Veritabanı | **PostgreSQL** (MongoDB "önerilir" not zorunlu); `pg` pool · `backend/db/pool.js`; şema `backend/db/schema.sql`; migration `npm run migrate` |
| En az 3 endpoint | **16 endpoint** mevcut: `/api/register · /login · /me · /profile · /favorites · /account` (auth) · `/api/usage` · `/api/membership/plans · /checkout · /confirm · /cancel` · `/api/pollen` · `/api/pollen/status` · `/api/chat` · `/` (kök) · `/api/health` |
| AI server-side | `routes/chat.js` Groq çağrılarını yalnızca sunucudan yapar; anahtarlar `.env` içinde |

Ek profesyonel yapı taşları:
- Merkezi hata yönetimi: `middleware/errorHandler.js` + `utils/ApiError` + `utils/asyncHandler` (tekrarlı try/catch yok).
- Güvenlik: `middleware/security.js` (CORS allowlist, rate-limit, güvenlik header'ları).
- Doğrulama: `utils/validation.js` (kayıt/giriş kuralları tek yerde).
- Env doğrulama (fail-fast): `config/env.js` (üretimde `JWT_SECRET` zorunlu).
- Kota: `middleware/quota.js` + `services/usage.js` (atomik upsert + günlük sıfırlama).

## 6. Web Geliştirme Yaşam Döngüsü  · ✅
| Aşama | Belge / Çıktı |
| --- | --- |
| Gereksinim analizi | **Bu belge** (`docs/REQUIREMENTS.md`) |
| Tasarım | `docs/DESIGN.md` — mimari, veri modeli, akışlar |
| Geliştirme | Kaynak kod (`backend/`, `frontend/`, `rag/`) + Git geçmişi |
| Test | `docs/TESTING.md` + `backend/test/` (node:test + pg-mem); `npm test` |
| Deployment | `DEPLOY.md` (proje kökü), `ecosystem.config.cjs` (PM2), `deploy/nginx/` |
