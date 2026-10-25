import { AlertTriangle, CheckCircle2, ClipboardList, Hourglass, KeyRound, PackageCheck, Undo2, XCircle } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';

const STEPS = [['requested', ClipboardList], ['confirmed', PackageCheck], ['handed_over', KeyRound], ['completed', Undo2]];
const RANK = { requested: 0, confirmed: 1, handed_over: 2, completed: 3 };

// Where a rental booking is: requested, confirmed, picked up by the renter, returned. Same look as the order tracker.
export default function RentalTracker({ b, owner = false }) {
  const { t, lang } = useI18n();
  const locale = lang === 'hi' ? 'hi-IN' : 'en-IN';
  const when = (d) => (d ? new Date(d).toLocaleString(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');

  if (b.status === 'cancelled' || b.status === 'rejected') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
        <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="font-semibold">{t(`rentals.tr_${b.status}`)}</span>
        {b.statusAt?.[b.status] && <span className="text-red-700/80">| {when(b.statusAt[b.status])}</span>}
      </div>
    );
  }
  const rank = RANK[b.status] ?? 0;
  const online = b.paymentMethod === 'online';
  const msgKey = b.overdue ? 'overdue' : b.status === 'confirmed' ? (online ? (b.paymentStatus === 'paid' ? 'confirmed_online_paid' : 'confirmed_online_unpaid') : 'confirmed_cod') : b.status;
  const owner_ = owner && b.status === 'requested' ? 'requested_owner' : msgKey;
  return (
    <section aria-label={t('rentals.trackTitle')} className="rounded-xl border border-earth/15 bg-leaf-light/30 p-3">
      <ol className="grid grid-cols-4">
        {STEPS.map(([key, Icon], i) => {
          const done = i < rank || (i === rank && key === 'completed');
          const current = i === rank && key !== 'completed';
          return (
            <li key={key} aria-current={current ? 'step' : undefined} className="relative flex flex-col items-center px-1 text-center">
              {i > 0 && <span aria-hidden="true" className={`absolute right-1/2 top-[17px] h-1 w-full rounded ${i <= rank ? 'bg-forest' : 'bg-earth/20'}`} />}
              <span className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 ${done ? 'border-forest bg-forest text-white' : current ? 'border-forest bg-white text-forest ring-4 ring-forest/20' : 'border-earth/25 bg-white text-ink/35'}`}>
                {done ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <Icon className="h-5 w-5" aria-hidden="true" />}
              </span>
              <span className={`mt-1.5 text-xs leading-tight ${done || current ? 'font-bold text-forest-dark' : 'text-ink/50'}`}>{t(`rentals.tr_${key}`)}</span>
              {i <= rank && b.statusAt?.[key] && <span className="mt-0.5 text-[11px] leading-tight text-ink/60">{when(b.statusAt[key])}</span>}
            </li>
          );
        })}
      </ol>
      <p className={`mt-3 flex items-center gap-2 text-sm font-semibold ${b.overdue ? 'text-red-700' : 'text-forest-dark'}`}>
        {b.overdue ? <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" /> : b.status === 'requested' ? <Hourglass className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
        {t(`rentals.trm_${owner_}`)}
      </p>
      {b.status !== 'completed' && <p className="mt-1 text-xs text-ink/70">{t('rentals.returnBy')}: <strong>{when(b.end)}</strong></p>}
    </section>
  );
}
