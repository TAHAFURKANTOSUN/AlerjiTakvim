import { createContext, useContext, useState, useEffect } from 'react';
import { getMe, logout as apiLogout, updateProfile as apiUpdateProfile, updateFavorites as apiUpdateFavorites } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
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
