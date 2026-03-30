// ==========================================
// SABİTLER
// ==========================================

export const API_BASE = 'http://localhost:3001';

export const MONTHS_TR = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];
export const DAYS_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export const UPI_CATEGORIES = {
    'None': 'Yok', 'Very low': 'Çok Düşük', 'Low': 'Düşük',
    'Moderate': 'Orta', 'High': 'Yüksek', 'Very high': 'Çok Yüksek'
};
export const UPI_LEVEL_NAMES = ['Yok', 'Çok Düşük', 'Düşük', 'Orta', 'Yüksek', 'Çok Yüksek'];
export const UPI_COLORS = ['#7a7a9c', '#5ec88a', '#7ed56f', '#f5b041', '#ff6b6b', '#e74c3c'];
export const UPI_BG_COLORS = [
    'rgba(58,58,92,0.3)', 'rgba(74,158,109,0.25)', 'rgba(106,176,76,0.25)',
    'rgba(240,147,43,0.25)', 'rgba(235,77,75,0.25)', 'rgba(192,57,43,0.3)'
];

export const POLLEN_TYPE_ICONS = { 'TREE': '🌲', 'GRASS': '🌾', 'WEED': '🌿' };
export const POLLEN_TYPE_NAMES_TR = {
    'TREE': 'Ağaç', 'GRASS': 'Çimen', 'WEED': 'Yabani Ot',
    'Tree': 'Ağaç', 'Grass': 'Çimen', 'Weed': 'Yabani Ot'
};
export const PLANT_ICONS = {
    'ALDER': '🌳', 'ASH': '🌳', 'BIRCH': '🌳', 'COTTONWOOD': '🌳',
    'ELM': '🌳', 'MAPLE': '🍁', 'OLIVE': '🫒', 'JUNIPER': '🌲',
    'OAK': '🌳', 'PINE': '🌲', 'CYPRESS_PINE': '🌲', 'HAZEL': '🌰',
    'GRAMINALES': '🌾', 'RAGWEED': '🌿', 'MUGWORT': '🌿',
    'JAPANESE_CEDAR': '🌲', 'JAPANESE_CYPRESS': '🌲'
};

export const TURKISH_CITIES = {
    'istanbul': { lat: 41.0082, lng: 28.9784, name: 'İstanbul' },
    'ankara': { lat: 39.9334, lng: 32.8597, name: 'Ankara' },
    'izmir': { lat: 38.4237, lng: 27.1428, name: 'İzmir' },
    'bursa': { lat: 40.1826, lng: 29.0665, name: 'Bursa' },
    'antalya': { lat: 36.8969, lng: 30.7133, name: 'Antalya' },
    'adana': { lat: 37.0000, lng: 35.3213, name: 'Adana' },
    'konya': { lat: 37.8746, lng: 32.4932, name: 'Konya' },
    'gaziantep': { lat: 37.0662, lng: 37.3833, name: 'Gaziantep' },
    'mersin': { lat: 36.8121, lng: 34.6415, name: 'Mersin' },
    'diyarbakır': { lat: 37.9144, lng: 40.2306, name: 'Diyarbakır' },
    'kayseri': { lat: 38.7312, lng: 35.4787, name: 'Kayseri' },
    'eskişehir': { lat: 39.7767, lng: 30.5206, name: 'Eskişehir' },
    'trabzon': { lat: 41.0027, lng: 39.7168, name: 'Trabzon' },
    'samsun': { lat: 41.2867, lng: 36.3300, name: 'Samsun' },
    'denizli': { lat: 37.7765, lng: 29.0864, name: 'Denizli' },
    'malatya': { lat: 38.3554, lng: 38.3335, name: 'Malatya' },
    'erzurum': { lat: 39.9055, lng: 41.2658, name: 'Erzurum' },
    'van': { lat: 38.4891, lng: 43.3832, name: 'Van' },
    'batman': { lat: 37.8812, lng: 41.1351, name: 'Batman' },
    'elazığ': { lat: 38.6810, lng: 39.2264, name: 'Elazığ' },
    'manisa': { lat: 38.6191, lng: 27.4289, name: 'Manisa' },
    'sakarya': { lat: 40.6940, lng: 30.4358, name: 'Sakarya' },
    'kocaeli': { lat: 40.8533, lng: 29.8815, name: 'Kocaeli' },
    'muğla': { lat: 37.2153, lng: 28.3636, name: 'Muğla' },
    'aydın': { lat: 37.8560, lng: 27.8416, name: 'Aydın' },
    'tekirdağ': { lat: 41.0100, lng: 27.5128, name: 'Tekirdağ' },
    'hatay': { lat: 36.4018, lng: 36.3498, name: 'Hatay' },
    'balıkesir': { lat: 39.6484, lng: 27.8826, name: 'Balıkesir' },
    'kahramanmaraş': { lat: 37.5858, lng: 36.9371, name: 'Kahramanmaraş' },
    'sivas': { lat: 39.7477, lng: 37.0179, name: 'Sivas' },
    'şanlıurfa': { lat: 37.1674, lng: 38.7955, name: 'Şanlıurfa' },
    'afyonkarahisar': { lat: 38.7507, lng: 30.5567, name: 'Afyonkarahisar' },
    'edirne': { lat: 41.6818, lng: 26.5623, name: 'Edirne' },
    'çanakkale': { lat: 40.1553, lng: 26.4142, name: 'Çanakkale' },
    'rize': { lat: 41.0209, lng: 40.5234, name: 'Rize' },
    'artvin': { lat: 41.1828, lng: 41.8183, name: 'Artvin' },
    'ordu': { lat: 40.9839, lng: 37.8764, name: 'Ordu' },
    'giresun': { lat: 40.9128, lng: 38.3895, name: 'Giresun' },
    'tokat': { lat: 40.3167, lng: 36.5544, name: 'Tokat' },
    'yozgat': { lat: 39.8181, lng: 34.8147, name: 'Yozgat' },
    'çorum': { lat: 40.5506, lng: 34.9556, name: 'Çorum' },
    'kastamonu': { lat: 41.3887, lng: 33.7827, name: 'Kastamonu' },
    'bolu': { lat: 40.7360, lng: 31.6089, name: 'Bolu' },
    'düzce': { lat: 40.8438, lng: 31.1565, name: 'Düzce' },
    'zonguldak': { lat: 41.4564, lng: 31.7987, name: 'Zonguldak' },
    'nevşehir': { lat: 38.6250, lng: 34.7122, name: 'Nevşehir' },
    'aksaray': { lat: 38.3687, lng: 34.0370, name: 'Aksaray' },
    'niğde': { lat: 37.9667, lng: 34.6833, name: 'Niğde' },
    'isparta': { lat: 37.7648, lng: 30.5566, name: 'Isparta' },
    'burdur': { lat: 37.7203, lng: 30.2905, name: 'Burdur' },
    'uşak': { lat: 38.6823, lng: 29.4082, name: 'Uşak' },
    'kütahya': { lat: 39.4167, lng: 29.9833, name: 'Kütahya' },
    'mardin': { lat: 37.3212, lng: 40.7245, name: 'Mardin' },
    'kars': { lat: 40.6013, lng: 43.0975, name: 'Kars' },
};

export const HOURLY_PATTERN = [
    0.05, 0.04, 0.03, 0.03, 0.04, 0.10,
    0.30, 0.55, 0.80, 0.95, 1.00, 0.90,
    0.70, 0.55, 0.45, 0.40, 0.45, 0.60,
    0.75, 0.65, 0.40, 0.20, 0.10, 0.06
];

export function translateCategory(cat) {
    return cat ? (UPI_CATEGORIES[cat] || cat) : 'Yok';
}

export function hexToRGBA(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
}

export function getCountryName(code) {
    const c = {
        'TR':'Türkiye','US':'ABD','DE':'Almanya','FR':'Fransa','IT':'İtalya',
        'ES':'İspanya','GB':'İngiltere','NL':'Hollanda','BE':'Belçika','AT':'Avusturya',
        'CH':'İsviçre','GR':'Yunanistan','BG':'Bulgaristan','RO':'Romanya','PL':'Polonya',
        'SE':'İsveç','NO':'Norveç','DK':'Danimarka','FI':'Finlandiya','PT':'Portekiz',
        'HU':'Macaristan','JP':'Japonya','AU':'Avustralya','CA':'Kanada','BR':'Brezilya',
        'IL':'İsrail','IN':'Hindistan','KR':'Güney Kore'
    };
    return c[code] || code;
}

export function getMaxLevel(dayInfo) {
    let maxLevel = 0;
    if (dayInfo?.pollenTypeInfo) {
        for (const t of dayInfo.pollenTypeInfo) {
            if (t.indexInfo?.value > maxLevel) maxLevel = t.indexInfo.value;
        }
    }
    return maxLevel;
}
