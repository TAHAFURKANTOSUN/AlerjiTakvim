-- ============================================================
-- ALERJİ TAKVİM — Üyelik & Kota şeması (PostgreSQL)
-- `node db/migrate.js` ile uygulanır. Tüm ifadeler idempotent
-- (IF NOT EXISTS) olduğundan tekrar çalıştırmak güvenlidir.
-- ============================================================

-- ── Kullanıcılar ──
CREATE TABLE IF NOT EXISTS users (
    id              TEXT        PRIMARY KEY,
    name            TEXT        NOT NULL,
    email           TEXT        NOT NULL UNIQUE,   -- her zaman küçük harf saklanır
    password        TEXT        NOT NULL,          -- bcrypt hash
    avatar          TEXT        NOT NULL DEFAULT '👤',
    allergies       JSONB       NOT NULL DEFAULT '[]',
    favorites       JSONB       NOT NULL DEFAULT '[]',
    plan            TEXT        NOT NULL DEFAULT 'free',   -- 'free' | 'premium'
    plan_expires_at TIMESTAMPTZ,                           -- premium bitiş; NULL = süresiz/free
    premium_since   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ── Günlük kullanım sayaçları (hem üye hem misafir) ──
-- subject:  üye için 'user:<id>',  misafir için 'ip:<adres>'
-- usage_date sunucunun CURRENT_DATE değeri ile günlük olarak sıfırlanır.
CREATE TABLE IF NOT EXISTS usage_daily (
    subject      TEXT    NOT NULL,
    usage_date   DATE    NOT NULL DEFAULT CURRENT_DATE,
    pollen_count INTEGER NOT NULL DEFAULT 0,
    chat_count   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (subject, usage_date)
);

-- ── Ödeme kayıtları (simüle veya gerçek iyzico) ──
CREATE TABLE IF NOT EXISTS payments (
    id           TEXT          PRIMARY KEY,
    user_id      TEXT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount       NUMERIC(10,2) NOT NULL,
    currency     TEXT          NOT NULL DEFAULT 'TRY',
    status       TEXT          NOT NULL DEFAULT 'pending',   -- pending | success | failed
    provider     TEXT          NOT NULL DEFAULT 'simulated', -- simulated | iyzico
    provider_ref TEXT,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments (user_id);
