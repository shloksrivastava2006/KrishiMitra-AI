import { NavLink, Outlet } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider.jsx';

// Admin pages live inside the normal site layout (same navbar and footer); this only adds a sub-menu.
const tabs = [
  { to: '/admin', key: 'admin.overview', end: true }, { to: '/admin/users', key: 'admin.users' },
  { to: '/admin/sellers', key: 'admin.sellers' }, { to: '/admin/products', key: 'admin.products' }, { to: '/admin/orders', key: 'admin.orders' },
  { to: '/admin/rentals', key: 'admin.rentals' }, { to: '/admin/settings', key: 'admin.settings' },
];

export default function AdminShell() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
      <p className="mt-1 text-ink/70">{t('admin.intro')}</p>
      <nav aria-label={t('admin.title')} className="mt-5 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end}
            className={({ isActive }) => `rounded-full px-4 py-1.5 text-sm font-medium ${isActive ? 'bg-forest text-white' : 'bg-leaf-light text-forest hover:bg-leaf/30'}`}>
            {t(tab.key)}
          </NavLink>
        ))}
      </nav>
      <div className="mt-6"><Outlet /></div>
    </div>
  );
}
