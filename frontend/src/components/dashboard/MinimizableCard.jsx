import { useState, useRef, useEffect } from 'react';

export default function MinimizableCard({ title, icon, children, defaultMinimized = false, className = '', animationClass = '' }) {
  const [minimized, setMinimized] = useState(defaultMinimized);
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState('auto');

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight + 'px');
    }
  }, [children, minimized]);

  return (
    <div className={`glass-card overflow-hidden ${animationClass} ${className}`}>
      {/* Header — always visible */}
      <div
        className="flex items-center justify-between px-5 py-3 cursor-pointer select-none
                   hover:bg-[rgba(255,255,255,0.02)] transition-colors duration-200"
        onClick={() => setMinimized(prev => !prev)}
      >
        <div className="flex items-center gap-2">
          {icon && (
            <div className="w-7 h-7 rounded-lg bg-[rgba(139,92,246,0.12)] flex items-center justify-center text-sm">
              {icon}
            </div>
          )}
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            {title}
          </h3>
        </div>
        <button
          className={`minimize-toggle-btn ${minimized ? 'minimized' : ''}`}
          title={minimized ? 'Genişlet' : 'Küçült'}
          onClick={(e) => { e.stopPropagation(); setMinimized(prev => !prev); }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d={minimized ? "M3 5.5L7 9.5L11 5.5" : "M3 9.5L7 5.5L11 9.5"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Content — collapsible */}
      <div
        ref={contentRef}
        className="minimizable-content"
        style={{
          maxHeight: minimized ? '0px' : contentHeight,
          opacity: minimized ? 0 : 1,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}
