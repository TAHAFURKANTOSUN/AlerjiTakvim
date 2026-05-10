// ============================================================
// GOOGLE POLLEN API SAĞLAYICI (ÇOKLU ANAHTAR DESTEKLİ)
//
// Endpoint:  https://pollen.googleapis.com/v1/forecast:lookup
// Anahtarlar: googleKeyManager (singleton) tarafından yönetilir
// Kota:      her ücretsiz anahtar için ~10k istek/ay
//
// Davranış:
//   • Aktif anahtar bellekte tutulur — ilk istekten itibaren onu kullanır
//   • 429/403/401 alırsa anahtar BLOKLANIR ve sıradaki anahtarla retry yapılır
//   • Tüm anahtarlar bloklu olursa QUOTA hatasıyla atılır
//     (üst orchestrator Open-Meteo fallback'ine geçer)
// ============================================================

const keyManager = require('./googleKeyManager');

class GoogleProviderError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = 'GoogleProviderError';
    this.status = status;       // HTTP status
    this.code = code;           // 'UNAUTHORIZED' | 'QUOTA' | 'OTHER'
  }
}

/**
 * Tek bir anahtarla Google Pollen API'yi çağırır.
 * Hatayı GoogleProviderError olarak fırlatır (kategori bilgisiyle).
 */
async function callGoogleOnce({ apiKey, lat, lng, days }) {
  const url =
    'https://pollen.googleapis.com/v1/forecast:lookup' +
    `?key=${apiKey}` +
    `&location.latitude=${lat}` +
    `&location.longitude=${lng}` +
    `&days=${days}` +
    `&languageCode=tr` +
    `&plantsDescription=false`;

  let resp;
  try {
    resp = await fetch(url);
  } catch (err) {
    throw new GoogleProviderError(`Ağ hatası: ${err.message}`, { code: 'OTHER' });
  }

  if (!resp.ok) {
    if (resp.status === 401 || resp.status === 403) {
      throw new GoogleProviderError('API anahtarı geçersiz veya kota aşıldı (403/401)', {
        status: resp.status, code: 'UNAUTHORIZED',
      });
    }
    if (resp.status === 429) {
      throw new GoogleProviderError('Rate-limit aşıldı (429)', {
        status: resp.status, code: 'QUOTA',
      });
    }
    throw new GoogleProviderError(`Google API hatası: ${resp.status}`, {
      status: resp.status, code: 'OTHER',
    });
  }

  return await resp.json();
}

/**
 * Çoklu anahtar fallback ile Google Pollen API çağırır.
 *
 * Akış:
 *   1) keyManager.getActiveKey() ile aktif anahtarı al
 *   2) İstek at
 *   3) 429/403/401 → anahtarı blokla, SONRAKİ anahtara geç, tekrar dene
 *   4) Başka hata → fırlat (üst katmana)
 *   5) Tüm anahtarlar tükenince QUOTA hatası fırlat
 *
 * @returns {Promise<object>}
 * @throws  {GoogleProviderError}
 */
async function fetchGooglePollen({ lat, lng, days = 1 }) {
  if (keyManager.totalKeys === 0) {
    throw new GoogleProviderError('Hiç Google Pollen API anahtarı yapılandırılmamış', {
      code: 'UNAUTHORIZED',
    });
  }

  let lastError = null;
  // Anahtar sayısı kadar deneme — sonsuz döngüye girmeyiz
  for (let attempt = 0; attempt < keyManager.totalKeys; attempt++) {
    const config = keyManager.getActiveKey();
    if (!config) break; // hepsi bloklu

    try {
      const data = await callGoogleOnce({
        apiKey: config.apiKey,
        lat, lng, days,
      });
      // BAŞARI — bu anahtar çalıştı, currentIndex zaten güncellenmişti
      return data;
    } catch (err) {
      lastError = err;

      if (!(err instanceof GoogleProviderError)) {
        // Beklenmeyen hata — anahtarı suçlama, üst katmana ilet
        throw err;
      }

      if (err.code === 'QUOTA' || err.code === 'UNAUTHORIZED') {
        // Bu anahtar tükendi → blokla ve sonraki ile dene
        keyManager.markBlocked(config.apiKey, err.status);
        continue;
      }

      // OTHER (5xx, ağ vb.) → anahtar suçu değil, üst katmana fırlat
      throw err;
    }
  }

  // Tüm anahtarlar tükendi
  throw new GoogleProviderError(
    `Tüm Google API anahtarları tükendi (${keyManager.totalKeys} anahtar)`,
    { code: 'QUOTA' },
  );
}

module.exports = {
  fetchGooglePollen,
  GoogleProviderError,
  // Monitoring için dışarı verelim
  getKeyManagerStatus: () => keyManager.getStatus(),
};
