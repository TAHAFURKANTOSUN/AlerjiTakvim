// ============================================================
// STATİK REFERANS VERİSİ
// (Bunlar mock değil — uygulamanın kalıcı sabitleri.)
//
// • POLLEN_TYPES        — UI'da gösterilen polen türü meta verileri
// • ALLERGEN_OPTIONS    — Profil ekranında seçilebilen alerjenler
// • RISK_LEVELS         — Risk seviyesi → renk/etiket eşlemesi
//
// Konum listesi: ../data/turkishProvinces.js (81 il)
// Canlı polen verisi: PollenContext.livePollen + livePollenAdapter
// ============================================================

export const POLLEN_TYPES = [
  { key: 'cimen',  name: 'Çimen',        color: '#6f9659', icon: '🌾', category: 'grass' },
  { key: 'zeytin', name: 'Zeytin Ağacı', color: '#8aa876', icon: '🫒', category: 'tree' },
  { key: 'pelin',  name: 'Pelin Otu',    color: '#c9a14a', icon: '🌿', category: 'weed' },
  { key: 'sedir',  name: 'Sedir Ağacı',  color: '#4a7a66', icon: '🌲', category: 'tree' },
  { key: 'mese',   name: 'Meşe Ağacı',   color: '#a07a4a', icon: '🌳', category: 'tree' },
  { key: 'kayin',  name: 'Kayın Ağacı',  color: '#c4664f', icon: '🍃', category: 'tree' },
];

export const ALLERGEN_OPTIONS = [
  { groupName: 'Ağaç Polenleri', groupIcon: '🌳', items: [
    { key: 'zeytin', name: 'Zeytin Ağacı', icon: '🫒' },
    { key: 'sedir',  name: 'Sedir Ağacı',  icon: '🌲' },
    { key: 'mese',   name: 'Meşe Ağacı',   icon: '🌳' },
    { key: 'kayin',  name: 'Kayın Ağacı',  icon: '🍃' },
  ]},
  { groupName: 'Çimen Polenleri', groupIcon: '🌾', items: [
    { key: 'cimen', name: 'Çimen', icon: '🌾' },
  ]},
  { groupName: 'Yabani Ot Polenleri', groupIcon: '🌿', items: [
    { key: 'pelin', name: 'Pelin Otu', icon: '🌿' },
  ]},
];

export const RISK_LEVELS = {
  low:    { label: 'Düşük Risk', color: '#6f9659', bg: 'rgba(111, 150, 89, 0.14)', border: 'rgba(111, 150, 89, 0.28)', emoji: '😊' },
  medium: { label: 'Orta Risk',  color: '#c9a14a', bg: 'rgba(201, 161, 74, 0.14)', border: 'rgba(201, 161, 74, 0.30)', emoji: '😐' },
  high:   { label: 'Yüksek Risk', color: '#c4664f', bg: 'rgba(196, 102, 79, 0.14)', border: 'rgba(196, 102, 79, 0.30)', emoji: '😷' },
};
