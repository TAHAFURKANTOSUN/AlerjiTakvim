import { usePollen } from '../context/PollenContext';
import MapSelector from '../components/dashboard/MapSelector';
import DailySummary from '../components/dashboard/DailySummary';
import ForecastPanel from '../components/dashboard/ForecastPanel';
import HourlyChart from '../components/dashboard/HourlyChart';
import DensityChart from '../components/dashboard/DensityChart';
import ProfileButton from '../components/dashboard/ProfileButton';
import Chatbot from '../components/dashboard/Chatbot';
import MinimizableCard from '../components/dashboard/MinimizableCard';
import DashboardProfilePage from '../components/dashboard/DashboardProfilePage';

export default function PollenDashboard() {
  const { selectedLocation, currentView, setCurrentView } = usePollen();

  const today = new Date();
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const dateStr = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

  // Profile page view
  if (currentView === 'profile') {
    return (
      <div className="min-h-screen relative pb-8">
        <header className="sticky top-0 z-[100] backdrop-blur-xl bg-[rgba(11,14,26,0.88)] border-b border-[var(--glass-border)]">
          <div className="max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-10 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-emerald)]
                              flex items-center justify-center text-lg shadow-lg shadow-[rgba(139,92,246,0.3)]">
                🌿
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-[var(--accent-violet)] via-[var(--accent-blue)] to-[var(--accent-cyan)]
                             bg-clip-text text-transparent tracking-tight">
                alerji takip
              </h1>
            </div>
          </div>
        </header>
        <main className="flex justify-center px-5 sm:px-8 lg:px-10 py-6 lg:py-8">
          <div className="w-full max-w-[700px]">
            <DashboardProfilePage onClose={() => setCurrentView('dashboard')} />
          </div>
        </main>
      </div>
    );
  }

  // Dashboard view
  return (
    <div className="min-h-screen relative pb-8">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-[100] backdrop-blur-xl bg-[rgba(11,14,26,0.88)] border-b border-[var(--glass-border)]">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-emerald)]
                            flex items-center justify-center text-lg shadow-lg shadow-[rgba(139,92,246,0.3)]">
              🌿
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-[var(--accent-violet)] via-[var(--accent-blue)] to-[var(--accent-cyan)]
                           bg-clip-text text-transparent tracking-tight">
              alerji takip
            </h1>
          </div>
          <div className="flex items-center gap-5">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[var(--glass-border)]">
              <span className="text-xs">📅</span>
              <span className="text-xs text-[var(--text-secondary)] font-medium">{dateStr}</span>
            </div>
            <ProfileButton />
          </div>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-10 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7">

          {/* ===== COL 1: LEFT SIDEBAR ===== */}
          <aside className="lg:col-span-3 flex flex-col gap-5">
            <MinimizableCard title="Harita" icon="🗺️" animationClass="animate-slide-left">
              <MapSelectorContent />
            </MinimizableCard>

            <MinimizableCard title="Günlük Özet" icon="📋" animationClass="animate-fade-in-up delay-2">
              <DailySummaryContent />
            </MinimizableCard>

            <MinimizableCard title="5 Günlük Tahmin" icon="📊" animationClass="animate-fade-in-up delay-3">
              <ForecastPanelContent />
            </MinimizableCard>
          </aside>

          {/* ===== COL 2: CENTER — Chatbot (swapped) ===== */}
          <section className="lg:col-span-6 min-w-0">
            <HourlyChart />
          </section>

          {/* ===== COL 3: RIGHT SIDEBAR ===== */}
          <aside className="lg:col-span-3 flex flex-col gap-5">
            <MinimizableCard title="Polen Yoğunluk Grafiği" icon="🥧" animationClass="animate-slide-right">
              <DensityChartContent />
            </MinimizableCard>

            {/* Weather info */}
            <MinimizableCard title="Hava Durumu" icon="☁️">
              <div className="px-5 pb-5">
                <div className="grid grid-cols-2 gap-3">
                  <WeatherItem icon="🌡️" label="Sıcaklık" value="22°C" color="text-orange-400" />
                  <WeatherItem icon="💧" label="Nem" value="%65" color="text-blue-400" />
                  <WeatherItem icon="💨" label="Rüzgar" value="12 km/s" color="text-cyan-400" />
                  <WeatherItem icon="🌞" label="UV İndeks" value="Orta" color="text-yellow-400" />
                </div>
              </div>
            </MinimizableCard>

            {/* Seasonal tip */}
            <MinimizableCard title="Mevsimsel İpucu" icon="💡">
              <div className="px-5 pb-5 overflow-hidden relative group">
                <div className="absolute -top-6 -right-6 text-7xl opacity-[0.06] group-hover:opacity-[0.1] transition-opacity duration-500">🌸</div>
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed relative z-10">
                  İlkbahar aylarında ağaç polenleri yoğundur. Sabah erken saatlerde ve akşam geç saatlerde
                  dışarı çıkmak polen maruziyetini azaltabilir.
                </p>
                <div className="mt-3 pt-3 border-t border-[var(--glass-border)] flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                  <span>📆</span>
                  <span>Mart – Mayıs dönemi için geçerli</span>
                </div>
              </div>
            </MinimizableCard>
          </aside>
        </div>
      </main>

      <Chatbot />
    </div>
  );
}

/* ─── Wrapper sub-components that extract inner content from existing components ─── */

function MapSelectorContent() {
  return (
    <div className="-mt-3">
      <MapSelector isWrapped />
    </div>
  );
}

function DailySummaryContent() {
  return <DailySummary isWrapped />;
}

function ForecastPanelContent() {
  return <ForecastPanel isWrapped />;
}

function DensityChartContent() {
  return <DensityChart isWrapped />;
}

function WeatherItem({ icon, label, value, color }) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)]
                    hover:border-[var(--glass-border-hover)] transition-all duration-200">
      <span className="text-lg">{icon}</span>
      <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-bold ${color || 'text-[var(--text-primary)]'}`}>{value}</span>
    </div>
  );
}
