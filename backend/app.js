/* ==========================================
   ALERJİ TAKİP - GOOGLE POLLEN API + PROFİL + FAVORİLER
   ========================================== */

// ==========================================
// SABİTLER
// ==========================================
const MONTHS_TR = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];
const DAYS_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const DAYS_FULL_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const UPI_CATEGORIES = {
    'None': 'Yok', 'Very low': 'Çok Düşük', 'Low': 'Düşük',
    'Moderate': 'Orta', 'High': 'Yüksek', 'Very high': 'Çok Yüksek'
};
const UPI_LEVEL_NAMES = ['Yok', 'Çok Düşük', 'Düşük', 'Orta', 'Yüksek', 'Çok Yüksek'];
const UPI_COLORS = ['#7a7a9c', '#5ec88a', '#7ed56f', '#f5b041', '#ff6b6b', '#e74c3c'];
const UPI_BG_COLORS = [
    'rgba(58,58,92,0.3)', 'rgba(74,158,109,0.25)', 'rgba(106,176,76,0.25)',
    'rgba(240,147,43,0.25)', 'rgba(235,77,75,0.25)', 'rgba(192,57,43,0.3)'
];

const POLLEN_TYPE_ICONS = { 'TREE': '🌲', 'GRASS': '🌾', 'WEED': '🌿' };
const POLLEN_TYPE_NAMES_TR = {
    'TREE': 'Ağaç', 'GRASS': 'Çimen', 'WEED': 'Yabani Ot',
    'Tree': 'Ağaç', 'Grass': 'Çimen', 'Weed': 'Yabani Ot'
};
const PLANT_ICONS = {
    'ALDER': '🌳', 'ASH': '🌳', 'BIRCH': '🌳', 'COTTONWOOD': '🌳',
    'ELM': '🌳', 'MAPLE': '🍁', 'OLIVE': '🫒', 'JUNIPER': '🌲',
    'OAK': '🌳', 'PINE': '🌲', 'CYPRESS_PINE': '🌲', 'HAZEL': '🌰',
    'GRAMINALES': '🌾', 'RAGWEED': '🌿', 'MUGWORT': '🌿',
    'JAPANESE_CEDAR': '🌲', 'JAPANESE_CYPRESS': '🌲'
};

const TURKISH_CITIES = {
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

const HOURLY_PATTERN = [
    0.05, 0.04, 0.03, 0.03, 0.04, 0.10,
    0.30, 0.55, 0.80, 0.95, 1.00, 0.90,
    0.70, 0.55, 0.45, 0.40, 0.45, 0.60,
    0.75, 0.65, 0.40, 0.20, 0.10, 0.06
];

// ==========================================
// UYGULAMA DURUMU
// ==========================================
let apiKey = localStorage.getItem('pollenApiKey') || '';
let lastSearchedCity = localStorage.getItem('lastCity') || '';
let lastCityCoords = JSON.parse(localStorage.getItem('lastCityCoords') || 'null');
let currentPollenData = null;
let currentTab = 'home';

// Profil verileri
let userProfile = JSON.parse(localStorage.getItem('userProfile') || JSON.stringify({
    name: '',
    avatar: '👤',
    allergies: []
}));

// Favori şehirler
let favorites = JSON.parse(localStorage.getItem('favoriteCities') || '[]');
// favorites format: [{ name: 'İstanbul', lat: 41.0082, lng: 28.9784, addedAt: timestamp }]

// ==========================================
// DOM
// ==========================================
const apiKeySection = document.getElementById('apiKeySection');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const searchSuggestions = document.getElementById('searchSuggestions');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const welcomeState = document.getElementById('welcomeState');
const resultsSection = document.getElementById('resultsSection');
const changeCityBtn = document.getElementById('changeCityBtn');
const favToggleBtn = document.getElementById('favToggleBtn');

// ==========================================
// INIT
// ==========================================
function init() {
    const today = new Date();
    document.getElementById('headerDate').textContent =
        `${today.getDate()} ${MONTHS_TR[today.getMonth()]}`;

    // Profili yükle
    loadProfile();
    updateFavBadge();

    // API key kontrol
    if (apiKey) {
        apiKeySection.classList.add('hidden');
        apiKeyInput.value = apiKey;
        if (lastSearchedCity && lastCityCoords) {
            fetchPollenData(lastCityCoords.lat, lastCityCoords.lng, lastSearchedCity);
        }
    }

    setupEventListeners();
}

function setupEventListeners() {
    // API Key
    saveApiKeyBtn.addEventListener('click', saveApiKey);
    apiKeyInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveApiKey(); });

    // Arama
    searchBtn.addEventListener('click', handleSearch);
    cityInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleSearch();
        if (e.key === 'Escape') hideSuggestions();
    });
    cityInput.addEventListener('input', handleCityInput);
    document.addEventListener('click', e => {
        if (!e.target.closest('.search-section')) hideSuggestions();
    });

    // Şehir değiştir
    changeCityBtn.addEventListener('click', () => {
        cityInput.value = '';
        cityInput.focus();
        resultsSection.style.display = 'none';
        welcomeState.classList.remove('hidden');
    });

    // Favori toggle
    favToggleBtn.addEventListener('click', toggleFavorite);

    // Map picker
    document.getElementById('mapPickerBtn').addEventListener('click', openMapModal);
    document.getElementById('mapCloseBtn').addEventListener('click', closeMapModal);
    document.getElementById('mapConfirmBtn').addEventListener('click', confirmMapSelection);
    document.getElementById('mapMyLocBtn').addEventListener('click', useMyLocation);

    // Retry
    retryBtn.addEventListener('click', () => {
        if (lastCityCoords && lastSearchedCity) {
            fetchPollenData(lastCityCoords.lat, lastCityCoords.lng, lastSearchedCity);
        }
    });

    // Tab navigation
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Profile button → profile tab
    document.getElementById('profileBtn').addEventListener('click', () => switchTab('profile'));

    // Fav go search
    document.getElementById('favGoSearch').addEventListener('click', () => switchTab('home'));

    // Fav refresh
    document.getElementById('favRefreshBtn').addEventListener('click', refreshAllFavorites);

    // Profile save
    document.getElementById('profileSaveBtn').addEventListener('click', saveProfile);

    // Avatar picker
    document.querySelectorAll('.avatar-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            userProfile.avatar = opt.dataset.avatar;
        });
    });

    // Allergy toggles
    document.querySelectorAll('#allergyOptions input').forEach(input => {
        input.addEventListener('change', () => {
            const allergies = [];
            document.querySelectorAll('#allergyOptions input:checked').forEach(cb => {
                allergies.push(cb.value);
            });
            userProfile.allergies = allergies;
            saveProfileData();
        });
    });

    // Profile API key save
    document.getElementById('profileApiSaveBtn').addEventListener('click', () => {
        const key = document.getElementById('profileApiKey').value.trim();
        if (key) {
            apiKey = key;
            localStorage.setItem('pollenApiKey', key);
            apiKeySection.classList.add('hidden');
            showToast('✅ API anahtarı kaydedildi');
        }
    });

    // Reset
    document.getElementById('profileResetBtn').addEventListener('click', () => {
        if (confirm('Tüm verileriniz silinecek. Emin misiniz?')) {
            localStorage.clear();
            location.reload();
        }
    });
}

// ==========================================
// TAB NAVİGASYONU
// ==========================================
function switchTab(tab) {
    currentTab = tab;
    // Tab buttons
    document.querySelectorAll('.tab-item').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });
    // Tab content
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const contentId = 'content' + tab.charAt(0).toUpperCase() + tab.slice(1);
    document.getElementById(contentId).classList.add('active');

    // Tab-specific init
    if (tab === 'favorites') renderFavorites();
    if (tab === 'profile') loadProfilePage();
}

// ==========================================
// PROFİL
// ==========================================
function loadProfile() {
    document.getElementById('headerAvatar').textContent = userProfile.avatar;
}

function loadProfilePage() {
    document.getElementById('profileAvatarLarge').textContent = userProfile.avatar;
    document.getElementById('profileNameDisplay').textContent = userProfile.name || 'Kullanıcı';
    document.getElementById('profileSubtitle').textContent =
        favorites.length > 0 ? `${favorites.length} favori şehir takip ediliyor` : 'Profilini düzenle';
    document.getElementById('profileNameInput').value = userProfile.name;
    document.getElementById('profileApiKey').value = apiKey;

    // Avatar selected state
    document.querySelectorAll('.avatar-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.avatar === userProfile.avatar);
    });

    // Allergy checkboxes
    document.getElementById('allergyTree').checked = userProfile.allergies.includes('TREE');
    document.getElementById('allergyGrass').checked = userProfile.allergies.includes('GRASS');
    document.getElementById('allergyWeed').checked = userProfile.allergies.includes('WEED');

    // Stats
    document.getElementById('statFavCount').textContent = favorites.length;
    document.getElementById('statAllergyCount').textContent = userProfile.allergies.length;
}

function saveProfile() {
    userProfile.name = document.getElementById('profileNameInput').value.trim();
    saveProfileData();
    loadProfile();
    loadProfilePage();
    showToast('✅ Profil kaydedildi');
}

function saveProfileData() {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    loadProfile();
    document.getElementById('statAllergyCount').textContent = userProfile.allergies.length;
}

// ==========================================
// FAVORİ SİSTEMİ
// ==========================================
function isFavorite(cityName) {
    return favorites.some(f => f.name === cityName);
}

function toggleFavorite() {
    if (!lastSearchedCity) return;

    if (isFavorite(lastSearchedCity)) {
        // Kaldır
        favorites = favorites.filter(f => f.name !== lastSearchedCity);
        favToggleBtn.classList.remove('is-fav');
        showToast(`💔 ${lastSearchedCity} favorilerden çıkarıldı`);
    } else {
        // Ekle
        favorites.push({
            name: lastSearchedCity,
            lat: lastCityCoords.lat,
            lng: lastCityCoords.lng,
            addedAt: Date.now()
        });
        favToggleBtn.classList.add('is-fav');
        favToggleBtn.classList.add('pop');
        setTimeout(() => favToggleBtn.classList.remove('pop'), 400);
        showToast(`❤️ ${lastSearchedCity} favorilere eklendi`);
    }
    saveFavorites();
    updateFavBadge();
}

function updateFavIcon() {
    if (isFavorite(lastSearchedCity)) {
        favToggleBtn.classList.add('is-fav');
    } else {
        favToggleBtn.classList.remove('is-fav');
    }
}

function saveFavorites() {
    localStorage.setItem('favoriteCities', JSON.stringify(favorites));
}

function updateFavBadge() {
    const badge = document.getElementById('favBadge');
    if (favorites.length > 0) {
        badge.textContent = favorites.length;
        badge.classList.add('show');
    } else {
        badge.classList.remove('show');
    }
}

// ==========================================
// FAVORİLER SAYFASI
// ==========================================
function renderFavorites() {
    const grid = document.getElementById('favGrid');
    const empty = document.getElementById('favEmpty');
    const refreshBtn = document.getElementById('favRefreshBtn');

    grid.innerHTML = '';

    if (favorites.length === 0) {
        empty.style.display = 'block';
        refreshBtn.style.display = 'none';
        return;
    }

    empty.style.display = 'none';
    refreshBtn.style.display = 'flex';

    for (const fav of favorites) {
        const card = document.createElement('div');
        card.className = 'fav-city-card';
        card.id = `fav-${fav.name.replace(/\s/g, '_')}`;
        card.innerHTML = `
            <div class="fav-city-top">
                <div class="fav-city-info">
                    <span class="fav-city-pin">📍</span>
                    <div>
                        <div class="fav-city-name">${fav.name}</div>
                        <div class="fav-city-region">Yükleniyor...</div>
                    </div>
                </div>
                <button class="fav-remove-btn" data-city="${fav.name}" title="Favorilerden Çıkar">✕</button>
            </div>
            <div class="fav-city-level" style="background:${UPI_BG_COLORS[0]}">
                <span class="fav-level-dot dot-0"></span>
                <span class="fav-level-text" style="color:${UPI_COLORS[0]}">Yükleniyor...</span>
            </div>
            <div class="fav-city-types"></div>
        `;

        // Şehre tıkla → ana sayfada göster
        card.addEventListener('click', (e) => {
            if (e.target.closest('.fav-remove-btn')) return;
            lastSearchedCity = fav.name;
            lastCityCoords = { lat: fav.lat, lng: fav.lng };
            localStorage.setItem('lastCity', fav.name);
            localStorage.setItem('lastCityCoords', JSON.stringify(lastCityCoords));
            switchTab('home');
            fetchPollenData(fav.lat, fav.lng, fav.name);
        });

        // Kaldır butonu
        card.querySelector('.fav-remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const name = e.currentTarget.dataset.city;
            favorites = favorites.filter(f => f.name !== name);
            saveFavorites();
            updateFavBadge();
            updateFavIcon();
            renderFavorites();
            showToast(`💔 ${name} favorilerden çıkarıldı`);
        });

        grid.appendChild(card);

        // Veri çek
        fetchFavCityData(fav);
    }
}

async function fetchFavCityData(fav) {
    if (!apiKey) return;
    const cardId = `fav-${fav.name.replace(/\s/g, '_')}`;
    const card = document.getElementById(cardId);
    if (!card) return;

    try {
        const url = `https://pollen.googleapis.com/v1/forecast:lookup?key=${apiKey}&location.latitude=${fav.lat}&location.longitude=${fav.lng}&days=1&languageCode=tr&plantsDescription=false`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('API error');
        const data = await response.json();

        const dayInfo = data.dailyInfo?.[0];
        if (!dayInfo) {
            card.querySelector('.fav-city-region').textContent = 'Veri yok';
            return;
        }

        // Region
        card.querySelector('.fav-city-region').textContent = getCountryName(data.regionCode || 'TR');

        // Max level
        let maxLevel = 0;
        if (dayInfo.pollenTypeInfo) {
            for (const type of dayInfo.pollenTypeInfo) {
                if (type.indexInfo?.value > maxLevel) maxLevel = type.indexInfo.value;
            }
        }

        // Level badge
        card.className = `fav-city-card upi-level-${maxLevel}`;
        const levelDiv = card.querySelector('.fav-city-level');
        levelDiv.style.background = UPI_BG_COLORS[maxLevel];
        levelDiv.querySelector('.fav-level-dot').className = `fav-level-dot dot-${maxLevel}`;
        const levelText = levelDiv.querySelector('.fav-level-text');
        levelText.textContent = UPI_LEVEL_NAMES[maxLevel];
        levelText.style.color = UPI_COLORS[maxLevel];

        // Type pills
        const typesDiv = card.querySelector('.fav-city-types');
        typesDiv.innerHTML = '';
        if (dayInfo.pollenTypeInfo) {
            for (const type of dayInfo.pollenTypeInfo) {
                const lvl = type.indexInfo?.value ?? 0;
                const name = POLLEN_TYPE_NAMES_TR[type.code] || type.displayName || type.code;
                const icon = POLLEN_TYPE_ICONS[type.code] || '🌱';
                const pill = document.createElement('span');
                pill.className = `fav-type-pill upi-${lvl}`;
                pill.innerHTML = `${icon} ${name}`;
                typesDiv.appendChild(pill);
            }
        }

    } catch (err) {
        const card2 = document.getElementById(cardId);
        if (card2) card2.querySelector('.fav-city-region').textContent = 'Veri alınamadı';
    }
}

async function refreshAllFavorites() {
    showToast('🔄 Tüm favoriler güncelleniyor...');
    for (const fav of favorites) {
        await fetchFavCityData(fav);
    }
    showToast('✅ Favoriler güncellendi');
}

// ==========================================
// TOAST BİLDİRİM
// ==========================================
function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove('show');
    // Force reflow
    void toast.offsetHeight;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ==========================================
// API KEY
// ==========================================
function saveApiKey() {
    const key = apiKeyInput.value.trim();
    if (!key) {
        apiKeyInput.style.borderColor = '#ff6b6b';
        setTimeout(() => apiKeyInput.style.borderColor = '', 2000);
        return;
    }
    apiKey = key;
    localStorage.setItem('pollenApiKey', key);
    apiKeySection.classList.add('hidden');
    showToast('✅ API anahtarı kaydedildi');
    if (lastSearchedCity && lastCityCoords) {
        fetchPollenData(lastCityCoords.lat, lastCityCoords.lng, lastSearchedCity);
    }
}

// ==========================================
// ŞEHİR ARAMA
// ==========================================
function handleCityInput() {
    const query = cityInput.value.trim().toLowerCase();
    if (query.length < 2) { hideSuggestions(); return; }
    const matches = [];
    for (const [key, city] of Object.entries(TURKISH_CITIES)) {
        if (key.includes(query) || city.name.toLowerCase().includes(query)) {
            if (!matches.find(m => m.name === city.name)) matches.push(city);
        }
    }
    if (matches.length === 0) { hideSuggestions(); return; }
    showSuggestions(matches.slice(0, 6));
}

function showSuggestions(cities) {
    searchSuggestions.innerHTML = '';
    for (const city of cities) {
        const isFav = isFavorite(city.name);
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `
            <span class="suggestion-pin">${isFav ? '❤️' : '📍'}</span>
            <span>${city.name}</span>
        `;
        item.addEventListener('click', () => {
            cityInput.value = city.name;
            hideSuggestions();
            selectCity(city);
        });
        searchSuggestions.appendChild(item);
    }
    searchSuggestions.classList.add('show');
}

function hideSuggestions() { searchSuggestions.classList.remove('show'); }

function handleSearch() {
    const query = cityInput.value.trim().toLowerCase();
    if (!query) return;
    if (!apiKey) { apiKeySection.classList.remove('hidden'); return; }
    const found = findCity(query);
    if (found) selectCity(found);
    else geocodeCity(query);
}

function findCity(query) {
    const normalized = query.toLowerCase()
        .replace(/İ/g, 'i').replace(/I/g, 'ı')
        .replace(/ş/g, 's').replace(/ç/g, 'c')
        .replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ğ/g, 'g');
    for (const [key, city] of Object.entries(TURKISH_CITIES)) {
        const cityNorm = key.replace(/İ/g, 'i').replace(/I/g, 'ı')
            .replace(/ş/g, 's').replace(/ç/g, 'c')
            .replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ğ/g, 'g');
        if (key === query || city.name.toLowerCase() === query || cityNorm === normalized) return city;
    }
    return null;
}

function selectCity(city) {
    lastSearchedCity = city.name;
    lastCityCoords = { lat: city.lat, lng: city.lng };
    localStorage.setItem('lastCity', city.name);
    localStorage.setItem('lastCityCoords', JSON.stringify(lastCityCoords));
    hideSuggestions();
    fetchPollenData(city.lat, city.lng, city.name);
}

async function geocodeCity(cityName) {
    showLoading();
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cityName)}&key=${apiKey}&language=tr`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'OK' && data.results.length > 0) {
            const r = data.results[0];
            const lat = r.geometry.location.lat;
            const lng = r.geometry.location.lng;
            const name = r.address_components[0]?.long_name || cityName;
            lastSearchedCity = name;
            lastCityCoords = { lat, lng };
            localStorage.setItem('lastCity', name);
            localStorage.setItem('lastCityCoords', JSON.stringify(lastCityCoords));
            fetchPollenData(lat, lng, name);
        } else {
            showError(`"${cityName}" için konum bulunamadı.`);
        }
    } catch (err) {
        showError('Konum aranırken bir hata oluştu.');
    }
}

// ==========================================
// POLLEN API
// ==========================================
async function fetchPollenData(lat, lng, cityName) {
    showLoading();
    try {
        const url = `https://pollen.googleapis.com/v1/forecast:lookup?key=${apiKey}&location.latitude=${lat}&location.longitude=${lng}&days=5&languageCode=tr&plantsDescription=true`;
        const res = await fetch(url);
        if (!res.ok) {
            const err = await res.json().catch(() => null);
            if (res.status === 403) throw new Error('API anahtarınız geçersiz veya Pollen API etkinleştirilmemiş.');
            if (res.status === 429) throw new Error('API istek limiti aşıldı.');
            throw new Error(err?.error?.message || `API hatası: ${res.status}`);
        }
        const data = await res.json();
        currentPollenData = data;
        hideLoading(); hideError();
        renderResults(data, cityName);
    } catch (err) {
        showError(err.message || 'Polen verileri yüklenirken bir hata oluştu.');
    }
}

// ==========================================
// UI STATE
// ==========================================
function showLoading() {
    loadingState.classList.add('show');
    errorState.classList.remove('show');
    welcomeState.classList.add('hidden');
    resultsSection.style.display = 'none';
}
function hideLoading() { loadingState.classList.remove('show'); }
function showError(msg) {
    hideLoading();
    errorMessage.textContent = msg;
    errorState.classList.add('show');
    resultsSection.style.display = 'none';
}
function hideError() { errorState.classList.remove('show'); }

// ==========================================
// SONUÇLARI RENDER
// ==========================================
function renderResults(data, cityName) {
    welcomeState.classList.add('hidden');
    resultsSection.style.display = 'block';

    document.getElementById('cityName').textContent = cityName;
    document.getElementById('cityRegion').textContent = data.regionCode ? getCountryName(data.regionCode) : '';

    updateFavIcon();

    const todayInfo = data.dailyInfo?.[0];
    if (!todayInfo) { showError('Bu bölge için polen verisi bulunamadı.'); return; }

    renderTodayOverview(todayInfo);
    renderPollenTypes(todayInfo);
    renderHourlyTimeline(todayInfo);
    renderPeakSummary(todayInfo);
    renderPlants(todayInfo);
    renderHealthRecommendations(todayInfo);
    renderForecast(data.dailyInfo);
}

function renderTodayOverview(dayInfo) {
    const today = new Date();
    document.getElementById('overviewDate').textContent =
        `${today.getDate()} ${MONTHS_TR[today.getMonth()]} ${today.getFullYear()}`;
    let maxLevel = 0;
    if (dayInfo.pollenTypeInfo) {
        for (const t of dayInfo.pollenTypeInfo) {
            if (t.indexInfo?.value > maxLevel) maxLevel = t.indexInfo.value;
        }
    }
    const badge = document.getElementById('overviewBadge');
    badge.style.background = UPI_BG_COLORS[maxLevel] || UPI_BG_COLORS[0];
    document.getElementById('badgeDot').className = `badge-dot dot-${maxLevel}`;
    const badgeText = document.getElementById('badgeText');
    badgeText.textContent = UPI_LEVEL_NAMES[maxLevel] || 'Yok';
    badgeText.style.color = UPI_COLORS[maxLevel] || UPI_COLORS[0];
}

function renderPollenTypes(dayInfo) {
    const grid = document.getElementById('pollenTypesGrid');
    grid.innerHTML = '';
    if (!dayInfo.pollenTypeInfo?.length) {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);font-size:13px;padding:20px;">Veri yok.</p>';
        return;
    }
    for (const type of dayInfo.pollenTypeInfo) {
        const code = type.code || '';
        const name = POLLEN_TYPE_NAMES_TR[code] || type.displayName || code;
        const icon = POLLEN_TYPE_ICONS[code] || '🌱';
        const lvl = type.indexInfo?.value ?? 0;
        const cat = translateCategory(type.indexInfo?.category);
        const inSeason = type.inSeason !== false;
        const card = document.createElement('div');
        card.className = `pollen-type-card${inSeason ? '' : ' not-in-season'}`;
        card.innerHTML = `<span class="pollen-type-icon">${icon}</span>
            <div class="pollen-type-name">${name}</div>
            <span class="pollen-type-level upi-${lvl}">${cat}</span>
            ${!inSeason ? '<div class="pollen-type-season">Mevsim dışı</div>' : ''}`;
        grid.appendChild(card);
    }
}

function renderHourlyTimeline(dayInfo) {
    const timeline = document.getElementById('hourlyTimeline');
    timeline.innerHTML = '';
    let maxUPI = 0;
    if (dayInfo.pollenTypeInfo) {
        for (const t of dayInfo.pollenTypeInfo) {
            if (t.indexInfo?.value > maxUPI) maxUPI = t.indexInfo.value;
        }
    }
    const typeColors = [];
    if (dayInfo.pollenTypeInfo) {
        for (const t of dayInfo.pollenTypeInfo) {
            const v = t.indexInfo?.value ?? 0;
            if (v > 0) typeColors.push({ code: t.code, value: v, name: POLLEN_TYPE_NAMES_TR[t.code] || t.displayName });
        }
    }
    for (let h = 0; h < 24; h++) {
        const m = HOURLY_PATTERN[h];
        const hPct = Math.max(4, m * 100);
        const cl = Math.min(5, Math.max(0, Math.round(maxUPI * m)));
        const bar = document.createElement('div');
        bar.className = 'hour-bar';
        bar.style.height = `${hPct}%`;
        bar.style.background = `linear-gradient(to top, ${UPI_COLORS[cl]}, ${hexToRGBA(UPI_COLORS[cl], (0.5 + m * 0.5) * 0.7)})`;
        const hourStr = `${String(h).padStart(2, '0')}:00`;
        let det = typeColors.map(t => {
            const tl = Math.min(5, Math.max(0, Math.round(t.value * m)));
            return `${t.name}: ${UPI_LEVEL_NAMES[tl]}`;
        }).join('<br>');
        bar.innerHTML = `<div class="hour-tooltip">
            <div class="hour-tooltip-time">${hourStr}</div>
            <div class="hour-tooltip-level" style="color:${UPI_COLORS[cl]}">${UPI_LEVEL_NAMES[cl]}</div>
            ${det ? `<div style="margin-top:4px;font-size:10px;opacity:0.7;">${det}</div>` : ''}
        </div>`;
        bar.style.animationDelay = `${h * 30}ms`;
        bar.style.animation = 'barGrow 0.6s cubic-bezier(0.34,1.56,0.64,1) both';
        timeline.appendChild(bar);
    }
    if (!document.getElementById('barAnimStyle')) {
        const s = document.createElement('style');
        s.id = 'barAnimStyle';
        s.textContent = `@keyframes barGrow { from { height: 0% !important; opacity: 0; } to { opacity: 1; } }`;
        document.head.appendChild(s);
    }
}

function renderPeakSummary(dayInfo) {
    const c = document.getElementById('peakCards');
    c.innerHTML = '';
    let maxUPI = 0;
    if (dayInfo.pollenTypeInfo) {
        for (const t of dayInfo.pollenTypeInfo) { if (t.indexInfo?.value > maxUPI) maxUPI = t.indexInfo.value; }
    }
    const slots = [
        { emoji: '🌅', label: 'Sabah', range: '06:00 – 10:00', hours: [6,7,8,9,10] },
        { emoji: '☀️', label: 'Öğle', range: '11:00 – 15:00', hours: [11,12,13,14,15] },
        { emoji: '🌇', label: 'Akşam', range: '16:00 – 19:00', hours: [16,17,18,19] },
        { emoji: '🌙', label: 'Gece', range: '20:00 – 05:00', hours: [20,21,22,23,0,1,2,3,4,5] }
    ];
    for (const s of slots) {
        let avg = 0;
        for (const h of s.hours) avg += HOURLY_PATTERN[h];
        avg /= s.hours.length;
        const lvl = Math.min(5, Math.max(0, Math.round(maxUPI * avg)));
        const card = document.createElement('div');
        card.className = 'peak-card';
        card.innerHTML = `<div class="peak-card-header"><span class="peak-card-emoji">${s.emoji}</span><span class="peak-card-label">${s.label}</span></div>
            <div class="peak-card-time">${s.range}</div>
            <span class="peak-card-level upi-${lvl}">${UPI_LEVEL_NAMES[lvl]}</span>`;
        c.appendChild(card);
    }
}

function renderPlants(dayInfo) {
    const list = document.getElementById('plantsList');
    list.innerHTML = '';
    if (!dayInfo.plantInfo?.length) { document.getElementById('plantsSection').style.display = 'none'; return; }
    document.getElementById('plantsSection').style.display = 'block';
    const sorted = [...dayInfo.plantInfo].sort((a, b) => {
        if (a.inSeason && !b.inSeason) return -1;
        if (!a.inSeason && b.inSeason) return 1;
        return (b.indexInfo?.value ?? 0) - (a.indexInfo?.value ?? 0);
    });
    for (const p of sorted) {
        const code = p.code || '';
        const name = p.displayName || code;
        const icon = PLANT_ICONS[code] || '🌱';
        const lvl = p.indexInfo?.value ?? 0;
        const cat = translateCategory(p.indexInfo?.category);
        const inS = p.inSeason !== false;
        const item = document.createElement('div');
        item.className = `plant-item${inS ? '' : ' not-in-season'}`;
        item.innerHTML = `<div class="plant-item-left"><span class="plant-emoji">${icon}</span>
            <div><div class="plant-name">${name}</div><div class="plant-season-tag">${inS ? '✅ Mevsimde' : '❌ Mevsim dışı'}</div></div></div>
            <span class="plant-level-badge upi-${lvl}"><span class="plant-level-value">${lvl}</span>${cat}</span>`;
        list.appendChild(item);
    }
}

function renderHealthRecommendations(dayInfo) {
    const list = document.getElementById('healthList');
    list.innerHTML = '';
    const recs = [];
    if (dayInfo.pollenTypeInfo) {
        for (const t of dayInfo.pollenTypeInfo) {
            if (t.healthRecommendations) recs.push(...t.healthRecommendations);
        }
    }
    if (recs.length === 0) { document.getElementById('healthSection').style.display = 'none'; return; }
    document.getElementById('healthSection').style.display = 'block';
    for (const r of [...new Set(recs)]) {
        const item = document.createElement('div');
        item.className = 'health-item';
        item.innerHTML = `<span class="health-bullet"></span><span>${r}</span>`;
        list.appendChild(item);
    }
}

function renderForecast(dailyInfo) {
    const c = document.getElementById('forecastCards');
    c.innerHTML = '';
    if (!dailyInfo?.length) return;
    for (let i = 0; i < dailyInfo.length; i++) {
        const day = dailyInfo[i];
        if (!day.date) continue;
        const jsDate = new Date(day.date.year, day.date.month - 1, day.date.day);
        const dayName = DAYS_TR[jsDate.getDay()];
        let maxLvl = 0;
        if (day.pollenTypeInfo) {
            for (const t of day.pollenTypeInfo) { if (t.indexInfo?.value > maxLvl) maxLvl = t.indexInfo.value; }
        }
        const card = document.createElement('div');
        card.className = `forecast-card${i === 0 ? ' active' : ''}`;
        card.innerHTML = `<span class="forecast-card-day">${dayName}</span>
            <span class="forecast-card-date">${day.date.day}</span>
            <span class="forecast-card-dot dot-${maxLvl}"></span>
            <span class="forecast-card-level" style="color:${UPI_COLORS[maxLvl]}">${UPI_LEVEL_NAMES[maxLvl]}</span>`;
        card.addEventListener('click', () => {
            renderTodayOverview(day); renderPollenTypes(day);
            renderHourlyTimeline(day); renderPeakSummary(day);
            renderPlants(day); renderHealthRecommendations(day);
            c.querySelectorAll('.forecast-card').forEach(x => x.classList.remove('active'));
            card.classList.add('active');
            document.getElementById('overviewDate').textContent =
                `${day.date.day} ${MONTHS_TR[day.date.month - 1]} ${day.date.year}`;
        });
        c.appendChild(card);
    }
}

// ==========================================
// YARDIMCI
// ==========================================
function translateCategory(cat) { return cat ? (UPI_CATEGORIES[cat] || cat) : 'Yok'; }
function hexToRGBA(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
}
function getCountryName(code) {
    const c = { 'TR':'Türkiye','US':'ABD','DE':'Almanya','FR':'Fransa','IT':'İtalya',
        'ES':'İspanya','GB':'İngiltere','NL':'Hollanda','BE':'Belçika','AT':'Avusturya',
        'CH':'İsviçre','GR':'Yunanistan','BG':'Bulgaristan','RO':'Romanya','PL':'Polonya',
        'SE':'İsveç','NO':'Norveç','DK':'Danimarka','FI':'Finlandiya','PT':'Portekiz',
        'HU':'Macaristan','JP':'Japonya','AU':'Avustralya','CA':'Kanada','BR':'Brezilya',
        'IL':'İsrail','IN':'Hindistan','KR':'Güney Kore' };
    return c[code] || code;
}

// ==========================================
// HARİTA SİSTEMİ (Leaflet.js)
// ==========================================
let leafletMap = null;
let mapMarker = null;
let mapSelectedCoords = null;
let mapSelectedName = '';

function openMapModal() {
    const modal = document.getElementById('mapModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    // Reset state
    mapSelectedCoords = null;
    mapSelectedName = '';
    document.getElementById('mapCoordsText').textContent = 'Haritaya tıklayarak konum seçin';
    document.getElementById('mapSelectedName').textContent = '';
    document.getElementById('mapConfirmBtn').disabled = true;

    // Init map on first open
    setTimeout(() => {
        if (!leafletMap) {
            initMap();
        } else {
            leafletMap.invalidateSize();
        }
    }, 100);
}

function closeMapModal() {
    document.getElementById('mapModal').classList.remove('show');
    document.body.style.overflow = '';
}

function initMap() {
    const container = document.getElementById('mapContainer');

    // Default center: Turkey
    const defaultLat = lastCityCoords?.lat || 39.0;
    const defaultLng = lastCityCoords?.lng || 35.0;
    const defaultZoom = lastCityCoords ? 10 : 6;

    leafletMap = L.map(container, {
        center: [defaultLat, defaultLng],
        zoom: defaultZoom,
        zoomControl: true,
        attributionControl: false
    });

    // Dark-friendly tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
    }).addTo(leafletMap);

    // Click handler
    leafletMap.on('click', onMapClick);
}

function onMapClick(e) {
    const { lat, lng } = e.latlng;
    mapSelectedCoords = { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };

    // Update coords display
    document.getElementById('mapCoordsText').textContent =
        `${mapSelectedCoords.lat}, ${mapSelectedCoords.lng}`;
    document.getElementById('mapConfirmBtn').disabled = false;

    // Place / update marker
    if (mapMarker) {
        leafletMap.removeLayer(mapMarker);
    }

    const pulseIcon = L.divIcon({
        className: 'map-pulse-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
    mapMarker = L.marker([lat, lng], { icon: pulseIcon }).addTo(leafletMap);

    // Reverse geocode
    reverseGeocode(lat, lng);
}

async function reverseGeocode(lat, lng) {
    const nameEl = document.getElementById('mapSelectedName');
    nameEl.textContent = 'Konum belirleniyor...';

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=tr`;
        const res = await fetch(url, { headers: { 'User-Agent': 'AlerjiTakip/1.0' } });
        const data = await res.json();

        if (data && data.address) {
            const addr = data.address;
            const city = addr.city || addr.town || addr.county || addr.state || addr.country || '';
            const district = addr.suburb || addr.neighbourhood || addr.village || '';
            const country = addr.country || '';

            mapSelectedName = city;
            if (district && district !== city) {
                nameEl.textContent = `${district}, ${city} - ${country}`;
            } else {
                nameEl.textContent = `${city} - ${country}`;
            }
        } else {
            mapSelectedName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            nameEl.textContent = mapSelectedName;
        }
    } catch (err) {
        mapSelectedName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        nameEl.textContent = mapSelectedName;
    }
}

function useMyLocation() {
    if (!navigator.geolocation) {
        showToast('⚠️ Tarayıcınız konum özelliğini desteklemiyor');
        return;
    }

    document.getElementById('mapSelectedName').textContent = 'Konumunuz belirleniyor...';

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            mapSelectedCoords = { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
            document.getElementById('mapCoordsText').textContent =
                `${mapSelectedCoords.lat}, ${mapSelectedCoords.lng}`;
            document.getElementById('mapConfirmBtn').disabled = false;

            // Move map
            leafletMap.setView([lat, lng], 13, { animate: true });

            // Place marker
            if (mapMarker) leafletMap.removeLayer(mapMarker);
            const pulseIcon = L.divIcon({
                className: 'map-pulse-marker',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            mapMarker = L.marker([lat, lng], { icon: pulseIcon }).addTo(leafletMap);

            reverseGeocode(lat, lng);
            showToast('📍 Konumunuz bulundu');
        },
        (err) => {
            if (err.code === 1) {
                showToast('⚠️ Konum izni reddedildi');
            } else {
                showToast('⚠️ Konum belirlenemedi');
            }
            document.getElementById('mapSelectedName').textContent = '';
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function confirmMapSelection() {
    if (!mapSelectedCoords) return;

    const name = mapSelectedName || `${mapSelectedCoords.lat}, ${mapSelectedCoords.lng}`;

    lastSearchedCity = name;
    lastCityCoords = { lat: mapSelectedCoords.lat, lng: mapSelectedCoords.lng };
    localStorage.setItem('lastCity', name);
    localStorage.setItem('lastCityCoords', JSON.stringify(lastCityCoords));

    closeMapModal();
    switchTab('home');
    fetchPollenData(mapSelectedCoords.lat, mapSelectedCoords.lng, name);
}

// ==========================================
// BAŞLAT
// ==========================================
init();
