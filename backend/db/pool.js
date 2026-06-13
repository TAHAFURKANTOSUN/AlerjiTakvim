// PostgreSQL connection pool
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

let _pool = null;

// SSL config:
//   DATABASE_SSL=false or unset -> no SSL (local dev).
//   DATABASE_SSL=true + DATABASE_CA_CERT=/path/to/ca.pem -> full cert verification (RECOMMENDED).
//   DATABASE_SSL=true (no cert) -> rejectUnauthorized:true (secure default).
//     Managed providers (Supabase, Neon) that bundle their CA in Node's root store work fine.
//     If the provider uses a custom CA, set DATABASE_CA_CERT.
//   DATABASE_SSL_REJECT_UNAUTHORIZED=false -> restores old unsafe behaviour (NOT RECOMMENDED).
function buildSslConfig() {
    if (process.env.DATABASE_SSL !== 'true') return undefined;

    const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';
    if (!rejectUnauthorized) {
        console.warn(
            '[DB] WARNING: DATABASE_SSL_REJECT_UNAUTHORIZED=false -- ' +
            'SSL certificate verification disabled. Vulnerable to MITM. ' +
            'Use only as a temporary migration step.'
        );
    }

    const certPath = process.env.DATABASE_CA_CERT;
    if (certPath) {
        try {
            const ca = fs.readFileSync(certPath, 'utf8');
            return { rejectUnauthorized, ca };
        } catch (err) {
            console.error('[DB] Cannot read DATABASE_CA_CERT:', certPath, err.message);
            throw new Error('[DB] Failed to load SSL CA certificate: ' + certPath);
        }
    }

    return { rejectUnauthorized };
}

function buildPool() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.warn('[DB] WARNING: DATABASE_URL is not set -- PostgreSQL connection unavailable. Check backend/.env');
    }
    const pool = new Pool({
        connectionString,
        ssl: buildSslConfig(),
        max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    });
    pool.on('error', (err) => {
        console.error('[DB] Unexpected pool error:', err.message);
    });
    return pool;
}

function getPool() {
    if (!_pool) _pool = buildPool();
    return _pool;
}

function setPoolForTesting(pool) {
    _pool = pool;
}

async function query(text, params) {
    return getPool().query(text, params);
}

async function ping() {
    await getPool().query('SELECT 1');
    return true;
}

async function end() {
    if (_pool) {
        await _pool.end();
        _pool = null;
    }
}

module.exports = { getPool, query, ping, end, setPoolForTesting };
