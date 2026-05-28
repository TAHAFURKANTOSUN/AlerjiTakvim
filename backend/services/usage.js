// ============================================================
// Kullanım/kota servisi — günlük sayaçlar (usage_daily tablosu)
// Atomik iki adımlı desen:
//   1) satırı garanti et (INSERT ... ON CONFLICT DO NOTHING)
//   2) koşullu/atomik artır (UPDATE ... WHERE col < limit RETURNING)
// "RETURNING boş" → limit dolu (satır kilidiyle yarış koşulu yok).
// ============================================================

const { query } = require('../db/pool');

const COLUMN = { pollen: 'pollen_count', chat: 'chat_count' };

// Bir sonraki günün başlangıcı (yerel sunucu saatine göre yaklaşık ISO).
// Kota CURRENT_DATE değiştiğinde sıfırlanır.
function nextResetISO() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    return next.toISOString();
}

// Bugünkü sayaçları (artırmadan) okur.
async function getCounts(subject) {
    const { rows } = await query(
        `SELECT pollen_count, chat_count FROM usage_daily
         WHERE subject = $1 AND usage_date = CURRENT_DATE`,
        [subject]
    );
    return rows[0] || { pollen_count: 0, chat_count: 0 };
}

/**
 * Bir isteği "tüketmeyi" dener.
 *  - limit === null -> sinirsiz: her zaman artirir, allowed=true doner.
 *  - limit <= 0     -> erisim yok: allowed=false.
 *  - aksi halde: yalnizca mevcut sayac < limit ise atomik olarak artirir.
 * Donen: { allowed, used, limit, remaining }
 */
async function consume(subject, resource, limit) {
    const col = COLUMN[resource];
    if (!col) throw new Error('Gecersiz kaynak: ' + resource);

    if (limit !== null && limit <= 0) {
        const cur = await getCounts(subject);
        return { allowed: false, used: cur[col], limit, remaining: 0 };
    }

    // 1) Bugunun satirini garanti et (yoksa 0/0 ile olustur).
    await query(
        `INSERT INTO usage_daily (subject, usage_date) VALUES ($1, CURRENT_DATE)
         ON CONFLICT (subject, usage_date) DO NOTHING`,
        [subject]
    );

    // 2a) Sinirsiz - kosulsuz artir (istatistik icin).
    if (limit === null) {
        const result = await query(
            `UPDATE usage_daily SET ${col} = ${col} + 1
             WHERE subject = $1 AND usage_date = CURRENT_DATE
             RETURNING ${col} AS used`,
            [subject]
        );
        return { allowed: true, used: result.rows[0].used, limit: null, remaining: null };
    }

    // 2b) Limitli - yalnizca limit altindaysa artir (atomik, satir kilidiyle).
    const result = await query(
        `UPDATE usage_daily SET ${col} = ${col} + 1
         WHERE subject = $1 AND usage_date = CURRENT_DATE AND ${col} < $2
         RETURNING ${col} AS used`,
        [subject, limit]
    );

    if (result.rows.length === 0) {
        // Hic satir guncellenmedi -> limit dolu.
        const cur = await getCounts(subject);
        return { allowed: false, used: cur[col], limit, remaining: 0 };
    }

    const usedCount = result.rows[0].used;
    return { allowed: true, used: usedCount, limit, remaining: Math.max(0, limit - usedCount) };
}

module.exports = { consume, getCounts, nextResetISO };
