// ==========================================
// GROQ API KEY & MODEL FALLBACK MANAGER
// Model-öncelikli: İlk model bitmeden diğerine geçmez.
// Bir key 429/401/403 alırsa atlanır, tüm keyler bitince
// sonraki modele geçer.
// ==========================================

const path = require('path');

// Güvenlik ağı: eğer .env henüz yüklenmediyse (cwd farklı olabilir),
// backend/.env'yi burada da yüklemeyi dene.
if (!process.env.GROQ_API_KEYS && !process.env.GROQ_API_KEY) {
    try {
        require('dotenv').config({ path: path.join(__dirname, '.env') });
    } catch (_) {
        // dotenv yoksa sessizce geç
    }
}

class GroqKeyManager {
    constructor() {
        // .env'den virgülle ayrılmış keyleri parse et
        const raw = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
        this.apiKeys = raw
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);

        // Desteklenen modeller — öncelik sırasıyla (Türkçe + multilingual odaklı)
        // İlk model tamamen bitene kadar kullanılır, sonra sıradakine geçilir.
        //
        // Sıra mantığı:
        //   1) Llama 3.3 70B   — Türkçe'de en güvenilir, Meta'nın olgun modeli
        //   2) Llama 4 Scout   — daha yeni, hızlı, multilingual
        //   3) GPT OSS 120B    — farklı sağlayıcı (OpenAI), rate-limit çeşitliliği
        //   4) GPT OSS 20B     — en hızlı son-çare
        //
        // Hepsi Groq'un "Multilingual + Text-to-Text" listesinde.
        this.models = (process.env.GROQ_MODELS || [
            'llama-3.3-70b-versatile',
            'meta-llama/llama-4-scout-17b-16e-instruct',
            'openai/gpt-oss-120b',
            'openai/gpt-oss-20b',
        ].join(','))
            .split(',')
            .map(m => m.trim())
            .filter(m => m.length > 0);

        // Aktif indeksler
        this.currentModelIndex = 0;
        this.currentKeyIndex = 0;

        // Bloklanmış key+model kombinasyonları  { "model::key" : blockedUntil (timestamp) }
        this.blocked = new Map();

        // Blok süresi: 60 saniye (rate-limit sonrası bekleme)
        this.blockDurationMs = 60 * 1000;

        console.log(`[GroqKeyManager] ${this.apiKeys.length} API key yüklendi`);
        console.log(`[GroqKeyManager] Model sırası: ${this.models.join(' → ')}`);
    }

    /**
     * Aktif bir {apiKey, model} çifti döndürür.
     * Tüm kombinasyonlar tükenmişse null döner.
     */
    getActiveConfig() {
        const now = Date.now();

        // Her modeli sırayla dene (öncelik sırasında)
        for (let mi = 0; mi < this.models.length; mi++) {
            const modelIdx = (this.currentModelIndex + mi) % this.models.length;
            const model = this.models[modelIdx];

            // Bu model için her keyi dene
            for (let ki = 0; ki < this.apiKeys.length; ki++) {
                const keyIdx = (this.currentKeyIndex + ki) % this.apiKeys.length;
                const key = this.apiKeys[keyIdx];
                const comboId = `${model}::${key}`;

                const blockedUntil = this.blocked.get(comboId);
                if (!blockedUntil || now >= blockedUntil) {
                    // Bu kombinasyon kullanılabilir
                    this.blocked.delete(comboId); // süre bittiyse temizle
                    this.currentModelIndex = modelIdx;
                    this.currentKeyIndex = keyIdx;
                    return { apiKey: key, model, keyIndex: keyIdx, modelIndex: modelIdx };
                }
            }
        }

        // Hiçbir kombinasyon bulunamadı
        return null;
    }

    /**
     * Bir key+model kombinasyonunu geçici olarak blokla
     * @param {string} apiKey
     * @param {string} model
     * @param {number} statusCode  HTTP status (429, 401, 403 vb.)
     */
    markBlocked(apiKey, model, statusCode) {
        const comboId = `${model}::${apiKey}`;
        const maskedKey = apiKey.substring(0, 8) + '...' + apiKey.slice(-4);

        // 401/403 → daha uzun blok (geçersiz key, 10 dakika)
        // 429 → kısa blok (rate-limit, 60 saniye)
        let duration = this.blockDurationMs;
        if (statusCode === 401 || statusCode === 403) {
            duration = 10 * 60 * 1000; // 10 dakika
        }

        this.blocked.set(comboId, Date.now() + duration);
        console.warn(`[GroqKeyManager] ⚠️  Bloklandı: model=${model} key=${maskedKey} (HTTP ${statusCode}) — ${duration / 1000}s bekleme`);

        // Bir sonraki key'e ilerle
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;

        // Bu modelin tüm keyleri bloklandı mı kontrol et
        const allKeysBlocked = this.apiKeys.every(k => {
            const id = `${model}::${k}`;
            const until = this.blocked.get(id);
            return until && Date.now() < until;
        });

        if (allKeysBlocked) {
            console.warn(`[GroqKeyManager] 🔄 Model "${model}" için tüm keyler tükendi → sonraki modele geçiliyor`);
            this.currentModelIndex = (this.currentModelIndex + 1) % this.models.length;
            this.currentKeyIndex = 0;
        }
    }

    /**
     * Tüm kombinasyonların durumunu logla
     */
    getStatus() {
        const now = Date.now();
        return {
            totalKeys: this.apiKeys.length,
            totalModels: this.models.length,
            currentModel: this.models[this.currentModelIndex] || 'yok',
            currentKeyIndex: this.currentKeyIndex,
            blockedCount: [...this.blocked.entries()].filter(([, until]) => now < until).length,
            totalCombinations: this.apiKeys.length * this.models.length,
        };
    }

    /**
     * Kullanılabilir key olup olmadığını kontrol et
     */
    hasAvailableKeys() {
        return this.apiKeys.length > 0 && this.models.length > 0;
    }
}

// Singleton instance
const manager = new GroqKeyManager();

module.exports = manager;
