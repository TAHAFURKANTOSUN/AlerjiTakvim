# 🌿 Alerji Takip

**Polen Takip Paneli** — yapay zekâ destekli, Türkiye geneli alerji asistanı.

Tam-yığın web uygulaması: React 19 frontend, Express + PostgreSQL backend,
Groq LLM + RAG sohbet asistanı, Google Pollen API + Open-Meteo otomatik
fallback'i ve iyzico-uyumlu üyelik sistemi.

![Node](https://img.shields.io/badge/node-%E2%89%A518-green)
![PostgreSQL](https://img.shields.io/badge/postgres-%E2%89%A514-blue)
![React](https://img.shields.io/badge/react-19-61dafb)
![Lisans](https://img.shields.io/badge/lisans-MIT-blue)

> ℹ️ Deployment talimatları için ayrı [`DEPLOY.md`](DEPLOY.md) belgesine
> bakın (AWS EC2 + Nginx + PM2 ile yayına alma).

---

## ✨ Özellikler

- **🗺️ Konum-spesifik polen verisi** — 81 il + harita üzerinden serbest konum
  seçimi. Google Pollen API birincil, Open-Meteo CAMS Europe otomatik
  fallback'i (anahtarsız).
- **🤖 AI Polen Asistanı** — Groq (Llama 3.3-70B, Llama-4-Scout, GPT-OSS) +
  RAG destekli sohbet. Bilimsel makale kaynakları + anlık polen verileri
  sistem promptuna canlı enjekte. Türkçe dil kilidi, halüsinasyon karşıtı
  kurallar.
- **📈 Dinamik dashboard** — 24 saatlik Recharts grafiği, 5 günlük tahmin
  şeridi, alerjen-özelinde risk uyarısı, mevsimsel ipucu kartı.
- **🎫 Üç katmanlı üyelik & günlük kota:**

  | Plan      | Polen / gün | Sohbet / gün |
  | --------- | ----------- | ------------ |
  | Misafir   | 3           | 3            |
  | Ücretsiz  | 10          | 5            |
  | Premium   | sınırsız    | sınırsız     |

- **💳 iyzico ödeme entegrasyonu** — simüle modda hazır; canlıya tek `.env`
  ayarıyla geçilir.
- **🌙 Açık + koyu tema** — token tabanlı, iki tema yapısal olarak eşleşir.
- **🔒 Güvenlik** — bcrypt + JWT (7 gün), helmet, rate-limit, CORS allowlist,
  env doğrulama (fail-fast), PostgreSQL TLS desteği.

---

## 🧱 Teknoloji yığını

| Katman      | Teknoloji                                          |
| ----------- | -------------------------------------------------- |
| Frontend    | React 19, Vite, Recharts, React-Leaflet, Tailwind 4 |
| Backend     | Node ≥18, Express, helmet, express-rate-limit      |
| Auth        | bcryptjs, jsonwebtoken                             |
| Veritabanı  | PostgreSQL (`pg` pool)                             |
| AI / RAG    | groq-sdk, HuggingFace embedding, vector-store.json |
| Polen       | Google Pollen API + Open-Meteo CAMS Europe         |
| Ödeme       | iyzipay (opsiyonel)                                |
| Test        | node:test + pg-mem                                 |
| DevOps      | PM2, Nginx                                         |

---

## 🚀 Hızlı başlangıç (yerel geliştirme)

> Üretim için: [`DEPLOY.md`](DEPLOY.md).

### Önkoşullar
- Node.js ≥ 18
- PostgreSQL ≥ 14 (yerel veya yönetilen — Supabase, Neon, AWS RDS vb.)
- (Opsiyonel) Google Pollen API anahtarı — yoksa Open-Meteo'ya düşer
- (Opsiyonel) Groq API anahtar(lar)ı — sohbet için zorunlu

### 1. Repoyu klonla
```bash
git clone https://github.com/TAHAFURKANTOSUN/AlerjiTakvim.git
cd AlerjiTakvim
```

### 2. Veritabanı hazırla
```bash
createdb alerjitakvim
# veya pgAdmin / DBeaver üzerinden boş bir DB oluştur
```

### 3. Backend
```bash
cd backend
cp .env.example .env        # ardından .env'yi düzenle (aşağıya bak)
npm install
npm run migrate             # 3 tabloyu oluşturur (users, usage_daily, payments)
npm start                   # http://localhost:3001
```

**`backend/.env` zorunlu alanlar:**
```env
JWT_SECRET=cok-uzun-rastgele-bir-string-en-az-16-karakter
DATABASE_URL=postgres://kullanici:sifre@localhost:5432/alerjitakvim

# AI sohbet için (opsiyonel ama önerilen):
GROQ_API_KEYS=gsk_birinci,gsk_ikinci,gsk_ucuncu

# Polen verisi için (opsiyonel — yoksa Open-Meteo kullanılır):
POLLEN_API_KEYS=AIza_birinci,AIza_ikinci

# Premium ödeme:
PAYMENT_MODE=simulate         # 'simulate' (test) veya 'iyzico' (canlı)
```

Tam ayarlar için [`backend/.env.example`](backend/.env.example).

### 4. Frontend (ayrı terminal)
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Uygulamayı tarayıcıda Vite'ın verdiği adreste açın.

### 5. Sağlık kontrolü
```bash
curl http://localhost:3001/api/health
# → {"status":"ok","database":true}
```

---

## 📜 API uçları

| Yöntem  | URL                              | Açıklama                       | Auth |
| ------- | -------------------------------- | ------------------------------ | ---- |
| GET     | `/`                              | Servis bilgisi                 | —    |
| GET     | `/api/health`                    | Sağlık kontrolü (DB ping)      | —    |
| POST    | `/api/register`                  | Kayıt                          | —    |
| POST    | `/api/login`                     | Giriş                          | —    |
| GET     | `/api/me`                        | Oturum sahibi                  | ✅   |
| PUT     | `/api/profile`                   | Profil güncelle                | ✅   |
| PUT     | `/api/favorites`                 | Favoriler                      | ✅   |
| DELETE  | `/api/account`                   | Hesap sil                      | ✅   |
| GET     | `/api/usage`                     | Plan + günlük kullanım         | ⚪   |
| GET     | `/api/membership/plans`          | Plan + fiyat                   | —    |
| POST    | `/api/membership/checkout`       | Ödeme başlat                   | ✅   |
| POST    | `/api/membership/confirm`        | Ödemeyi doğrula → premium      | ✅   |
| POST    | `/api/membership/cancel`         | Premium iptal                  | ✅   |
| GET     | `/api/pollen?lat&lng&days`       | Polen verisi (kotalı)          | ⚪   |
| GET     | `/api/pollen/status`             | Anahtar yönetimi durumu        | ✅   |
| POST    | `/api/chat`                      | AI sohbet (kotalı)             | ⚪   |

⚪ opsiyonel — token varsa üye akışı, yoksa misafir akışı.

**Kota dolduğunda yanıt** (HTTP 429):
```json
{
  "error": "Günlük hakkınız doldu...",
  "code": "QUOTA_EXCEEDED",
  "resource": "chat",
  "plan": "free",
  "limit": 5,
  "used": 5,
  "action": "upgrade"
}
```

---

## 📁 Proje yapısı

```
alerji-takvim/
├── backend/
│   ├── server.js              # giriş noktası (dinleme + graceful shutdown)
│   ├── app.js                 # Express uygulama fabrikası
│   ├── config/                # env doğrulama, plan limitleri
│   ├── db/                    # pg pool (TLS destekli), schema.sql, migrate
│   ├── middleware/            # security, auth, quota, errorHandler
│   ├── routes/                # auth, usage, membership, pollen, chat
│   ├── services/              # users, usage (atomik kota), chat
│   ├── utils/                 # ApiError, asyncHandler, validation, billing
│   ├── prompts/               # AI sistem promptu kurucusu
│   ├── payments/              # iyzico (simüle ↔ canlı)
│   ├── tools/                 # polen orchestrator + sağlayıcılar
│   ├── groqKeyManager.js      # Groq anahtar/model fallback matrisi
│   └── test/                  # node:test + pg-mem
├── frontend/
│   ├── src/
│   │   ├── main.jsx · App.jsx
│   │   ├── pages/CleanDashboard.jsx
│   │   ├── context/           # Theme, Auth, Usage, Pollen
│   │   ├── components/dashboard/   # Chatbot, MapSelector, ...
│   │   ├── components/membership/  # AccountMenu, AuthModal, UpgradeModal
│   │   ├── api/client.js      # tek fetch sarmalayıcısı
│   │   └── index.css          # token tabanlı tema
│   └── public/favicon.svg
├── rag/                       # bilimsel makaleler için RAG retriever
├── data/                      # vector-store.json (RAG vektör mağaza)
├── deploy/                    # nginx örnek konfig
├── docs/                      # detaylı belgeler (aşağıya bak)
├── DEPLOY.md
└── ecosystem.config.cjs       # PM2 konfigürasyonu
```

---

## 🧪 Test

```bash
cd backend
npm test                       # node:test + pg-mem (gerçek Postgres gerekmez)
```

**4 test, 4 geçti** — kullanıcı CRUD + premium yaşam döngüsü + atomik kota
(misafir/ücretsiz/premium + bağımsız sayaçlar + limit=0 edge case).

---

## 🛡️ Güvenlik

- Şifreler **bcrypt** (salt rounds = 10).
- JWT **7 gün**; sır `config/env.js`'ten gelir, **üretimde zorunlu** (yoksa
  açılış durur).
- **helmet** güvenlik header'ları + **express-rate-limit** (genel + auth özel).
- **CORS allowlist** — prod'da `CORS_ORIGINS` boşsa uyarı basılır.
- **app.set('trust proxy', N)** — X-Forwarded-For sahteciliğine karşı sınırlı.
- Tüm AI ve harici API anahtarları yalnızca sunucuda (`.env`); istemciye sızmaz.
- **PostgreSQL TLS** — yönetilen sağlayıcılar için tam sertifika doğrulaması
  (MITM koruması):
  ```env
  DATABASE_SSL=true
  DATABASE_CA_CERT=/path/to/ca.pem   # sağlayıcı özel CA kullanıyorsa
  ```

---

## 🎨 Tasarım sistemi

Token tabanlı; açık ve koyu temalar aynı CSS değişken isimlerini kullanır:

- **Birincil sage** `#5F8A48` (açık) · `#9CC281` (koyu)
- **Sıcak beyaz yüzeyler** `#FFFDF7` (klinik `#FFFFFF` değil)
- **Katmanlı sıcak-tonlu gölgeler** + üst-parlaklık inset
- **Üstten nazik gradient aydınlanma** + ince film greni dokusu (SVG fractal noise)
- **Inter** fontu, -0.006em letter-spacing

---

## 🗺️ Yol haritası

- [ ] E-posta doğrulama (kayıt sonrası onay maili)
- [ ] Şifre sıfırlama (token ile reset link)
- [ ] Hesaba bağlı alerjen senkronizasyonu (şu an localStorage'da)
- [ ] Push bildirim (yüksek riskli günlerde uyarı)
- [ ] Premium yıllık plan (mevcut: aylık)
- [ ] Admin paneli
- [ ] E2E testler (Playwright)
- [ ] PWA desteği (offline cache + ana ekrana ekleme)

---

## 📚 Belgeler

| Dosya | İçerik |
| --- | --- |
| [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) | Gereksinim → kod eşlemesi (6/6 ✓) |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Mimari + veri modeli + akışlar + tasarım kararları |
| [`docs/TESTING.md`](docs/TESTING.md) | Test stratejisi ve çalıştırma talimatları |
| [`docs/PROJECT_REPORT.md`](docs/PROJECT_REPORT.md) | Kapsamlı proje raporu |
| [`docs/PROJE_ANALIZ_RAPORU.pdf`](docs/PROJE_ANALIZ_RAPORU.pdf) | Sunulabilir PDF rapor |
| [`docs/KOD_DOKUMANTASYONU.md`](docs/KOD_DOKUMANTASYONU.md) | Her dosya, her fonksiyon |
| [`docs/TEMEL_KOD_REHBERI.md`](docs/TEMEL_KOD_REHBERI.md) | Çekirdek dosyalar için kısa rehber |
| [`docs/AlerjiTakip_Sunum.pptx`](docs/AlerjiTakip_Sunum.pptx) | Sunum (14 slayt) |
| [`DEPLOY.md`](DEPLOY.md) | AWS EC2 + Nginx + PM2 deployment |

---

## 📊 İstatistikler

- **16** REST endpoint
- **3** veritabanı tablosu (`users`, `usage_daily`, `payments`)
- **4 / 4** otomatik test geçti
- **2** polen sağlayıcı fallback (Google → Open-Meteo)
- **4** AI modeli (anahtar × model matrisi)
- **81** Türkiye ili

---

## 📄 Lisans

MIT — Detay için `LICENSE` dosyasına bakın.

---

## 🙏 Katkı

PR'lar memnuniyetle karşılanır. Büyük değişiklikler için önce bir issue açın.
Kod stiline ve testlere bağlı kalın.
