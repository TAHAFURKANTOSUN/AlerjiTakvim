import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useState } from 'react';
import { usePollen } from '../../context/PollenContext';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-[rgba(17,21,40,0.97)] border border-[var(--glass-border)] rounded-lg p-3 backdrop-blur-xl shadow-lg text-xs min-w-[120px]">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full shadow-sm" style={{ background: d.payload.color }} />
        <span className="text-[var(--text-secondary)] flex-1">{d.name}</span>
        <span className="font-bold text-[var(--text-primary)]">{d.value}%</span>
      </div>
    </div>
  );
}

export default function DensityChart({ isWrapped }) {
  const { pollenData } = usePollen();
  const data = pollenData.density;
  const [chartType, setChartType] = useState('pie');

  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0);

  const content = (
    <div className="px-5 pb-5">
      <div className="flex justify-end mb-3">
        <div className="flex bg-[rgba(255,255,255,0.04)] rounded-lg p-1 gap-0.5 border border-[rgba(255,255,255,0.04)]">
          {[['pie','Pasta'],['bar','Çubuk']].map(([type, label]) => (
            <button key={type} onClick={() => setChartType(type)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all duration-200
                ${chartType === type ? 'bg-[var(--accent-violet)] text-white shadow-md shadow-[rgba(139,92,246,0.3)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0" style={{ minHeight: '220px' }}>
        <ResponsiveContainer width="100%" height={220}>
          {chartType === 'pie' ? (
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius="52%" outerRadius="82%" paddingAngle={4}
                   dataKey="value" stroke="none" animationDuration={800}>
                {data.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          ) : (
            <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={800}>
                {data.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      {/* Legend with progress bars */}
      <div className="mt-4 pt-3 border-t border-[var(--glass-border)] space-y-2.5">
        {data.map((item, i) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}30` }} />
              <span className="text-xs text-[var(--text-secondary)] flex-1">{item.name}</span>
              <div className="w-16 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: item.color }} />
              </div>
              <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums w-8 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isWrapped) return content;

  return (
    <div className="glass-card p-5 lg:p-6 animate-slide-right h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[rgba(139,92,246,0.12)] flex items-center justify-center text-sm">🥧</div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            polen yoğunluk grafiği
          </h3>
        </div>
      </div>
      {content}
    </div>
  );
}
