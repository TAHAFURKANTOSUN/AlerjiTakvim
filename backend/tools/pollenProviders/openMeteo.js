// ============================================================
// OPEN-METEO POLLEN SAĞLAYICI (FALLBACK)
//
// Endpoint:  https://air-quality-api.open-meteo.com/v1/air-quality
// Model:     CAMS Europe (Copernicus Atmosphere Monitoring Service)
// Anahtar:   YOK — tamamen ücretsiz, kayıt yok, kota yok
// Kapsam:    Avrupa + Türkiye (CAMS Europe domain)
// Çıkış:     grains/m³ (saatlik)
//
// Bu modül Open-Meteo yanıtını GOOGLE POLLEN API'NİN ŞEKLİNE
// dönüştürür ki frontend ve chatbot tek bir adapter'la çalışsın
// — kod değişikliği gerekmez.
//
// 0-5 indeks dönüşümü (UPI - Universal Pollen Index benzeri):
//   0      → Yok           (0)
//   1-9    → Çok düşük     (1)
//   10-49  → Düşük         (2)
//   50-199 → Orta          (3)
//   200-499→ Yüksek        (4)
//   500+   → Çok yüksek    (5)
// ============================================================

const POLLEN_VARIABLES = [
  'alder_pollen',
  'birch_pollen',
  'grass_pollen',
  'mugwort_pollen',
  'olive_pollen',
  'ragweed_pollen',
];

// Open-Meteo değişken adı → görsel/kategori bilgisi
const PLANT_META = {
  alder_pollen:    { code: 'ALDER',    displayName: 'Kızılağaç', type: 'TREE' },
  birch_pollen:    { code: 'BIRCH',    displayName: 'Huş',       type: 'TREE' },
  olive_pollen:    { code: 'OLIVE',    displayName: 'Zeytin',    type: 'TREE' },
  grass_pollen:    { code: 'GRAMINALES', displayName: 'Çimen',   type: 'GRASS' },
  mugwort_pollen:  { code: 'MUGWORT',  displayName: 'Pelin',     type: 'WEED' },
  ragweed_pollen:  { code: 'RAGWEED',  displayName: 'Kanarya otu', type: 'WEED' },
};

const TYPE_META = {
  TREE:  { code: 'TREE',  displayName: 'Ağaç' },
  GRASS: { code: 'GRASS', displayName: 'Çimen' },
  WEED:  { code: 'WEED',  displayName: 'Yabani ot' },
};

const CATEGORY_LABELS = ['Yok', 'Çok düşük', 'Düşük', 'Orta', 'Yüksek', 'Çok yüksek'];

class OpenMeteoProviderError extends Error {
  constructor(message, { status } = {}) {
    super(message);
    this.name = 'OpenMeteoProviderError';
    this.status = status;
  }
}

function grainsToIndex(g) {
  if (g == null || Number.isNaN(g) || g <= 0) return 0;
  if (g < 10) return 1;
  if (g < 50) return 2;
  if (g < 200) return 3;
  if (g < 500) return 4;
  return 5;
}

/**
 * Open-Meteo API'yi çağırır ve Google Pollen API ŞEKLİNDE veri döndürür.
 *
 * @returns {Promise<object>} {regionCode, dailyInfo: [{date, pollenTypeInfo, plantInfo}]}
 * @throws  {OpenMeteoProviderError}
 */
async function fetchOpenMeteoPollen({ lat, lng, days = 1 }) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    hourly: POLLEN_VARIABLES.join(','),
    forecast_days: String(Math.max(1, Math.min(days, 5))),
    timezone: 'auto',
  });
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`;

  let resp;
  try {
    resp = await fetch(url);
  } catch (err) {
    throw new OpenMeteoProviderError(`Ağ hatası: ${err.message}`);
  }

  if (!resp.ok) {
    throw new OpenMeteoProviderError(`Open-Meteo hatası: ${resp.status}`, {
      status: resp.status,
    });
  }

  const data = await resp.json();
  const hourly = data?.hourly || {};
  const times = hourly.time || [];
  if (times.length === 0) {
    throw new OpenMeteoProviderError('Open-Meteo boş yanıt döndürdü');
  }

  // Saatleri günlere göre grupla (YYYY-MM-DD anahtarı)
  const dayBuckets = new Map(); // dayKey → { hourIndices: number[] }
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (typeof t !== 'string') continue;
    const dayKey = t.slice(0, 10); // "2026-05-01"
    if (!dayBuckets.has(dayKey)) dayBuckets.set(dayKey, []);
    dayBuckets.get(dayKey).push(i);
  }

  // Her gün için dailyInfo hazırla
  const dailyInfo = [];
  for (const [dayKey, indices] of dayBuckets) {
    const [y, m, d] = dayKey.split('-').map(Number);

    // Bitki bazında o günün PEAK (max) değerini al — UI riski "tepe"den hisseder
    const plantPeaks = {};
    for (const v of POLLEN_VARIABLES) {
      const series = hourly[v] || [];
      let peak = 0;
      for (const idx of indices) {
        const val = series[idx];
        if (typeof val === 'number' && val > peak) peak = val;
      }
      plantPeaks[v] = peak;
    }

    // plantInfo: her bitki için ayrı entry
    const plantInfo = POLLEN_VARIABLES.map((v) => {
      const peak = plantPeaks[v];
      const idx = grainsToIndex(peak);
      const meta = PLANT_META[v];
      return {
        code: meta.code,
        displayName: meta.displayName,
        inSeason: idx > 0,
        indexInfo: {
          code: 'UPI',
          displayName: 'Polen indeksi',
          value: idx,
          category: CATEGORY_LABELS[idx],
          // Open-Meteo'dan gelen ham değeri de saklayalım (debug + chatbot için)
          rawValue: Math.round(peak * 10) / 10,
          rawUnit: 'grains/m³',
        },
      };
    });

    // pollenTypeInfo: TREE / GRASS / WEED grupları, her grupta o gün ait
    // bitkilerin maksimum indeksi
    const typeMaxIndex = { TREE: 0, GRASS: 0, WEED: 0 };
    for (const v of POLLEN_VARIABLES) {
      const t = PLANT_META[v].type;
      const idx = grainsToIndex(plantPeaks[v]);
      if (idx > typeMaxIndex[t]) typeMaxIndex[t] = idx;
    }

    const pollenTypeInfo = ['TREE', 'GRASS', 'WEED'].map((t) => {
      const idx = typeMaxIndex[t];
      return {
        code: TYPE_META[t].code,
        displayName: TYPE_META[t].displayName,
        inSeason: idx > 0,
        indexInfo: {
          code: 'UPI',
          displayName: 'Polen indeksi',
          value: idx,
          category: CATEGORY_LABELS[idx],
        },
      };
    });

    dailyInfo.push({
      date: { year: y, month: m, day: d },
      pollenTypeInfo,
      plantInfo,
    });
  }

  return {
    // Google'ın "regionCode" alanı yok ama frontend kullanmıyor
    regionCode: 'EU',
    dailyInfo,
    // Hangi sağlayıcıdan geldiğini bilelim
    _source: 'open-meteo',
  };
}

module.exports = { fetchOpenMeteoPollen, OpenMeteoProviderError };
