// ============================================================
// Birim + entegrasyon testleri — node:test + pg-mem
// ------------------------------------------------------------
// Çalıştırma:  cd backend && npm test
//
// Hedef: Üyelik servisi (CRUD + premium yaşam döngüsü) ve günlük
// kota mantığını gerçek bir DB sunucusu olmadan doğrulamak.
// pg-mem `CURRENT_DATE`'i alt-saniyelik bir timestamp olarak
// değerlendirdiği için tarihi sabit bir literal'a "pin"liyoruz —
// gerçek PostgreSQL davranışını birebir yansıtır.
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { newDb } = require('pg-mem');
const pool = require('../db/pool');
const users = require('../services/users');
const usage = require('../services/usage');

const PINNED_DATE = '2026-05-26';

function setupDb() {
    const db = newDb();
    db.public.none(fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));
    const pg = db.adapters.createPg();
    const real = new pg.Pool();
    // pg-mem CURRENT_DATE → sabit gün; gerçek PG'de zaten günde sabit.
    const wrapped = {
        query: (text, params) =>
            real.query(typeof text === 'string' ? text.replace(/CURRENT_DATE/g, `'${PINNED_DATE}'`) : text, params),
    };
    pool.setPoolForTesting(wrapped);
    return real;
}

// ── KULLANICI SERVİSİ ──────────────────────────────────────────
test('users — temel CRUD ve premium yaşam döngüsü', async () => {
    setupDb();

    const created = await users.createUser({ name: 'Ali', email: 'Ali@Test.com', password: 'abc123' });
    assert.equal(created.email, 'ali@test.com', 'e-posta küçük harfe normalize edilir');
    assert.equal(created.plan, 'free', 'yeni kullanıcı varsayılan free');

    const byEmail = await users.findByEmail('ALI@TEST.COM');
    assert.equal(byEmail.id, created.id, 'findByEmail büyük/küçük harf duyarsız');

    const pub = users.publicUser(byEmail);
    assert.equal(pub.password, undefined, 'publicUser şifreyi gizler');
    assert.deepEqual(pub.allergies, [], 'allergies dizisi olarak döner');

    const up = await users.updateProfile(created.id, { name: 'Ali Veli', allergies: ['cimen'] });
    assert.equal(up.name, 'Ali Veli');
    assert.deepEqual(up.allergies, ['cimen']);

    const fav = await users.updateFavorites(created.id, [{ key: 'istanbul' }]);
    assert.equal(users.publicUser(fav).favorites.length, 1);

    const prem = await users.setPremium(created.id, { days: 30 });
    assert.equal(prem.plan, 'premium');
    assert.ok(prem.plan_expires_at, 'premium expiry tarihi yazılır');

    // Süresi dolan premium otomatik free olarak raporlanır (lazy downgrade)
    await pool.query('UPDATE users SET plan_expires_at = $2 WHERE id = $1',
        [created.id, new Date(Date.now() - 86_400_000)]);
    const expired = await users.findById(created.id);
    assert.equal(users.normalizePlan(expired).plan, 'free', 'süresi geçen premium → free');

    const free = await users.setFree(created.id);
    assert.equal(free.plan, 'free', 'setFree planı sıfırlar');
});

// ── KOTA SERVİSİ ───────────────────────────────────────────────
test('usage.consume — misafir 3 / ücretsiz 10 / premium sınırsız + bağımsız sayaçlar', async () => {
    setupDb();

    // Misafir günde 3 polen sorgusu
    const anon = 'ip:1.2.3.4';
    for (let i = 1; i <= 3; i++) {
        const r = await usage.consume(anon, 'pollen', 3);
        assert.equal(r.allowed, true, `anon polen #${i} izinli`);
        assert.equal(r.used, i, `anon polen sayacı #${i}`);
    }
    const blocked = await usage.consume(anon, 'pollen', 3);
    assert.equal(blocked.allowed, false, 'anon polen #4 reddedilir');
    assert.equal(blocked.used, 3, 'sayaç limitte tutulur (artmaz)');

    // Chat sayacı polen'den bağımsız
    const chat1 = await usage.consume(anon, 'chat', 3);
    assert.equal(chat1.allowed, true);
    assert.equal(chat1.used, 1, 'chat sayacı polen sayacından ayrı');

    // Ücretsiz üye: 10 polen sınırı
    const user = 'user:abc';
    for (let i = 1; i <= 10; i++) await usage.consume(user, 'pollen', 10);
    const tenth = await usage.consume(user, 'pollen', 10);
    assert.equal(tenth.allowed, false, '11. polen reddedilir');

    // Premium: sınırsız (limit = null)
    let r;
    for (let i = 1; i <= 25; i++) r = await usage.consume('user:premium', 'chat', null);
    assert.equal(r.allowed, true, 'premium 25. mesaj hâlâ izinli');
    assert.equal(r.remaining, null, 'premium remaining = null (sınırsız)');
});

test('usage.getCounts — günlük sayaçları okur (artırmaz)', async () => {
    setupDb();
    const subj = 'ip:9.9.9.9';
    await usage.consume(subj, 'pollen', 5);
    await usage.consume(subj, 'pollen', 5);
    await usage.consume(subj, 'chat', 5);

    const counts = await usage.getCounts(subj);
    assert.equal(counts.pollen_count, 2);
    assert.equal(counts.chat_count, 1);

    // Tekrar okumak sayacı değiştirmemeli
    await usage.getCounts(subj);
    const counts2 = await usage.getCounts(subj);
    assert.equal(counts2.pollen_count, 2);
});

test('usage.consume — limit = 0 (erişim yok) düzgün reddedilir', async () => {
    setupDb();
    const r = await usage.consume('ip:blocked', 'chat', 0);
    assert.equal(r.allowed, false);
    assert.equal(r.remaining, 0);
});
