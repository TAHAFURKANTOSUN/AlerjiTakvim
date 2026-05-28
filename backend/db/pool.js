// ============================================================
// PostgreSQL bağlantı havuzu
// Bağlantı .env içindeki DATABASE_URL ile yapılır:
//   DATABASE_URL=postgres://kullanici:sifre@localhost:5432/alerjitakvim
// Yönetilen bir Postgres (SSL isteyen) kullanıyorsanız: DATABASE_SSL=true
// ============================================================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

let _pool = null;

function buildPool() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.warn('[DB] ⚠️  DATABASE_URL tanımlı değil — PostgreSQL bağlantısı kurulamayacak. backend/.env dosyasını kontrol edin.');
    }
    const pool = new Pool({
        connectionString,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
        max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    });
    pool.on('error', (err) => {
        console.error('[DB] Beklenmeyen havuz hatası:', err.message);
    });
    return pool;
}

function getPool() {
    if (!_pool) _pool = buildPool();
    return _pool;
}

// Test amaçlı havuz enjeksiyonu (pg-mem vb. ile birim test için).
function setPoolForTesting(pool) {
    _pool = pool;
}

async function query(text, params) {
    return getPool().query(text, params);
}

// Bağlantının ulaşılabilirliğini kontrol eder (startup ping için).
async function ping() {
    await getPool().query('SELECT 1');
    return true;
}

module.exports = { getPool, query, ping, setPoolForTesting };
