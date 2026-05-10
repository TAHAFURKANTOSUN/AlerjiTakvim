// ==========================================
// API İSTEK WRAPPER
// ==========================================
import { API_BASE } from '../utils/constants';

function getToken() {
    return localStorage.getItem('token');
}

export async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        // 401 → token geçersiz veya süresi dolmuş. Eski token'ı temizle ve
        // AuthContext'in dinlediği global bir event fırlat (decoupled yaklaşım).
        // Login/register endpoint'lerinde 401 yanlış parola anlamına gelir,
        // bu durumda logout tetiklemeyiz.
        const isAuthEndpoint =
            endpoint === '/api/login' || endpoint === '/api/register';
        if (response.status === 401 && !isAuthEndpoint) {
            localStorage.removeItem('token');
            // CustomEvent — AuthProvider bunu yakalayıp user state'ini temizler
            window.dispatchEvent(new CustomEvent('auth:unauthorized', {
                detail: { endpoint, message: data?.error },
            }));
        }
        throw { status: response.status, ...data };
    }

    return data;
}

export async function login(email, password) {
    const data = await apiRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('token', data.token);
    return data;
}

export async function register(name, email, password, passwordConfirm) {
    const data = await apiRequest('/api/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, passwordConfirm }),
    });
    localStorage.setItem('token', data.token);
    return data;
}

export async function getMe() {
    return await apiRequest('/api/me');
}

export async function updateProfile(profileData) {
    return await apiRequest('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
    });
}

export async function updateFavorites(favorites) {
    return await apiRequest('/api/favorites', {
        method: 'PUT',
        body: JSON.stringify({ favorites }),
    });
}

export async function deleteAccount(password) {
    const data = await apiRequest('/api/account', {
        method: 'DELETE',
        body: JSON.stringify({ password }),
    });
    localStorage.removeItem('token');
    return data;
}

export async function fetchPollen(lat, lng, days = 5) {
    return await apiRequest(`/api/pollen?lat=${lat}&lng=${lng}&days=${days}`);
}

export async function sendChatMessage(message, locationName, lat, lng, userAllergens, history) {
    return await apiRequest('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message, locationName, lat, lng, userAllergens, history }),
    });
}

export function logout() {
    localStorage.removeItem('token');
}
