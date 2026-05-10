// ============================================================
// ⚠️ DEPRECATED — Bu dosya artık mock generator İÇERMİYOR.
//
// Tüm sahte veri üreten fonksiyonlar (generateHourlyData,
// getDailySummary, getForecast, getCategoryDistribution,
// getPersonalizedAlerts, getChatResponse) KALDIRILDI.
//
// Yerleri:
//   • Statik sabitler  → './staticReference.js'
//   • İl listesi (81)  → './turkishProvinces.js'
//   • Canlı polen verisi adaptasyonu → './livePollenAdapter.js'
//
// Bu dosya geriye uyumluluk için sadece RE-EXPORT yapar.
// Yeni kod doğrudan yukarıdaki dosyalardan import etmeli.
// ============================================================

export {
  POLLEN_TYPES,
  ALLERGEN_OPTIONS,
  RISK_LEVELS,
} from './staticReference';

export { TURKISH_PROVINCES_SORTED as LOCATIONS } from './turkishProvinces';
// Eski isim — bazı yerlerde 'TURKISH_CITIES' kullanılıyordu
export { TURKISH_PROVINCES_SORTED as TURKISH_CITIES } from './turkishProvinces';
