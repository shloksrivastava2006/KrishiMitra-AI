import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { inr } from '../market/format.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Badge, Empty, ErrorBox, Loading, PageTitle, Stat, fmtDate, useFetch } from '../../components/common/ui.jsx';

export default function SellerDashboard() {
  const { t, lang } = useI18n(); const { user } = useAuth();
  const { data: d, error, loading } = useFetch('/seller/summary');
  if (loading) return <Loading />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  const v = user.seller?.verification || 'pending';
  return (
    <div className="space-y-6">
      <PageTitle>{t('seller.nav_dashboard')}</PageTitle>
      {v !== 'verified' && (
        <p className="rounded-lg bg-gold-light/70 p-3 text-sm text-ink/80">{t(`seller.banner_${v}`)}{user.seller?.verificationNote ? ` ${user.seller.verificationNote}` : ''}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('seller.totalProducts')} value={d.products.total} hint={t('seller.activeHint', { n: d.products.active })} />
        <Stat label={t('seller.totalOrders')} value={d.orders.total} hint={t('seller.deliveredHint', { n: d.orders.delivered })} />
        <Stat label={t('seller.totalSales')} value={inr(d.money.totalSales)} />
        <Stat label={t('seller.pendingOrders')} value={d.orders.pending} tone={d.orders.pending ? 'warn' : undefined} />
        <Stat label={t('seller.pendingApproval')} value={d.products.pending} />
        <Stat label={t('seller.netEarnings')} value={inr(d.money.net)} />
        <Stat label={t('seller.pendingPayout')} value={inr(d.money.pendingPayout)} />
        <Stat label={t('seller.avgRating')} value={d.rating.count ? `${d.rating.average} / 5` : '-'} hint={t('seller.reviewCount', { n: d.rating.count })} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{t('seller.recentOrders')}</h2><Link to="/seller/orders" className="text-sm text-forest">{t('seller.viewAll')}</Link></div>
          {d.recentOrders.length === 0 ? <p className="mt-3 text-sm text-ink/60">{t('seller.noOrders')}</p> : (
            <ul className="mt-3 divide-y divide-earth/10 text-sm">
              {d.recentOrders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>#{String(o.id).slice(-6).toUpperCase()} <span className="text-ink/60">| {fmtDate(o.createdAt, lang)}</span></span>
                  <span className="flex items-center gap-2">{inr(o.total)} <Badge kind={o.status} label={t(`market.st_${o.status}`)} /></span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><AlertTriangle className="h-5 w-5 text-earth" aria-hidden="true" /> {t('seller.lowStock')}</h2>
          {d.lowStock.length === 0 ? <p className="mt-3 text-sm text-ink/60">{t('seller.noLowStock')}</p> : (
            <ul className="mt-3 divide-y divide-earth/10 text-sm">
              {d.lowStock.map((p) => <li key={p.id} className="flex justify-between py-2"><span>{p.name}</span><span className={p.stock === 0 ? 'font-semibold text-red-700' : 'text-earth'}>{p.stock} {p.unit}</span></li>)}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{t('seller.latestNotifications')}</h2><Link to="/seller/notifications" className="text-sm text-forest">{t('seller.viewAll')}</Link></div>
        {d.notifications.length === 0 ? <Empty>{t('seller.noNotifications')}</Empty> : (
          <ul className="mt-3 divide-y divide-earth/10 text-sm">
            {d.notifications.map((n) => <li key={n.id} className="py-2"><p className={n.read ? '' : 'font-semibold'}>{n.title}</p><p className="text-ink/60">{n.message}</p></li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
