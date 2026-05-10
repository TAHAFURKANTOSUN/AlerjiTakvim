import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className="clean-theme-toggle"
      onClick={toggleTheme}
      title={isDark ? 'Aydınlık temaya geç' : 'Karanlık temaya geç'}
      aria-label={isDark ? 'Aydınlık temaya geç' : 'Karanlık temaya geç'}
      aria-pressed={isDark}
    >
      {/* Sun icon (görünür: karanlık modda) */}
      <span className="sun-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="2"  x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="2"  y1="12" x2="4"  y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22" />
          </g>
        </svg>
      </span>

      {/* Moon icon (görünür: aydınlık modda) */}
      <span className="moon-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </span>
    </button>
  );
}
