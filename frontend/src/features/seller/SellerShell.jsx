import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, Bell, Home, LogOut, Package, PackagePlus, Settings, ShoppingBag, Star, Store, Tractor, Wallet } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { Badge } from '../../components/common/ui.jsx';

const items = [
  { to: '/seller', key: 'dashboard', icon: Home, end: true }, { to: '/seller/profile', key: 'profile', icon: Store },
  { to: '/seller/products/new', key: 'addProduct', icon: PackagePlus }, { to: '/seller/products', key: 'myProducts', icon: Package, end: true },
  { to: '/seller/orders', key: 'orders', icon: ShoppingBag }, { to: '/seller/rentals', key: 'rentals', icon: Tractor },
  { to: '/seller/earnings', key: 'earnings', icon: Wallet }, { to: '/seller/analytics', key: 'analytics', icon: BarChart3 },
  { to: '/seller/reviews', key: 'reviews', icon: Star }, { to: '/seller/notifications', key: 'notifications', icon: Bell },
  { to: '/seller/settings', key: 'settings', icon: Settings },
];

// The sidebar is only navigation. Every /api/seller/* call is checked for the seller role on the server.
export default function SellerShell() {
  const { t } = useI18n(); const { user, logout } = useAuth(); const { notify } = useToast(); const navigate = useNavigate();
  const link = ({ isActive }) => `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-forest text-white' : 'text-ink/80 hover:bg-leaf-light'}`;
  const out = async () => { await logout(); navigate('/', { replace: true }); notify(t('auth.logoutSuccess')); };
  const v = user.seller?.verification || 'pending';
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[15rem_1fr]">
      <aside className="lg:sticky lg:top-36 lg:self-start">
        <div className="mb-3 hidden rounded-xl bg-leaf-light p-3 lg:block">
          <p className="truncate font-semibold text-forest-dark">{user.seller?.shopName || user.name}</p>
          <div className="mt-1"><Badge kind={v} label={t(`seller.v_${v}`)} /></div>
        </div>
        <nav aria-label={t('seller.menu')} className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {items.map(({ to, key, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={link}><Icon className="h-4 w-4" aria-hidden="true" /> {t(`seller.nav_${key}`)}</NavLink>)}
          <button type="button" onClick={out} className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50"><LogOut className="h-4 w-4" aria-hidden="true" /> {t('nav.logout')}</button>
        </nav>
      </aside>
      <section className="min-w-0"><Outlet /></section>
    </div>
  );
}
