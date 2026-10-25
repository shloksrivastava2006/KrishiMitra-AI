import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useApi } from './useApi.js';

export default function AdminOverview() {
  const { t } = useI18n();
  const { data, error } = useApi('/admin/overview');
  if (error) return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>;
  if (!data) return <p className="text-ink/60">...</p>;
  const stats = [
    ['admin.totalUsers', data.users, '/admin/users'], ['admin.farmers', data.farmers, '/admin/users'], ['admin.sellers', data.sellers, '/admin/sellers'],
    ['admin.customers', data.customers, '/admin/users'], ['admin.admins', data.admins, '/admin/users'], ['admin.blockedUsers', data.blocked, '/admin/users'],
    ['admin.farms', data.farms], ['admin.crops', data.crops],
  ];
  const todo = [['admin.pendingProducts', data.pendingProducts, '/admin/products'], ['admin.pendingSellers', data.pendingSellers, '/admin/sellers']];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([k, v, to]) => {
          const body = <><p className="text-sm text-ink/60">{t(k)}</p><p className="mt-1 font-display text-3xl font-bold text-forest">{v}</p></>;
          return to ? <Link key={k} to={to} className="card transition-shadow hover:shadow-md">{body}</Link> : <div key={k} className="card">{body}</div>;
        })}
      </div>
      <div>
        <h2 className="mb-2 text-lg font-bold">{t('admin.needsAttention')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {todo.map(([k, v, to]) => (
            <Link key={k} to={to} className={`card flex items-center justify-between transition-shadow hover:shadow-md ${v > 0 ? 'border-gold' : ''}`}>
              <span className="font-semibold">{t(k)}</span><span className="font-display text-2xl font-bold text-forest">{v}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
