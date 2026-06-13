# Güvenlik Denetimi ve Optimizasyon Raporu

**Tarih:** 2026-06-10
**Kapsam:** backend (Express/PostgreSQL) + frontend (React) — auth, SQL, girdi doğrulama, sırlar, CORS, kota, ödeme, hata sızıntısı, XSS, prompt injection.

---

## 1. Özet

| Önem | Bulgu | Durum |
|------|-------|-------|
| 🔴 KRİTİK | `.env` gerçek sırlarla git'te izleniyor (6 commit) | ⚠️ Manuel adım gerekli |
| 🟠 YÜKSEK | X-Forwarded-For ile IP kota atlatma | ✅ Düzeltildi |
| 🟡 ORTA | Hesap silme şifre olmadan yapılabiliyor | ✅ Düzeltildi |
| 🟡 ORTA | Chatbot girdileri sınırsız (DoS / token maliyeti) | ✅ Düzeltildi |
| 🟡 ORTA | Profil/favori payload'ı sınırsız (DB şişmesi) | ✅ Düzeltildi |
| 🔵 DÜŞÜK | JWT doğrulamada algoritma sabitlenmemiş | ✅ Düzeltildi (sertleştirme) |
| 🔵 DÜŞÜK | CORS boş listede tüm origin'lere açık | 📋 Raporlandı |
| 🔵 DÜŞÜK | Ödeme `/confirm` sahiplik doğrulaması yok | 📋 Raporlandı |
| 🔵 DÜŞÜK | `DATABASE_SSL` sertifika doğrulaması kapalı | 📋 Raporlandı |
| 🔵 DÜŞÜK | Zayıf parola politikası (6 karakter) | 📋 Raporlandı |

SQL enjeksiyonu (tüm sorgular parametrize), XSS (React auto-escape, `dangerouslySetInnerHTML` yok) ve hata sızıntısı (prod'da 500 detayı gizli) açısından **temiz**.

---

## 2. Düzeltilen Açıklar

### 🟠 YÜKSEK — X-Forwarded-For ile kota atlatma
**Dosya:** `backend/utils/billing.js`
Misafir kotası (anon polen/chat) istemci IP'sine göre sayılıyordu. `getClientIp`, istemcinin gönderdiği ham `X-Forwarded-For` başlığının ilk değerini kullanıyordu. Bir saldırgan her istekte farklı bir XFF değeri yollayarak **kotayı sınırsız atlatabiliyordu**.
**Çözüm:** Ham başlık okuması kaldırıldı; Express'in `trust proxy` ayarıyla güvenli biçimde hesapladığı `req.ip` kullanılıyor.
**Test:** Farklı sahte XFF + aynı `req.ip` → aynı subject (atlatma engellendi). ✅

### 🟡 ORTA — Hesap silme şifre olmadan
**Dosya:** `backend/routes/auth.js` (`DELETE /account`)
Şifre doğrulaması "gönderildiyse" yapılıyordu; şifre gönderilmezse geçerli token ile hesap **şifresiz siliniyordu** (çalınmış token ile yıkıcı işlem riski).
**Çözüm:** Şifre artık zorunlu; yanlış/eksik şifrede silme reddediliyor. (Frontend zaten şifre gönderiyor — kırılma yok.)

### 🟡 ORTA — Chatbot girdileri sınırsız
**Dosya:** `backend/routes/chat.js`
`message`, `history`, `userAllergens` doğrudan API'ye sınırsız boyutta gönderilebiliyordu (curl/script ile istemci JS'i atlanarak). Dev payload → Groq token maliyeti/işlem süresi şişirme (DoS).
**Çözüm:** Sunucu tarafı sınırlar — mesaj 2000 krk, geçmiş son 10 tur × 2000 krk, alerjen 30 × 60 krk; geçersiz tipler güvenli biçime indirgeniyor.
**Test:** 500 mesaj → 10; 5000 krk → 2000; 200 alerjen → 30. ✅

### 🟡 ORTA — Profil/favori payload sınırsız
**Dosya:** `backend/routes/auth.js` (`PUT /profile`, `PUT /favorites`)
**Çözüm:** İsim ≤60, avatar ≤16, alerjiler ≤50, favoriler ≤100; tip kontrolleri eklendi.

### 🔵 DÜŞÜK (sertleştirme) — JWT algoritma sabitleme
**Dosya:** `backend/middleware/auth.js`
`jwt.verify` algoritma kısıtı olmadan çağrılıyordu. Algoritma-karıştırma / `alg:none` saldırı yüzeyini kapatmak için doğrulama `{ algorithms: ['HS256'] }` ile sabitlendi.
**Test:** Geçerli HS256 kabul; `alg:none` token reddedildi. ✅

---

## 3. Raporlanan (karar sizde — otomatik değiştirilmedi)

- **CORS boş listede her origin'e açık** (`middleware/security.js`): `CORS_ORIGINS` boşken `cors()` tüm origin'leri yansıtır. Token Authorization header'da taşındığı için CSRF riski düşük, ama **prod'da `CORS_ORIGINS` mutlaka tanımlanmalı** (config zaten uyarıyor).
- **Ödeme `/confirm` sahiplik doğrulaması yok** (`routes/membership.js`): `paymentId`'nin isteği yapan kullanıcıya ait olduğu ve token ile eşleştiği doğrulanmıyor. Simülasyon modunda zararsız; **gerçek iyzico'ya geçmeden önce** sahiplik + token eşleşmesi eklenmeli.
- **`DATABASE_SSL` sertifika doğrulaması kapalı** (`db/pool.js`): `rejectUnauthorized:false` MITM'e açık. Yönetilen Postgres'te sağlayıcı CA sertifikası tanımlanmalı.
- **Zayıf parola politikası** (`utils/validation.js`): 6 karakter + 1 harf + 1 rakam. En az 8–10 karakter önerilir.
- **Token localStorage'da**: XSS durumunda çalınabilir (tasarım tercihi). XSS yüzeyi şu an temiz; httpOnly cookie alternatifi düşünülebilir.

---

## 4. 🔴 KRİTİK — Sızan Sırlar (ACİL, manuel adım)

`backend/.env` **gerçek değerlerle** git geçmişine işlenmiş (6 commit): `JWT_SECRET`, `DATABASE_URL` (DB şifresi), Google Pollen API anahtarı ve **4 Groq API anahtarı**. Repo GitHub'da (`TAHAFURKANTOSUN/AlerjiTakvim`) olduğundan bu sırlar ele geçmiş kabul edilmeli.

> Not: `.git` dizini bu oturumda kilitli olduğundan git komutlarını ben çalıştıramadım. Aşağıdaki adımları siz uygulamalısınız. Maskeli `backend/.env.example` şablonunu sizin için oluşturdum; çalışan `.env` dosyanıza dokunulmadı.

**Adım 1 — Tüm sırları HEMEN döndürün (en kritik):**
- `JWT_SECRET` → yeni rastgele değer (mevcut tüm oturumlar geçersiz olur, beklenen)
- PostgreSQL kullanıcı şifresi → değiştir
- Google Pollen API anahtarı → Google Cloud Console'dan iptal et + yeni üret
- 4 Groq anahtarı → Groq Console'dan iptal et + yeni üret

**Adım 2 — Dosyayı takipten çıkar:**
```bash
git rm --cached backend/.env backend/data/users.json
git commit -m "chore: stop tracking secrets; add .env.example"
```
(`.gitignore` zaten `.env`'i kapsıyor — sorun, dosyanın kural eklenmeden önce işlenmiş olması.)

**Adım 3 — Sırları geçmişten temizle (push edilmiş geçmiş):**
```bash
# git-filter-repo (önerilen):
git filter-repo --path backend/.env --invert-paths
git push --force --all
```
Yeni anahtarları (Adım 1) ürettiyseniz geçmiş temizliği ikincil önceliktedir; **rotasyon esastır.**

---

## 5. Optimizasyonlar

**Backend**
- **Polen TTL önbelleği** (`tools/pollen.js`): ~1 km'ye yuvarlanmış koordinat + gün anahtarıyla 10 dk'lık bellek içi önbellek. Aynı şehirden ardışık istekler tek dış çağrıyla yanıtlanıyor → gecikme ve **Google kotası tüketimi** belirgin düşüş. (Test: yakın koordinatlar önbellekten, fetch sayısı 3→2.)
- RAG tembel + korumalı yükleme ve Groq çoklu-anahtar (önceki turda) korunuyor.

**Frontend**
- `Chatbot.jsx`: `allergenNames` artık `useMemo` ile yalnızca alerjen/seçenek değişince hesaplanıyor (her tuş vuruşundaki render'da boşa çalışmıyor).

**Kod temizliği**
- Ölü dosyalar silindi: `backend/_t.js` (boş), `backend/_tmp_test_chat.js` (geçici).
- Boş eski `backend/data/users.json` takipten çıkarılması Adım 2'ye dahil.

---

## 6. Doğrulama
- Mevcut test paketi (`npm test`): **4/4 geçti** (regresyon yok).
- Davranış testleri: XFF düzeltmesi, polen önbelleği, JWT `alg:none` reddi, chat sanitizer sınırları — **hepsi PASS**.
- Tüm değişen modüller syntax doğrulandı.
