# Git Gizli Deger Temizleme Rehberi

`backend/.env` gercek degerlerle git gecmisine islenmis durumda.
Bu dosya GitHub'da herkese acik oldugundan **tum anahtarlar ele gecmis sayilmali**.

---

## Adim 1 — Tum sirlari HEMEN dondurun (en kritik)

Asagidaki sirlari ilgili panellerden iptal edip yenilerini uretun.
Eski anahtarlar hala calisiyor olsa bile gecmisteki herhangi biri tarafindan kopyalanmis olabilir.

| Sir | Nerede degistirilir |
|-----|---------------------|
| `JWT_SECRET` | Yeni rastgele deger: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `DATABASE_URL` icindeki sifre | PostgreSQL kullanici sifresi (Supabase/Neon paneli ya da `ALTER USER`) |
| `GOOGLE_POLLEN_API_KEY` | Google Cloud Console > APIs & Services > Credentials |
| `GROQ_API_KEYS` (1-4) | console.groq.com > API Keys > Revoke + Create |

Yeni degerleri `backend/.env` dosyasina yazin, uygulamayi yeniden baslatin.

---

## Adim 2 — Dosyayi takipten cikar

```bash
cd AlerjiTakvim          # repo koku

git rm --cached backend/.env backend/data/users.json
git commit -m "chore: stop tracking secrets and user data; add .env.example"
git push
```

`.gitignore` zaten `.env` satirini iceriyor; bu adim dosyayi index'ten cikarip
gelecekteki commit'lerin bunu tekrar izlememesini saglar.

---

## Adim 3 — Gecmisten temizle (push edilmis gecmis)

> Adim 1'i (rotasyon) yaptiktan sonra bu adim ikincil onceliktedir.
> Ancak repo'yu tamamen temizlemek istiyorsaniz asagidaki adimlari izleyin.

### Oneri: git-filter-repo (hizli, guvenli)

```bash
# Yuklu degilse:
pip install git-filter-repo

# .env dosyasini tum gecmisten sil:
git filter-repo --path backend/.env --invert-paths --force
git filter-repo --path backend/data/users.json --invert-paths --force

# Uzak sunucuya zorla gonder:
git push --force --all
git push --force --tags
```

### Alternatif: BFG Repo Cleaner

```bash
# BFG jar'i indirin: https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-files .env
java -jar bfg.jar --delete-files users.json
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force --all
```

---

## Adim 4 — Ekip / isbirligi yapilan herkes

Force-push sonrasi diger gelistiriciler eski gecmisi ceken kopyalara sahipse:

```bash
git fetch origin
git reset --hard origin/main   # ya da ilgili dal
```

Eski klonlarda hala .env gorunuyor olabilir — onlari da temizleyin.

---

## Kontrol

Temizlik sonrasi gecmiste .env kalintilarini arayabilirsiniz:

```bash
git log --all --full-history -- backend/.env
# Hic cikti olmamalidir.

git grep "JWT_SECRET" $(git rev-list --all)
# Hic cikti olmamalidir.
```

