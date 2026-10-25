import { useMemo, useState } from 'react';
import api, { errorMessage } from '../../services/api.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { inr } from '../market/format.js';
import OrderTracker from '../market/OrderTracker.jsx';
import ShippingForm from '../market/ShippingForm.jsx';
import { Badge, Empty, ErrorBox, Loading, PageTitle, fmtDate, useFetch } from '../../components/common/ui.jsx';

// Customer places order -> seller confirms -> packing (confirmed) -> dispatched (shipped) -> delivered. The server enforces every allowed move.
const TABS = { new: ['placed'], processing: ['confirmed', 'shipped'], completed: ['delivered'], cancelled: ['cancelled'] };
const NEXT = { placed: ['confirmed', 'markConfirmed'], confirmed: ['shipped', 'markShipped'], shipped: ['delivered', 'markDelivered'] };

export default function SellerOrders() {
  const { t, lang } = useI18n();
  const { data, error, loading, reload } = useFetch('/orders/selling');
  const [tab, setTab] = useState('new'); const [err, setErr] = useState(''); const [ship, setShip] = useState(null);   // { id, mode: 'ship' | 'track' }
  const counts = useMemo(() => Object.fromEntries(Object.entries(TABS).map(([k, s]) => [k, (data || []).filter((o) => s.includes(o.status)).length])), [data]);
  const rows = (data || []).filter((o) => TABS[tab].includes(o.status));

  const move = async (o, status) => {
    if (status === 'cancelled' && !window.confirm(t('market.confirmCancel'))) return;
    setErr('');
    try { await api.patch(`/orders/${o.id}/status`, { status }); reload(); } catch (e) { setErr(errorMessage(e)); }
  };
  // Throws on failure so the form can show the message; closes itself on success.
  const sendShipping = (o, mode) => async (values) => {
    if (mode === 'ship') await api.patch(`/orders/${o.id}/status`, { status: 'shipped', ...values });
    else await api.patch(`/orders/${o.id}/tracking`, values);
    setShip(null); reload();
  };
  return (
    <div>
      <PageTitle>{t('seller.nav_orders')}</PageTitle>
      <div role="tablist" className="mb-4 flex flex-wrap gap-2">
        {Object.keys(TABS).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === k ? 'bg-forest text-white' : 'bg-leaf-light text-forest'}`}>{t(`seller.tab_${k}`)} ({counts[k]})</button>
        ))}
      </div>
      <ErrorBox>{error || err}</ErrorBox>
      {loading && <Loading />}
      {data && rows.length === 0 && <Empty>{t('seller.noOrdersTab')}</Empty>}
      <ul className="space-y-3">
        {rows.map((o) => {
          const next = NEXT[o.status]; const a = o.address;
          return (
            <li key={o.id} className="card space-y-2 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{t('market.orderNo')} #{String(o.id).slice(-6).toUpperCase()} <span className="font-normal text-ink/60">| {fmtDate(o.createdAt, lang)}</span></p>
                <div className="flex gap-2"><Badge kind={o.status} label={t(`seller.st_${o.status}`)} /><Badge kind={o.paymentStatus} label={t(`market.ps_${o.paymentStatus}`)} /></div>
              </div>
              <ul className="text-ink/80">{o.lines.map((l) => <li key={l.name}>{l.name}: {l.qty} {l.unit} x {inr(l.unitPrice)} = {inr(l.lineTotal)}</li>)}</ul>
              <p className="font-medium">{t('market.total')}: {inr(o.total)} <span className="font-normal text-ink/60">({o.paymentMethod === 'cod' ? t('market.payCod') : t('market.payOnline')})</span></p>
              <OrderTracker o={o} seller />
              {a && <p className="text-ink/70">{t('market.deliverTo')}: <span translate="no">{a.name}, {a.phone}, {a.line1}{a.village ? `, ${a.village}` : ''}, {a.district}, {a.state} {a.pincode}</span></p>}
              {o.paymentMethod === 'cod' && o.paymentStatus === 'cod' && <p className="text-xs text-ink/60">{t('market.cashNote')}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                {next && <button type="button" className="btn-primary px-3 py-1.5" onClick={() => (next[0] === 'shipped' ? setShip({ id: o.id, mode: 'ship' }) : move(o, next[0]))}>{t(`seller.${next[1]}`)}</button>}
                {o.status === 'shipped' && <button type="button" className="btn-outline px-3 py-1.5" onClick={() => setShip({ id: o.id, mode: 'track' })}>{t('market.updateTracking')}</button>}
                {o.status === 'placed' && <button type="button" className="btn-outline px-3 py-1.5" onClick={() => move(o, 'cancelled')}>{t('seller.rejectOrder')}</button>}
                {o.status === 'confirmed' && <button type="button" className="btn-outline px-3 py-1.5" onClick={() => move(o, 'cancelled')}>{t('market.cancelOrder')}</button>}
              </div>
              {ship?.id === o.id && <ShippingForm initial={o.shipping} submitLabel={ship.mode === 'ship' ? t('seller.markShipped') : t('market.saveTracking')} onSubmit={sendShipping(o, ship.mode)} onCancel={() => setShip(null)} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
