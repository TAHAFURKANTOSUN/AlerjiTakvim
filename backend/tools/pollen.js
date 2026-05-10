// ============================================================
// POLLEN ORCHESTRATOR
//
// Sağlayıcı zinciri:  Google Pollen API  →  Open-Meteo (fallback)
//
// Google başarısız olursa (key geçersiz, kota dolmuş, ağ hatası)
// otomatik olarak Open-Meteo'ya geçer. İki sağlayıcı da AYNI JSON
// şeklini döndürür → frontend ve chatbot tek satır değişmeden çalışır.
//
// Export:
//   getPollenData({ lat, lng, days })       → Google-shaped JSON  (ham veri)
//   fetchPollenSummary({ lat, lng, ... })   → Türkçe özet metni  (chatbot için)
// ============================================================

const { fetchGooglePollen, GoogleProviderError } = require('./pollenProviders/google');
const { fetchOpenMeteoPollen } = require('./pollenProviders/openMeteo');

// Google'ı kısa süre boykot etmek için bayrak — peş peşe yüzlerce
// 403/429 alıp gereksiz uğraşmamak için. Süre dolunca tekrar dener.
let googleBoycottUntil = 0;
const BOYCOTT_DURATION_MS = 5 * 60 * 1000; // 5 dakika

function isGoogleBoycotted() {
  return Date.now() < googleBoycottUntil;
}

function boycottGoogle(reason) {
  googleBoycottUntil = Date.now() + BOYCOTT_DURATION_MS;
  console.warn(`[pollen] Google ${BOYCOTT_DURATION_MS / 60000} dk boykot ediliyor: ${reason}`);
}

/**
 * Sağlayıcı zinciriyle polen verisi al. Google denenir, başarısızsa
 * Open-Meteo. İkisi de AYNI şekilde veri döner (Google formatı).
 *
 * @returns {Promise<object>} { regionCode, dailyInfo: [...], _source: 'google' | 'open-meteo' }
 */
async function getPollenData({ lat, lng, days = 1 }) {
  if (lat == null || lng == null || Number.isNaN(+lat) || Number.isNaN(+lng)) {
    throw new Error('Geçersiz koordinat');
  }

  // 1) Google'ı dene (boykotta değilse)
  if (!isGoogleBoycotted()) {
    try {
      const data = await fetchGooglePollen({ lat, lng, days });
      data._source = 'google';
      return data;
    } catch (err) {
      const isAuthOrQuota =
        err instanceof GoogleProviderError &&
        (err.code === 'UNAUTHORIZED' || err.code === 'QUOTA');

      if (isAuthOrQuota) {
        boycottGoogle(err.message);
      } else {
        console.warn('[pollen] Google başarısız, Open-Meteo deneniyor:', err.message);
      }
      // Devam et → Open-Meteo
    }
  }

  // 2) Open-Meteo fallback (anahtar yok, kota yok)
  try {
    const data = await fetchOpenMeteoPollen({ lat, lng, days });
    return data; // _source: 'open-meteo' içinde
  } catch (err) {
    console.error('[pollen] Open-Meteo de başarısız:', err.message);
    throw new Error('Hiçbir polen sağlayıcısından veri alınamadı');
  }
}

// ============================================================
// CHATBOT için Türkçe özet (eski API ile uyumlu)
// ============================================================

/**
 * Polen verisinden LLM'in doğrudan okuyabileceği kompakt Türkçe
 * özet üretir. Chat akışını bloklamaması için hata durumunda null döner.
 */
async function fetchPollenSummary({ lat, lng, locationName } = {}) {
  if (lat == null || lng == null || Number.isNaN(+lat) || Number.isNaN(+lng)) {
    return null;
  }

  let data;
  try {
    data = await getPollenData({ lat, lng, days: 1 });
  } catch (err) {
    console.warn('[pollen] özet için veri alınamadı:', err.message);
    return null;
  }

  const today = data?.dailyInfo?.[0];
  if (!today) return null;

  const lines = [];
  const loc = locationName
    ? `${locationName} (${(+lat).toFixed(2)}, ${(+lng).toFixed(2)})`
    : `${(+lat).toFixed(2)}, ${(+lng).toFixed(2)}`;
  lines.push(`📍 Konum: ${loc}`);
  lines.push(`🛰️ Kaynak: ${data._source === 'google' ? 'Google Pollen API' : 'Open-Meteo (CAMS Europe)'}`);

  // Polen tipleri
  const typeInfo = today.pollenTypeInfo || [];
  if (typeInfo.length) {
    lines.push('Polen tipleri:');
    for (const t of typeInfo) {
      const ii = t.indexInfo;
      if (!ii) continue;
      lines.push(`  - ${t.displayName}: ${ii.category} (${ii.value}/5)`);
    }
  }

  // Aktif bitkiler
  const plants = today.plantInfo || [];
  const active = plants.filter(
    (p) => p.inSeason && (p.indexInfo?.value ?? 0) > 0,
  );
  if (active.length) {
    lines.push('Aktif bitkiler:');
    for (const p of active) {
      lines.push(`  • ${p.displayName}: ${p.indexInfo.value}/5 (${p.indexInfo.category})`);
    }
  } else {
    lines.push('Aktif bitki: yok (veya mevsim dışı)');
  }

  return lines.join('\n');
}

module.exports = { getPollenData, fetchPollenSummary };
