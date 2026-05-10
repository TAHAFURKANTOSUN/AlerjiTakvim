import { createContext, useContext, useState, useEffect } from 'react';
import { getMe, logout as apiLogout, updateProfile as apiUpdateProfile, updateFavorites as apiUpdateFavorites } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    // Global 401 event'ini dinle — apiRequest token süresi dolduğunda fırlatır.
    // Bu sayede herhangi bir API çağrısı 401 alırsa kullanıcı otomatik
    // logout edilip login ekranına yönlendirilir.
    useEffect(() => {
        function handleUnauthorized(e) {
            console.warn('[Auth] Oturum sona erdi:', e.detail?.message || '401');
            setUser(null);
            // Token zaten apiRequest'te silindi; burada sadece state'i sıfırlıyoruz
        }
        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, []);

    async function checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const data = await getMe();
            setUser(data.user);
        } catch (err) {
            localStorage.removeItem('token');
            setUser(null);
        }
        setLoading(false);
    }

    function loginUser(userData) {
        setUser(userData);
    }

    function logoutUser() {
        apiLogout();
        setUser(null);
    }

    async function updateUserProfile(profileData) {
        const data = await apiUpdateProfile(profileData);
        setUser(data.user);
        return data;
    }

    async function updateUserFavorites(favorites) {
        const data = await apiUpdateFavorites(favorites);
        setUser(prev => ({ ...prev, favorites: data.favorites }));
        return data;
    }

    function clearUser() {
        setUser(null);
        localStorage.removeItem('token');
    }

    return (
        <AuthContext.Provider value={{
            user, loading, loginUser, logoutUser,
            updateUserProfile, updateUserFavorites, clearUser, checkAuth
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
