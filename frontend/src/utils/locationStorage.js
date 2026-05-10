// ============================================================
// LOCATION PERSISTENCE LAYER
// Kullanıcının seçtiği konumu localStorage'da saklar/yükler.
//
// Tasarım kararları:
//   • Versiyonlu anahtar (v1) — şema değişirse eski veri sessizce
//     yok sayılır, kullanıcıyı bozmaz.
//   • Şekil doğrulaması — bozuk/eksik veri null döner, çağıran
//     varsayılana düşer.
//   • localStorage erişim hataları (gizli sekme, quota dolu, SSR vb.)
//     try/catch ile yutulur — UI asla çökmez.
// ============================================================

const STORAGE_KEY = 'pollen.selectedLocation.v1';

/**
 * Bir konum nesnesinin geçerli olup olmadığını doğrular.
 * Beklenen şekil: { key, name, lat, lng }
 */
function isValidLocation(loc) {
  return (
    loc &&
    typeof loc === 'object' &&
    typeof loc.key === 'string' &&
    loc.key.length > 0 &&
    typeof loc.name === 'string' &&
    loc.name.length > 0 &&
    typeof loc.lat === 'number' &&
    Number.isFinite(loc.lat) &&
    typeof loc.lng === 'number' &&
    Number.isFinite(loc.lng)
  );
}

/**
 * Konumu localStorage'a kaydet.
 * Hata durumunda sessizce başarısız olur (UI'ı bloklamaz).
 *
 * @param {{key:string, name:string, lat:number, lng:number}} location
 * @returns {boolean} kayıt başarılı mı
 */
export function saveLocation(location) {
  if (!isValidLocation(location)) {
    console.warn('[locationStorage] Geçersiz konum, kaydedilmedi:', location);
    return false;
  }
  try {
    // Sadece taşınabilir alanları yaz — fonksiyonlar/devre dışı alanlar yok
    const payload = {
      key: location.key,
      name: location.name,
      lat: location.lat,
      lng: location.lng,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    // Quota dolu, gizli sekme kısıtı, SSR vb.
    console.warn('[locationStorage] Kayıt başarısız:', err?.message || err);
    return false;
  }
}

/**
 * Kayıtlı konumu localStorage'dan yükle.
 * Veri yoksa, parse edilemezse veya bozuksa null döner.
 *
 * @returns {{key:string, name:string, lat:number, lng:number} | null}
 */
export function loadLocation() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!isValidLocation(parsed)) {
      // Bozuk kayıt — temizle ki bir daha okumayalım
      console.warn('[locationStorage] Bozuk kayıt temizleniyor');
      clearLocation();
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('[locationStorage] Yükleme başarısız:', err?.message || err);
    return null;
  }
}

/**
 * Kayıtlı konumu sil (örn. logout veya hata sonrası temizleme için).
 */
export function clearLocation() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // sessizce geç
  }
}
