import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, CalendarCheck, Home, LogOut, Package, ShoppingCart, Store, Tractor, User } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import FarmerShell from '../farmer/FarmerShell.jsx';

const items = [
  { to: '/customer', key: 'customer.nav_dashboard', icon: Home, end: true },
  { to: '/my-orders', key: 'nav.myOrders', icon: Package },
  { to: '/my-bookings', key: 'nav.myBookings', icon: CalendarCheck },
  { to: '/cart', key: 'nav.cart', icon: ShoppingCart },
  { to: '/marketplace', key: 'nav.marketplace', icon: Store },
  { to: '/rentals', key: 'nav.rentals', icon: Tractor },
  { to: '/notifications', key: 'nav.notifications', icon: Bell },
  { to: '/profile', key: 'nav.profile', icon: User },
];

// The sidebar is only navigation. /api/customer/* is checked for the customer role on the server.
export default function CustomerShell() {
  const { t } = useI18n(); const { user, logout } = useAuth(); const { notify } = useToast(); const navigate = useNavigate();
  const link = ({ isActive }) => `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-forest text-white' : 'text-ink/80 hover:bg-leaf-light'}`;
  const out = async () => { await logout(); navigate('/', { replace: true }); notify(t('auth.logoutSuccess')); };
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[15rem_1fr]">
      <aside className="lg:sticky lg:top-36 lg:self-start">
        <div className="mb-3 hidden rounded-xl bg-leaf-light p-3 lg:block">
          <p className="truncate font-semibold text-forest-dark" translate="no">{user.name}</p>
          <p className="mt-0.5 text-xs text-ink/60">{t('customer.role')}</p>
        </div>
        <nav aria-label={t('customer.menu')} className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {items.map(({ to, key, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={link}><Icon className="h-4 w-4" aria-hidden="true" /> {t(key)}</NavLink>)}
          <button type="button" onClick={out} className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50"><LogOut className="h-4 w-4" aria-hidden="true" /> {t('nav.logout')}</button>
        </nav>
      </aside>
      <section className="min-w-0"><Outlet /></section>
    </div>
  );
}

// For the pages every signed-in role can open (orders, bookings, notifications, profile): farmers get the farmer sidebar,
// customers get the customer sidebar, sellers and admins see the plain page.
export function RoleAwareLayout() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role === 'farmer') return <FarmerShell />;
  if (user?.role === 'customer') return <CustomerShell />;
  return <Outlet />;
}
