// ============================================================
// CLIENT-SIDE POLEN ÖZETİ
// Dashboard'da zaten yüklü olan livePollen (Google-şekilli JSON)
// verisinden, chatbot'a fallback olarak gönderilecek kompakt
// Türkçe özet üretir. Backend'in fetchPollenSummary çıktısıyla
// AYNI formattadır — LLM iki kaynağı da aynı şekilde okur.
//
// Neden gerekli? Chatbot'un polen verisi normalde backend'de
// sohbet anında tekrar çekilir. Sağlayıcılar o an başarısız
// olursa (kota/ağ), kullanıcının EKRANINDA duran veri boşa
// gitmesin diye istekle birlikte bu özet de gönderilir.
// ============================================================

/**
 * @param {object} livePollen  /api/pollen yanıtı (Google-şekilli)
 * @param {{name?:string, lat?:number, lng?:number}} location
 * @returns {string|null} kompakt Türkçe özet | veri yoksa null
 */
export function buildClientPollenSummary(livePollen, location = {}) {
  const today = livePollen?.dailyInfo?.[0];
  if (!today) return null;

  const lines = [];
  const { name, lat, lng } = location;
  const coords =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? ` (${lat.toFixed(2)}, ${lng.toFixed(2)})`
      : '';
  lines.push(`📍 Konum: ${name || 'Seçilen konum'}${coords}`);
  lines.push(
    `🛰️ Kaynak: ${livePollen._source === 'google' ? 'Google Pollen API' : 'Open-Meteo (CAMS Europe)'} — uygulama ekranındaki güncel veri`
  );

  const typeInfo = today.pollenTypeInfo || [];
  if (typeInfo.length) {
    lines.push('Polen tipleri:');
    for (const t of typeInfo) {
      const ii = t.indexInfo;
      if (!ii) continue;
      lines.push(`  - ${t.displayName}: ${ii.category} (${ii.value}/5)`);
    }
  }

  const plants = today.plantInfo || [];
  const active = plants.filter((p) => p.inSeason && (p.indexInfo?.value ?? 0) > 0);
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
