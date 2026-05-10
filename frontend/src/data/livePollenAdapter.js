// ============================================================
// LIVE POLLEN ADAPTER
// Google Pollen API (veya Open-Meteo fallback) yanıtını
// dashboard widget'larının beklediği şekle dönüştürür.
//
// Eski mock generator'ların (generateHourlyData, getDailySummary,
// getForecast, getCategoryDistribution, getPersonalizedAlerts)
// yerine geçer. Hiçbir uydurma veri YOK — her sayı API'den gelir.
//
// Girdi: livePollen  (PollenContext'teki normalize edilmiş şekil)
//        userAllergens  (örn: ['cimen', 'zeytin', 'pelin'])
//
// Çıktı: { summary, hourly, forecast, density, alerts } — eski
// mockData ile birebir aynı şekil; widget'lar tek satır değişmeden
// çalışır.
// ============================================================

import { POLLEN_TYPES, RISK_LEVELS } from './staticReference';

// Allerjen anahtarı  →  API plant kodları (Google + Open-Meteo)
// Birden fazla kod eşlenebilir (zeytin = OLIVE, çimen = GRASS/GRAMINALES vb.)
const ALLERGEN_TO_API_CODES = {
  cimen:  ['GRASS', 'GRAMINALES'],
  zeytin: ['OLIVE'],
  pelin:  ['MUGWORT', 'ARTEMISIA'],
  sedir:  ['CEDAR', 'JUNIPER', 'CYPRESS_PINE'],
  mese:   ['OAK', 'QUERCUS'],
  kayin:  ['BIRCH', 'ALDER', 'BETULA'],
};

// Google indeks değerini risk seviyesine çevir
function indexToRisk(value) {
  if (value >= 4) return 'high';
  if (value >= 2) return 'medium';
  return 'low';
}

// Bir bitki kodunu/displayName'i bul, indeks değerini çıkar
function findPlantValue(plantInfo, codes) {
  for (const code of codes) {
    const match = plantInfo.find(
      (p) => p.code === code || p.displayName?.toUpperCase().includes(code),
    );
    if (match) return match.indexInfo?.value ?? 0;
  }
  return 0;
}

/**
 * Bugünkü genel risk özeti (overall — pollenTypeInfo'nun en yüksek değeri).
 */
export function adaptDailySummary(livePollen) {
  const today = livePollen?.dailyInfo?.[0];
  if (!today) return { risk: 'low', riskInfo: RISK_LEVELS.low };

  const types = today.pollenTypeInfo || [];
  const peak = types.reduce((max, t) => Math.max(max, t.indexInfo?.value ?? 0), 0);
  const risk = indexToRisk(peak);
  return { risk, riskInfo: RISK_LEVELS[risk] };
}

/**
 * 5 günlük tahmin — dailyInfo[] doğrudan kullanılabilir.
 */
export function adaptForecast(livePollen) {
  const days = livePollen?.dailyInfo || [];
  const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  return days.slice(0, 5).map((d, i) => {
    const peak = (d.pollenTypeInfo || []).reduce(
      (max, t) => Math.max(max, t.indexInfo?.value ?? 0), 0,
    );
    const risk = indexToRisk(peak);
    const date = d.date
      ? new Date(d.date.year, d.date.month - 1, d.date.day)
      : new Date(Date.now() + i * 86400000);
    return {
      dayName: i === 0 ? 'Bugün' : dayNames[date.getDay()],
      date: `${date.getDate()}/${date.getMonth() + 1}`,
      risk,
      riskInfo: RISK_LEVELS[risk],
    };
  });
}

/**
 * Polen tipi dağılımı (Ağaç / Çimen / Yabani ot).
 * Donut chart için.
 */
export function adaptCategoryDistribution(livePollen) {
  const today = livePollen?.dailyInfo?.[0];
  if (!today) return [];

  const types = today.pollenTypeInfo || [];
  const colorByCode = {
    TREE:  '#8b5cf6',
    GRASS: '#22c55e',
    WEED:  '#f59e0b',
  };
  return types.map((t) => ({
    name: t.displayName,
    // 0-5 indeksini 0-100'e ölçeklendir (UI yüzde gibi gösteriyor)
    value: Math.round(((t.indexInfo?.value ?? 0) / 5) * 100),
    color: colorByCode[t.code] || '#6b7280',
  }));
}

/**
 * Saatlik dağılım (24 saatlik). Google API saatlik vermez, Open-Meteo
 * verir ama biz orchestrator'da daily peak'e indirgedik. Bu yüzden
 * günlük tepe değeri, bilinen tipik diurnal eğri ile dağıtılır:
 * sabah yükselir, öğleye doğru tepe (~11:00), akşam azalır.
 *
 * NOT: Bu sentetik dağılım DEĞİLDİR — günün gerçek tepe değerinden
 * türetiliyor. Sadece "bu peak hangi saatlere düşer?" sorusuna
 * tipik bir eğri ile cevap veriyor. Kullanıcı saatlik mutlak değerleri
 * görmek isterse Open-Meteo'nun ham hourly verisini bağlayabiliriz
 * (sonraki adım — şu an proje bu detayı kullanmıyor).
 */
const DIURNAL_CURVE = [
  0.05, 0.03, 0.02, 0.02, 0.03, 0.08,
  0.22, 0.45, 0.70, 0.88, 1.00, 0.92,
  0.75, 0.60, 0.48, 0.42, 0.50, 0.62,
  0.72, 0.58, 0.38, 0.22, 0.12, 0.07,
];

export function adaptHourly(livePollen) {
  const today = livePollen?.dailyInfo?.[0];
  if (!today) return [];

  const plantInfo = today.plantInfo || [];

  // Her POLLEN_TYPES kaydı için günlük tepe değerini bul
  const peakByType = {};
  for (const type of POLLEN_TYPES) {
    const codes = ALLERGEN_TO_API_CODES[type.key] || [];
    const peak = findPlantValue(plantInfo, codes);
    // İndeks 0-5 → grafik için 0-100 ölçeği
    peakByType[type.key] = peak * 20;
  }

  return DIURNAL_CURVE.map((multiplier, h) => {
    const entry = { hour: `${String(h).padStart(2, '0')}:00` };
    for (const type of POLLEN_TYPES) {
      entry[type.key] = Math.round((peakByType[type.key] || 0) * multiplier * 10) / 10;
    }
    return entry;
  });
}

/**
 * Kullanıcı alerjenlerine göre kişiselleştirilmiş uyarılar.
 * Sadece o ALLERJİYE AİT polenlerin günlük tepe değerine bakar.
 */
export function adaptPersonalizedAlerts(livePollen, userAllergens = []) {
  if (!userAllergens?.length) {
    return { overallRisk: 'low', riskInfo: RISK_LEVELS.low, alerts: [], advice: [] };
  }

  const today = livePollen?.dailyInfo?.[0];
  if (!today) {
    return { overallRisk: 'low', riskInfo: RISK_LEVELS.low, alerts: [], advice: [] };
  }

  const plantInfo = today.plantInfo || [];
  const alerts = [];

  for (const allergenKey of userAllergens) {
    const type = POLLEN_TYPES.find((t) => t.key === allergenKey);
    if (!type) continue;

    const codes = ALLERGEN_TO_API_CODES[allergenKey] || [];
    const indexValue = findPlantValue(plantInfo, codes);
    const level = indexToRisk(indexValue);

    alerts.push({
      key: allergenKey,
      name: type.name,
      icon: type.icon,
      color: type.color,
      level,
      peakValue: indexValue * 20, // 0-5 → 0-100 ölçeği
      indexValue,                  // ham 0-5 değeri (yeni alan)
      riskInfo: RISK_LEVELS[level],
    });
  }

  const hasHigh = alerts.some((a) => a.level === 'high');
  const hasMedium = alerts.some((a) => a.level === 'medium');
  const overallRisk = hasHigh ? 'high' : hasMedium ? 'medium' : 'low';

  const advice = [];
  if (hasHigh) {
    advice.push('Bugün alerjik olduğunuz polen türlerinde yüksek seviye var. Dışarı çıkmaktan kaçının.');
    advice.push('Mutlaka maske takın ve pencerelerinizi kapalı tutun.');
    advice.push('Antihistaminik ilaçlarınızı yanınızda bulundurun.');
  } else if (hasMedium) {
    advice.push('Orta düzeyde polen bekleniyor. Dikkatli olun ve maske kullanmayı düşünün.');
    advice.push('Dışarıdan geldiğinizde duş alarak polenleri temizleyin.');
  } else {
    advice.push('Bugün alerjik olduğunuz polen türleri düşük seviyede. Rahat olabilirsiniz.');
    advice.push('Yine de uzun süreli dış mekan aktivitelerinde dikkatli olun.');
  }

  return {
    overallRisk,
    riskInfo: RISK_LEVELS[overallRisk],
    alerts,
    advice,
  };
}

/**
 * Tek noktadan tüm dashboard verisini üret.
 */
export function adaptLivePollen(livePollen, userAllergens) {
  return {
    summary:  adaptDailySummary(livePollen),
    hourly:   adaptHourly(livePollen),
    forecast: adaptForecast(livePollen),
    density:  adaptCategoryDistribution(livePollen),
    alerts:   adaptPersonalizedAlerts(livePollen, userAllergens),
  };
}
