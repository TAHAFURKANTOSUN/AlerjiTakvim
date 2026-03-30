import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import BottomTabBar from './components/BottomTabBar';
import Toast from './components/Toast';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PollenPage from './pages/PollenPage';
import FavoritesPage from './pages/FavoritesPage';
import ProfilePage from './pages/ProfilePage';
import './index.css';

function AppLayout() {
    const { user } = useAuth();

    return (
        <div className="app-container">
            {user && <Navbar />}
            {user && <BottomTabBar />}
            <div className="page-content">
                <Routes>
                    <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
                    <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
                    <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                    <Route path="/pollen" element={<ProtectedRoute><PollenPage /></ProtectedRoute>} />
                    <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
            <Toast />
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppLayout />
            </AuthProvider>
        </BrowserRouter>
    );
}
