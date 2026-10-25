import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, Bell, Droplets, ListChecks, ReceiptText, TrendingUp, CalendarCheck, Calculator, CloudSun, Home, Landmark, LayoutDashboard, LogOut, Package, ScanSearch, Settings, Sprout, Store, Tractor, User, Wallet, Wheat, Wrench } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useToast } from '../../components/common/Toast.jsx';

// Every page linked below renders inside this shell, so the sidebar stays put wherever the farmer clicks.
const inside = [
  { to: '/my-overview', key: 'nav.overview', icon: LayoutDashboard },
  { to: '/my-farm', key: 'nav.myFarm', icon: Tractor },
  { to: '/my-crops', key: 'nav.myCrops', icon: Wheat },
  { to: '/my-tasks', key: 'nav.myTasks', icon: ListChecks },
  { to: '/my-expenses', key: 'nav.myExpenses', icon: ReceiptText },
  { to: '/my-profit-loss', key: 'nav.profitLoss', icon: TrendingUp },
];
const tools = [
  { to: '/disease', key: 'nav.cropDoctor', icon: ScanSearch },
  { to: '/calculators', key: 'nav.farmerCalculator', icon: Calculator },   // one entry: the page opens the 4 calculators
  { to: '/weather', key: 'nav.weather', icon: CloudSun },
  { to: '/irrigation', key: 'nav.irrigation', icon: Droplets },
  { to: '/sell-produce', key: 'nav.sellProduce', icon: Sprout },
  { to: '/my-products', key: 'nav.myProducts', icon: Store },
  { to: '/my-sales', key: 'nav.mySales', icon: Package },
  { to: '/my-analytics', key: 'seller.nav_analytics', icon: BarChart3 },
  { to: '/my-earnings', key: 'seller.nav_earnings', icon: Wallet },
  { to: '/my-payout', key: 'payout.nav', icon: Landmark },
  { to: '/my-equipment', key: 'payout.navEquipment', icon: Wrench },
  { to: '/my-orders', key: 'nav.myOrders', icon: Package },
  { to: '/my-bookings', key: 'nav.myBookings', icon: CalendarCheck },
  { to: '/notifications', key: 'nav.notifications', icon: Bell },
  { to: '/profile', key: 'nav.profile', icon: User },
  { to: '/my-settings', key: 'seller.nav_settings', icon: Settings },
  { to: '/', key: 'nav.home', icon: Home },
];

// The sidebar is only navigation. The backend checks the farmer role on every /api/dashboard, /api/farms and /api/crops call.
// The site navbar and footer stay as they are: this is the same website, not a separate app.
export default function FarmerShell() {
  const { t } = useI18n(); const { user, logout } = useAuth(); const { notify } = useToast(); const navigate = useNavigate();
  const link = ({ isActive }) => `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-forest text-white' : 'text-ink/80 hover:bg-leaf-light'}`;
  const out = async () => { await logout(); navigate('/', { replace: true }); notify(t('auth.logoutSuccess')); };
  const item = ({ to, key, icon: Icon }, end) => <NavLink key={to} to={to} end={end} className={link}><Icon className="h-4 w-4" aria-hidden="true" /> {t(key)}</NavLink>;
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[15rem_1fr]">
      <aside className="lg:sticky lg:top-36 lg:self-start">
        <div className="mb-3 hidden rounded-xl bg-leaf-light p-3 lg:block">
          <p className="truncate font-semibold text-forest-dark">{user.name}</p>
          <p className="text-xs text-ink/65">{t('farmer.panel')}</p>
        </div>
        <nav aria-label={t('farmer.panel')} className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {inside.map((i) => item(i, true))}
          <span className="mx-1 hidden border-t border-earth/15 lg:my-1 lg:block" aria-hidden="true" />
          {tools.map((i) => item(i, i.to === '/'))}
          <button type="button" onClick={out} className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50"><LogOut className="h-4 w-4" aria-hidden="true" /> {t('nav.logout')}</button>
        </nav>
      </aside>
      {/* Pages bring their own centred container and padding; inside the shell the column already provides the layout. */}
      <section className="min-w-0 [&>.mx-auto]:!mx-0 [&>.mx-auto]:!px-0 [&>.mx-auto]:!py-0"><Outlet /></section>
    </div>
  );
}

// For pages that every role can open (weather, calculators, notifications, profile...): farmers get the sidebar, others see the plain page.
export function FarmerAwareLayout() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user?.role === 'farmer' ? <FarmerShell /> : <Outlet />;
}
