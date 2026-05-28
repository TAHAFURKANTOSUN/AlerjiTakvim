// ============================================================
// Migration — şemayı uygular ve (varsa) eski users.json'u içe aktarır.
// Çalıştırma:  cd backend && node db/migrate.js
// ============================================================

const fs = require('fs');
const path = require('path');
const { getPool } = require('./pool');

async function migrate() {
    const pool = getPool();
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

    console.log('[DB] Şema uygulanıyor...');
    await pool.query(schema);
    console.log('[DB] ✅ Tablolar hazır (users, usage_daily, payments).');

    // ── Eski users.json'u tek seferlik içe aktar ──
    const legacyPath = path.join(__dirname, '..', 'data', 'users.json');
    if (fs.existsSync(legacyPath)) {
        try {
            const raw = fs.readFileSync(legacyPath, 'utf8').trim();
            if (raw) {
                const legacyUsers = JSON.parse(raw);
                let imported = 0;
                for (const u of legacyUsers) {
                    if (!u.email || !u.password) continue;
                    const res = await pool.query(
                        `INSERT INTO users (id, name, email, password, avatar, allergies, favorites, plan, created_at)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, 'free', COALESCE($8::timestamptz, now()))
                         ON CONFLICT (email) DO NOTHING`,
                        [
                            u.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)),
                            u.name || 'Kullanıcı',
                            String(u.email).toLowerCase(),
                            u.password,
                            u.avatar || '👤',
                            JSON.stringify(u.allergies || []),
                            JSON.stringify(u.favorites || []),
                            u.createdAt || null,
                        ]
                    );
                    imported += res.rowCount;
                }
                if (imported > 0) {
                    console.log(`[DB] ${imported} eski kullanıcı users.json'dan içe aktarıldı.`);
                }
            }
        } catch (e) {
            console.warn('[DB] users.json içe aktarılamadı (atlanıyor):', e.message);
        }
    }

    await pool.end();
    console.log('[DB] Migration tamamlandı.');
}

migrate().catch((err) => {
    console.error('[DB] ❌ Migration hatası:', err.message);
    process.exit(1);
});
