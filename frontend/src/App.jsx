import { PollenProvider } from './context/PollenContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { UsageProvider } from './context/UsageContext';
import MembershipModals from './components/membership/MembershipModals';
import CleanDashboard from './pages/CleanDashboard';
import './index.css';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UsageProvider>
          <PollenProvider>
            <CleanDashboard />
            <MembershipModals />
          </PollenProvider>
        </UsageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
