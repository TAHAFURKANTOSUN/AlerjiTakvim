// ============================================================
// GOOGLE POLLEN API — KEY FALLBACK MANAGER
//
// Çoklu anahtar yönetimi. Bir anahtar 429/403 alırsa otomatik
// olarak bloklanır; istekler bir sonraki anahtarla devam eder.
// Aktif anahtar bellekte tutulur — her tıklamada baştan denenmez.
//
// Anahtarlar .env'den yüklenir:
//   POLLEN_API_KEYS=key1,key2,key3       (önerilen — virgülle ayır)
//   POLLEN_API_KEY=key1                  (eski format, geriye uyumlu)
// ============================================================

class GoogleKeyManager {
  constructor() {
    // Çoklu anahtar (POLLEN_API_KEYS) öncelikli; yoksa tek anahtar (POLLEN_API_KEY)
    const raw = process.env.POLLEN_API_KEYS || process.env.POLLEN_API_KEY || '';
    this.apiKeys = raw
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    // Aktif anahtar index'i — bellekte tutulur (PERFORMANS için kritik:
    // bir kez bulduğumuz çalışan anahtarda kalırız, her tıklamada
    // baştan denemeyiz)
    this.currentIndex = 0;

    // Bloklanmış anahtarlar: { apiKey: blockedUntil (timestamp) }
    this.blocked = new Map();

    // Blok süreleri — hata türüne göre
    this.BLOCK_DURATIONS = {
      429: 60 * 60 * 1000,        // 429 Too Many Requests → 1 saat
      403: 24 * 60 * 60 * 1000,   // 403 Quota Exceeded    → 24 saat (gün dolar)
      401: 10 * 60 * 1000,        // 401 Unauthorized      → 10 dk (geçici olabilir)
      DEFAULT: 5 * 60 * 1000,     //                       → 5 dk
    };

    if (this.apiKeys.length > 0) {
      console.log(`[googleKeyManager] ${this.apiKeys.length} Pollen API anahtarı yüklendi`);
    }
  }

  get totalKeys() {
    return this.apiKeys.length;
  }

  /**
   * Aktif (bloklanmamış) bir anahtar döndürür.
   * Tüm anahtarlar bloklanmışsa null döner.
   *
   * @returns {{apiKey: string, keyIndex: number} | null}
   */
  getActiveKey() {
    if (this.apiKeys.length === 0) return null;
    const now = Date.now();

    // currentIndex'ten başlayarak her anahtarı dene
    for (let i = 0; i < this.apiKeys.length; i++) {
      const idx = (this.currentIndex + i) % this.apiKeys.length;
      const key = this.apiKeys[idx];
      const blockedUntil = this.blocked.get(key);

      if (!blockedUntil || now >= blockedUntil) {
        // Süresi dolmuşsa kaydı temizle
        if (blockedUntil) this.blocked.delete(key);
        // Aktif index'i kalıcı olarak GÜNCELLE — bir sonraki çağrı
        // doğrudan bu anahtardan başlar (gereksiz deneme yok)
        this.currentIndex = idx;
        return { apiKey: key, keyIndex: idx };
      }
    }
    return null; // hepsi bloklu
  }

  /**
   * Bir anahtarı geçici olarak blokla.
   * @param {string} apiKey
   * @param {number} statusCode  HTTP status (429, 403, 401 vb.)
   */
  markBlocked(apiKey, statusCode) {
    const duration = this.BLOCK_DURATIONS[statusCode] || this.BLOCK_DURATIONS.DEFAULT;
    this.blocked.set(apiKey, Date.now() + duration);

    const masked = this._mask(apiKey);
    const idx = this.apiKeys.indexOf(apiKey);
    const minutes = Math.round(duration / 60000);
    console.warn(
      `[googleKeyManager] ⚠️  Anahtar #${idx + 1} (${masked}) bloklandı: ` +
      `HTTP ${statusCode}, ${minutes} dk bekleme`,
    );

    // Aktif anahtar buysa, bir sonrakine ilerle (sıradaki getActiveKey
    // çağrısında lineer arama yine doğruyu bulur, ama bu küçük optimizasyon)
    if (this.apiKeys[this.currentIndex] === apiKey) {
      this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
    }
  }

  /**
   * Tüm anahtarlar bloklu mu?
   */
  allBlocked() {
    if (this.apiKeys.length === 0) return true;
    const now = Date.now();
    return this.apiKeys.every((k) => {
      const until = this.blocked.get(k);
      return until && now < until;
    });
  }

  /**
   * Debug/monitoring için durum özeti
   */
  getStatus() {
    const now = Date.now();
    return {
      totalKeys: this.apiKeys.length,
      activeKeyIndex: this.currentIndex,
      blockedCount: [...this.blocked.entries()].filter(([, until]) => now < until).length,
      keys: this.apiKeys.map((k, i) => {
        const until = this.blocked.get(k);
        const isBlocked = until && now < until;
        return {
          index: i,
          masked: this._mask(k),
          isActive: i === this.currentIndex && !isBlocked,
          isBlocked,
          unblockInSec: isBlocked ? Math.ceil((until - now) / 1000) : 0,
        };
      }),
    };
  }

  _mask(key) {
    if (!key || key.length < 12) return '***';
    return key.substring(0, 8) + '...' + key.slice(-4);
  }
}

// Singleton — tüm modüller aynı bellek state'ini paylaşır
module.exports = new GoogleKeyManager();
