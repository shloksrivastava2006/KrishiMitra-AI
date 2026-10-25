import { useI18n } from '../../i18n/I18nProvider.jsx';
import { badgeClass, inr, orderTone } from './format.js';
import OrderTracker from './OrderTracker.jsx';

const Badge = ({ tone, children }) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass(tone)}`}>{children}</span>;

export default function OrderCard({ o, children, seller }) {
  const { t, lang } = useI18n();
  const a = o.address;
  return (
    <li className="card space-y-2 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{t('market.orderNo')} #{String(o.id).slice(-6).toUpperCase()} <span className="font-normal text-ink/60">| {new Date(o.createdAt).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN')}</span></p>
        <div className="flex gap-2"><Badge tone={orderTone(o.status)}>{t(`market.st_${o.status}`)}</Badge><Badge tone={o.paymentStatus === 'paid' ? 'ok' : o.paymentStatus === 'refund_due' ? 'bad' : 'warn'}>{t(`market.ps_${o.paymentStatus}`)}</Badge></div>
      </div>
      <ul className="text-ink/80">{o.lines.map((l) => <li key={l.name}>{l.name}: {l.qty} {l.unit} x {inr(l.unitPrice)} = {inr(l.lineTotal)}</li>)}</ul>
      <p className="font-medium">{t('market.total')}: {inr(o.total)}</p>
      <OrderTracker o={o} seller={Boolean(seller)} />
      {a && <p className="text-ink/70">{seller ? `${t('market.buyer')}: ` : `${t('market.deliverTo')}: `}<span translate="no">{a.name}, {a.phone}, {a.line1}{a.village ? `, ${a.village}` : ''}, {a.district}, {a.state} {a.pincode}</span></p>}
      {o.paymentStatus === 'refund_due' && !seller && <p className="rounded-lg bg-gold-light p-2 text-xs">{t('market.refundNote')}</p>}
      {seller && o.paymentMethod === 'cod' && o.paymentStatus === 'cod' && <p className="text-xs text-ink/60">{t('market.cashNote')}</p>}
      <div className="flex flex-wrap gap-2 pt-1">{children}</div>
    </li>
  );
}
