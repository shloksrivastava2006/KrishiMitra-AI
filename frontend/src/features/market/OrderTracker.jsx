import { useState } from 'react';
import { CheckCircle2, ClipboardList, Clock, Copy, Home, PackageCheck, Truck, XCircle } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';

const STEPS = [['placed', ClipboardList], ['confirmed', PackageCheck], ['shipped', Truck], ['delivered', Home]];
const RANK = { awaiting_payment: -1, placed: 0, confirmed: 1, shipped: 2, delivered: 3 };

// Progress bar for one order: where it is now, when each step happened, and the seller's courier details.
export default function OrderTracker({ o, seller = false }) {
  const { t, lang } = useI18n();
  const [copied, setCopied] = useState(false);
  const locale = lang === 'hi' ? 'hi-IN' : 'en-IN';
  const when = (d) => (d ? new Date(d).toLocaleString(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
  const day = (d) => new Date(d).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });

  if (o.status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
        <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="font-semibold">{t('market.tr_cancelled')}</span>{o.statusAt?.cancelled && <span className="text-red-700/80">| {when(o.statusAt.cancelled)}</span>}
      </div>
    );
  }

  const rank = RANK[o.status] ?? -1;
  const sh = o.shipping;
  const copy = async () => {
    try { await navigator.clipboard.writeText(sh.trackingNumber); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* copy is a convenience only */ }
  };

  return (
    <section aria-label={t('market.track_title')} className="rounded-xl border border-earth/15 bg-leaf-light/30 p-3">
      <ol className="grid grid-cols-4">
        {STEPS.map(([key, Icon], i) => {
          const done = i < rank || (i === rank && key === 'delivered');
          const current = i === rank && key !== 'delivered';
          return (
            <li key={key} aria-current={current ? 'step' : undefined} className="relative flex flex-col items-center px-1 text-center">
              {i > 0 && <span aria-hidden="true" className={`absolute right-1/2 top-[17px] h-1 w-full rounded ${i <= rank ? 'bg-forest' : 'bg-earth/20'}`} />}
              <span className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 ${done ? 'border-forest bg-forest text-white' : current ? 'border-forest bg-white text-forest ring-4 ring-forest/20' : 'border-earth/25 bg-white text-ink/35'}`}>
                {done ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <Icon className="h-5 w-5" aria-hidden="true" />}
              </span>
              <span className={`mt-1.5 text-xs leading-tight ${done || current ? 'font-bold text-forest-dark' : 'text-ink/50'}`}>{t(`market.tr_${key}`)}</span>
              {i <= rank && o.statusAt?.[key] && <span className="mt-0.5 text-[11px] leading-tight text-ink/60">{when(o.statusAt[key])}</span>}
            </li>
          );
        })}
      </ol>

      <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-forest-dark">
        {o.status === 'awaiting_payment' && <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />}
        {t(`market.track_msg_${seller && o.status === 'placed' ? 'placed_seller' : o.status}`)}
      </p>

      {sh && (
        <dl className="mt-2 grid gap-x-4 gap-y-1 rounded-lg bg-white p-3 text-sm sm:grid-cols-2">
          {sh.courier && <div><dt className="text-xs text-ink/60">{t('market.courier')}</dt><dd className="font-semibold" translate="no">{sh.courier}</dd></div>}
          {sh.trackingNumber && (
            <div><dt className="text-xs text-ink/60">{t('market.trackingNo')}</dt>
              <dd className="flex items-center gap-2 font-semibold" translate="no">{sh.trackingNumber}
                <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-md border border-earth/20 px-1.5 py-0.5 text-xs font-medium text-forest hover:bg-leaf-light"><Copy className="h-3 w-3" aria-hidden="true" />{copied ? t('market.copied') : t('market.copy')}</button>
              </dd></div>
          )}
          {sh.expectedDelivery && o.status !== 'delivered' && <div><dt className="text-xs text-ink/60">{t('market.expected')}</dt><dd className="font-semibold">{day(sh.expectedDelivery)}</dd></div>}
          {sh.note && <div className="sm:col-span-2"><dt className="text-xs text-ink/60">{t('market.shipNoteShown')}</dt><dd>{sh.note}</dd></div>}
        </dl>
      )}
      {!sh && o.status === 'shipped' && !seller && <p className="mt-2 text-xs text-ink/60">{t('market.noTrackingYet')}</p>}
    </section>
  );
}
