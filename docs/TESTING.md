# Test Stratejisi

## Yaklaşım
- **Test çatısı:** Node.js'in yerleşik `node:test`'i — ek bağımlılık yok.
- **DB ikamesi:** [`pg-mem`](https://github.com/oguimbal/pg-mem) ile in-process Postgres simülasyonu. CI/dev makinesinde gerçek PostgreSQL gerektirmez.
- **Test edilen:** `services/users` (CRUD + premium yaşam döngüsü) ve `services/usage` (atomik günlük kota — misafir/ücretsiz/premium dahil tüm dallar).
- **Yan etkisiz:** Testler her senaryoda yeni bir pg-mem DB kurar; durum sızıntısı yoktur.

## Çalıştırma
```bash
cd backend
npm install            # devDependencies içinde pg-mem
npm test
```
Beklenen çıktı: `node --test` başarı özetiyle 4 test geçer.

### Tek tek izole testler
```bash
node --test test/users-and-quota.test.js
node --test --test-name-pattern="kota" test/
```

## Kapsam
| Modül | Test edilen davranış |
| --- | --- |
| `services/users` | `createUser` (e-posta normalize), `findByEmail` (case-insensitive), `publicUser` (şifre gizler), `updateProfile` (jsonb allergies), `updateFavorites`, `setPremium` (expiry yazar), `normalizePlan` (lazy downgrade), `setFree` |
| `services/usage` | `consume`: misafir 3 limit, ücretsiz 10 limit, premium null=sınırsız, polen/chat sayaçları bağımsız, limit dolduğunda 429 yolu (`allowed:false`, sayaç limitte tutulur), limit=0 düzgün reddeder; `getCounts` artırmadan okur |

## Kapsam dışı (manuel test)
Aşağıdakiler birim testle değil, manuel/staging ortamında kontrol edilir:
- **Pollen sağlayıcı fallback'i** (Google → Open-Meteo) — gerçek API anahtarları ve ağ erişimi gerektirir.
- **Groq chat akışı** + RAG retriever — gerçek model anahtarı ve `data/vector-store.json` ister; latency testleri için anlamsız olur.
- **iyzico canlı modu** — sandbox/production anahtarları + iyzico karşı uçları.
- **Deployment smoke** — `DEPLOY.md` adımlarını takip eden bir smoke checklist (sağlık ucu, migration, login, premium akışı).

## Yeni test eklerken
1. `backend/test/<konu>.test.js` adlı dosya oluştur.
2. Her test başına `setupDb()` yardımcısı ile temiz bir pg-mem DB kur (örnek: `users-and-quota.test.js`).
3. `pool.setPoolForTesting(...)` ile sahte havuzu enjekte et.
4. Mümkünse SQL'i değiştirmeden test et; pg-mem'in `CURRENT_DATE`'i sabit gün gibi davranmıyor diye gerekiyorsa `wrapped.query` katmanında literal'a "pin"le (mevcut testte örneği var).
