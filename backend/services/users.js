// ============================================================
// Kullanıcı servisi — PostgreSQL üzerinde CRUD + plan yönetimi
// (Eski JSON dosyası tabanlı readUsers/writeUsers'ın yerini alır.)
// ============================================================

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');

function genId() {
    return Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
}

// Premium süresi geçmişse plan'ı 'free' olarak raporla (lazy downgrade).
function normalizePlan(row) {
    if (!row) return row;
    let plan = row.plan || 'free';
    if (plan === 'premium' && row.plan_expires_at && new Date(row.plan_expires_at) < new Date()) {
        plan = 'free';
    }
    return { ...row, plan };
}

// API'ye dönecek güvenli kullanıcı nesnesi (şifre yok).
function publicUser(row) {
    if (!row) return null;
    const n = normalizePlan(row);
    return {
        id: n.id,
        name: n.name,
        email: n.email,
        avatar: n.avatar,
        allergies: n.allergies || [],
        favorites: n.favorites || [],
        plan: n.plan,
        planExpiresAt: n.plan_expires_at || null,
    };
}

async function findByEmail(email) {
    // E-postalar küçük harf saklanır; karşılaştırmayı normalize ederek yap.
    const { rows } = await query(
        'SELECT * FROM users WHERE email = $1 LIMIT 1',
        [String(email || '').toLowerCase().trim()]
    );
    return rows[0] || null;
}

async function findById(id) {
    const { rows } = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    return rows[0] || null;
}

async function createUser({ name, email, password }) {
    const hashed = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const id = genId();
    const { rows } = await query(
        `INSERT INTO users (id, name, email, password, avatar, allergies, favorites, plan)
         VALUES ($1, $2, $3, $4, '👤', '[]', '[]', 'free')
         RETURNING *`,
        [id, name.trim(), String(email).toLowerCase().trim(), hashed]
    );
    return rows[0];
}

async function updateProfile(id, { name, avatar, allergies }) {
    const fields = [];
    const vals = [];
    let i = 1;
    if (name !== undefined) { fields.push(`name = $${i++}`); vals.push(name.trim()); }
    if (avatar !== undefined) { fields.push(`avatar = $${i++}`); vals.push(avatar); }
    if (allergies !== undefined) { fields.push(`allergies = $${i++}`); vals.push(JSON.stringify(allergies)); }
    if (!fields.length) return findById(id);
    vals.push(id);
    const { rows } = await query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
        vals
    );
    return rows[0] || null;
}

async function updateFavorites(id, favorites) {
    const { rows } = await query(
        'UPDATE users SET favorites = $1 WHERE id = $2 RETURNING *',
        [JSON.stringify(favorites || []), id]
    );
    return rows[0] || null;
}

async function deleteUser(id) {
    await query('DELETE FROM users WHERE id = $1', [id]);
}

// Premium'a yükselt / uzat. Mevcut bitiş ileri tarihteyse onun üstüne ekler.
async function setPremium(id, { days }) {
    const cur = await findById(id);
    if (!cur) return null;
    const now = new Date();
    const base = cur.plan_expires_at && new Date(cur.plan_expires_at) > now
        ? new Date(cur.plan_expires_at)
        : now;
    const expires = new Date(base.getTime() + days * 86400000);
    const since = cur.premium_since ? cur.premium_since : now;
    const { rows } = await query(
        `UPDATE users SET plan = 'premium', premium_since = $2, plan_expires_at = $3
         WHERE id = $1 RETURNING *`,
        [id, since, expires]
    );
    return rows[0] || null;
}

// Premium iptal → free'ye dön.
async function setFree(id) {
    const { rows } = await query(
        `UPDATE users SET plan = 'free', plan_expires_at = NULL WHERE id = $1 RETURNING *`,
        [id]
    );
    return rows[0] || null;
}

module.exports = {
    findByEmail, findById, createUser, updateProfile, updateFavorites,
    deleteUser, setPremium, setFree, publicUser, normalizePlan,
};
