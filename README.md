# Alerji Takvim — Deployment Rehberi

AWS EC2 (Ubuntu 22.04+) üzerinde Nginx + PM2 ile yayına alma.

## 0. Sunucu hazırlığı (tek seferlik)

```bash
# Sistem güncelle
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Nginx + git + build araçları
sudo apt install -y nginx git build-essential

# PM2 global
sudo npm install -g pm2

# Node sürümünü doğrula
node -v   # v20.x
npm -v
nginx -v
pm2 -v
```

## 1. Projeyi sunucuya çek

```bash
# Standart konum
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/<kullanıcı>/alerji-takvim.git
sudo chown -R $USER:$USER /var/www/alerji-takvim
cd /var/www/alerji-takvim
```

## 2. Backend kurulum

```bash
cd /var/www/alerji-takvim/backend
npm install --omit=dev      # sadece prod bağımlılıkları
```

`.env` dosyasını oluştur (`.env.example` referans alınarak):

```bash
nano /var/www/alerji-takvim/backend/.env
```

İçeriği:

```ini
# Auth
JWT_SECRET=<openssl rand -hex 32 ile üret>
PORT=3001

# Google Pollen API — çoklu anahtar fallback
POLLEN_API_KEYS=birinci,ikinci

# Groq LLM — virgülle ayır
GROQ_API_KEYS=birinci,ikinci
GROQ_MODELS=llama-3.3-70b-versatile,meta-llama/llama-4-scout-17b-16e-instruct,openai/gpt-oss-120b,openai/gpt-oss-20b
```

Yetkileri kıs:

```bash
chmod 600 /var/www/alerji-takvim/backend/.env
```

### RAG vector index (chatbot için)

```bash
cd /var/www/alerji-takvim
node rag/build-index.js   # ~280 vektör, 2.4MB JSON
```

## 3. PM2 ile backend'i başlat

```bash
cd /var/www/alerji-takvim
mkdir -p logs

# Production modda başlat
pm2 start ecosystem.config.cjs --env production

# Boot'ta otomatik başlama
pm2 startup           # verdiği "sudo env PATH=... pm2 startup" komutunu çalıştır
pm2 save              # mevcut süreçleri kaydet

# Doğrula
pm2 status
pm2 logs alerji-takvim-backend --lines 30
```

Beklenen çıktı:
```
🌿 Alerji Takip Backend çalışıyor: http://localhost:3001
   Pollen Sağlayıcıları:
     • Google Pollen API: ✅ 2 anahtar yüklü (aktif: #1)
     • Open-Meteo (CAMS Europe): ✅ Hazır
```

## 4. Frontend build

```bash
cd /var/www/alerji-takvim/frontend
npm install
npm run build         # → dist/ klasörü oluşur
ls -lh dist/          # index.html + assets/
```

## 5. Nginx konfigürasyonu

Site config'i kopyala:

```bash
sudo cp /var/www/alerji-takvim/deploy/nginx/alerji-takvim.conf \
        /etc/nginx/sites-available/alerji-takvim
```

Domain'i ve yolu düzenle:

```bash
sudo nano /etc/nginx/sites-available/alerji-takvim
# server_name → kendi domain'in
# root → /var/www/alerji-takvim/frontend/dist  (zaten doğru)
```

Aktive et:

```bash
sudo ln -s /etc/nginx/sites-available/alerji-takvim /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Syntax kontrolü
sudo nginx -t

# Yeniden yükle
sudo systemctl reload nginx
```

Test et:

```bash
# Aynı sunucudan
curl -I http://localhost/
curl http://localhost/api/pollen?lat=41.01\&lng=28.97\&days=1 | head

# Dışarıdan (domain hazırsa)
curl -I http://alerji-takvim.com/
```

## 6. HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d alerji-takvim.com -d www.alerji-takvim.com

# Otomatik yenileme test
sudo certbot renew --dry-run
```

Certbot Nginx config'ini otomatik 443'e çevirir, HTTP→HTTPS redirect ekler.

## 7. Güvenlik duvarı

```bash
sudo ufw allow 'OpenSSH'
sudo ufw allow 'Nginx Full'   # 80 + 443
sudo ufw enable
sudo ufw status
```

**Önemli:** Backend portu 3001 dışarıya AÇIK olmamalı. UFW default deny olduğu için zaten kapalı, ama ekstra güvenlik için Nginx config'inde sadece `127.0.0.1:3001`'i dinliyor — direkt erişim mümkün değil.

## 8. Yeni deploy (subsequent updates)

```bash
cd /var/www/alerji-takvim
git pull

# Backend güncellendiyse
cd backend && npm install --omit=dev && cd ..
pm2 reload alerji-takvim-backend     # zero-downtime

# Frontend güncellendiyse
cd frontend && npm install && npm run build && cd ..
sudo systemctl reload nginx          # opsiyonel — dist/ değişti, cache reload
```

## 9. İzleme & debug

```bash
# Backend canlı log
pm2 logs alerji-takvim-backend

# Backend metrics
pm2 monit

# Nginx erişim log
sudo tail -f /var/log/nginx/alerji-takvim.access.log

# Nginx hata log
sudo tail -f /var/log/nginx/alerji-takvim.error.log

# Pollen anahtar durumu (token gerekli)
curl -H "Authorization: Bearer <token>" http://localhost/api/pollen/status
```

## 10. Yedekleme

Önemli dosyalar:
- `/var/www/alerji-takvim/backend/.env` — gizli anahtarlar
- `/var/www/alerji-takvim/backend/data/users.json` — kullanıcı veritabanı
- `/var/www/alerji-takvim/data/vector-store.json` — RAG vektörleri (yeniden üretilebilir)

```bash
# Cron ile günlük yedek
0 3 * * * tar -czf /home/ubuntu/backups/alerji-$(date +\%F).tar.gz \
  /var/www/alerji-takvim/backend/.env \
  /var/www/alerji-takvim/backend/data/
```

---

## Sorun giderme

| Belirti | Nedenler |
|---|---|
| Frontend yükleniyor ama `/api` 502 | PM2 down → `pm2 status`, `pm2 logs` |
| `/api` 404 | Nginx `location /api/` yok, syntax hatası → `sudo nginx -t` |
| React Router refresh'te 404 | `try_files $uri /index.html` eksik → site config'e bak |
| Pollen "veri yok" | `.env` `POLLEN_API_KEYS` boş veya ikisi de kotada → `/api/pollen/status` |
| Chatbot Türkçe çıkmıyor | Groq model değişti → log'a bak; `GROQ_MODELS` listesini kontrol et |
| 502 Bad Gateway | Backend port yanlış → `ecosystem.config.cjs` `PORT` ↔ Nginx `proxy_pass` aynı mı |
