import { PollenProvider } from './context/PollenContext';
import { ThemeProvider } from './context/ThemeContext';
import CleanDashboard from './pages/CleanDashboard';
import './index.css';

export default function App() {
  return (
    <ThemeProvider>
      <PollenProvider>
        <CleanDashboard />
      </PollenProvider>
    </ThemeProvider>
  );
}
