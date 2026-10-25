import { Link } from 'react-router-dom';
import { CalendarCheck, ShoppingBag, Store, Tractor } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { inr } from '../market/format.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Badge, Empty, ErrorBox, Loading, PageTitle, Stat, fmtDate, useFetch } from '../../components/common/ui.jsx';

// Everything here comes from this customer's own orders, rental bookings and notifications (GET /api/customer/summary).
export default function CustomerDashboard() {
  const { t, lang } = useI18n(); const { user } = useAuth();
  const { data: d, error, loading } = useFetch('/customer/summary');
  if (loading) return <Loading />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  const shortId = (id) => `#${String(id).slice(-6).toUpperCase()}`;
  return (
    <div className="space-y-6">
      <PageTitle>{t('customer.hello', { name: user.name.split(' ')[0] })}</PageTitle>
      <p className="-mt-3 text-sm text-ink/65">{t('customer.intro')}</p>
      {d.orders.awaitingPayment > 0 && (
        <p className="rounded-lg bg-gold-light/70 p-3 text-sm text-ink/80">
          {t('customer.awaitingBanner', { n: d.orders.awaitingPayment })} <Link to="/my-orders" className="font-semibold text-forest underline">{t('customer.payNow')}</Link>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('customer.totalOrders')} value={d.orders.total} hint={t('customer.deliveredHint', { n: d.orders.delivered })} />
        <Stat label={t('customer.activeOrders')} value={d.orders.active} hint={d.orders.active ? t('customer.inProgressHint', { amount: inr(d.orders.inProgress) }) : undefined} tone={d.orders.active ? 'warn' : undefined} />
        <Stat label={t('customer.totalSpent')} value={inr(d.orders.spent)} hint={t('customer.spentHint')} />
        <Stat label={t('customer.activeRentals')} value={d.bookings.active} hint={t('customer.bookingsHint', { n: d.bookings.total })} />
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">{t('customer.quickActions')}</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link to="/marketplace" className="btn-primary inline-flex items-center gap-2"><Store className="h-4 w-4" aria-hidden="true" /> {t('customer.browseMarket')}</Link>
          <Link to="/rentals" className="btn-outline inline-flex items-center gap-2"><Tractor className="h-4 w-4" aria-hidden="true" /> {t('customer.rentEquipment')}</Link>
          <Link to="/cart" className="btn-outline inline-flex items-center gap-2"><ShoppingBag className="h-4 w-4" aria-hidden="true" /> {t('customer.viewCart')}</Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{t('customer.recentOrders')}</h2><Link to="/my-orders" className="text-sm text-forest">{t('customer.viewAll')}</Link></div>
          {d.recentOrders.length === 0 ? <p className="mt-3 text-sm text-ink/60">{t('customer.noOrders')}</p> : (
            <ul className="mt-3 divide-y divide-earth/10 text-sm">
              {d.recentOrders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>{shortId(o.id)} <span className="text-ink/60">| {fmtDate(o.createdAt, lang)}</span></span>
                  <span className="flex items-center gap-2">{inr(o.total)} <Badge kind={o.status} label={t(`market.st_${o.status}`)} /></span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><CalendarCheck className="h-5 w-5 text-earth" aria-hidden="true" /> {t('customer.upcomingRentals')}</h2>
            <Link to="/my-bookings" className="text-sm text-forest">{t('customer.viewAll')}</Link>
          </div>
          {d.upcomingBookings.length === 0 ? <p className="mt-3 text-sm text-ink/60">{t('customer.noBookings')}</p> : (
            <ul className="mt-3 divide-y divide-earth/10 text-sm">
              {d.upcomingBookings.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span><span className="font-medium">{b.name}</span> <span className="text-ink/60">| {fmtDate(b.start, lang)}</span></span>
                  <Badge kind={b.status} label={t(`seller.bk_${b.status}`)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('customer.latestNotifications')} {d.unreadNotifications > 0 && <span className="ml-1 text-sm font-normal text-ink/60">({t('customer.unreadCount', { n: d.unreadNotifications })})</span>}</h2>
          <Link to="/notifications" className="text-sm text-forest">{t('customer.viewAll')}</Link>
        </div>
        {d.notifications.length === 0 ? <Empty>{t('customer.noNotifications')}</Empty> : (
          <ul className="mt-3 divide-y divide-earth/10 text-sm">
            {d.notifications.map((n) => <li key={n.id} className="py-2"><p className={n.read ? '' : 'font-semibold'}>{n.title}</p><p className="text-ink/60">{n.message}</p></li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
