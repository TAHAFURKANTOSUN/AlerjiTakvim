import { useState, useRef, useEffect } from 'react';
import { TURKISH_CITIES } from '../../data/mockData';

export default function CitySelector({ selectedCity, onCityChange }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = query.trim()
    ? TURKISH_CITIES.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase())
      )
    : TURKISH_CITIES;

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(city) {
    onCityChange(city);
    setQuery('');
    setIsOpen(false);
    setHighlightIndex(-1);
  }

  function handleKeyDown(e) {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((p) => Math.min(p + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((p) => Math.max(p - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[highlightIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
        şehir seç
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none">
          📍
        </span>
        <input
          ref={inputRef}
          id="city-search"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedCity ? selectedCity.name : 'Şehir ara...'}
          className="w-full h-11 bg-[rgba(255,255,255,0.05)] border border-[var(--glass-border)] rounded-xl
                     pl-10 pr-10 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]
                     outline-none transition-all duration-300
                     focus:border-[var(--accent-violet)] focus:shadow-[0_0_20px_rgba(139,92,246,0.15)]"
          autoComplete="off"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] pointer-events-none">
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="city-dropdown">
          {filtered.map((city, i) => (
            <div
              key={city.key}
              className={`city-dropdown-item ${i === highlightIndex ? 'active' : ''}`}
              onClick={() => handleSelect(city)}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              <span className="text-sm">📍</span>
              <span>{city.name}</span>
            </div>
          ))}
        </div>
      )}

      {isOpen && filtered.length === 0 && query && (
        <div className="city-dropdown">
          <div className="p-4 text-center text-sm text-[var(--text-muted)]">
            Sonuç bulunamadı
          </div>
        </div>
      )}
    </div>
  );
}
