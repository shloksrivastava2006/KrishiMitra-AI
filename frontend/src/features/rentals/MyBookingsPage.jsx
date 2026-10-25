import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone } from 'lucide-react';
import api, { errorMessage } from '../../services/api.js';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { inr } from '../market/format.js';
import { openRazorpay } from '../market/razorpay.js';
import { Badge, Empty, ErrorBox, Loading, useFetch } from '../../components/common/ui.jsx';
import RentalTracker from './RentalTracker.jsx';

const PAY_TONE = { pay_at_pickup: 'cod', unpaid: 'pending', paid: 'paid', refund_due: 'refund_due', refunded: 'info' };
const payLabel = { pay_at_pickup: 'payAtPickup', unpaid: 'payUnpaid', paid: 'paid', refund_due: 'payRefundDue', refunded: 'payRefunded' };

export default function MyBookingsPage() {
  const { t, lang } = useI18n(); const { notify } = useToast(); const { user } = useAuth();
  const { data, error, loading, reload } = useFetch('/rentals/bookings/mine'); const [err, setErr] = useState(''); const [busy, setBusy] = useState('');
  const time = (d) => new Date(d).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const cancel = async (b) => { if (!window.confirm(t('market.confirmCancel'))) return; setErr(''); try { await api.post(`/rentals/bookings/${b.id}/cancel`); notify(t('seller.saved')); reload(); } catch (e) { setErr(errorMessage(e)); } };
  const payNow = async (b) => {
    setErr(''); setBusy(b.id);
    try {
      const { data: d } = await api.get(`/rentals/bookings/${b.id}/pay`);
      const result = await openRazorpay(d.data.razorpay, { name: user?.name, contact: user?.phone }, b.rentalName);
      if (result.status === 'paid') { await api.post(`/rentals/bookings/${b.id}/verify-payment`, result.response); notify(t('rentals.paySuccess')); }
      else setErr(t('rentals.payDismissed'));
      reload();
    } catch (e) { setErr(errorMessage(e)); reload(); } finally { setBusy(''); }
  };
  const map = (p) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.address, p.village, p.district, p.state, p.pincode].filter(Boolean).join(', '))}`;
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">{t('nav.myBookings')}</h1>
      <div className="mt-4"><ErrorBox>{error || err}</ErrorBox></div>
      {loading && <Loading />}
      {data?.length === 0 && <div className="mt-6"><Empty>{t('rentals.noBookings')} <Link to="/rentals" className="font-semibold text-forest">{t('rentals.browse')}</Link></Empty></div>}
      <ul className="mt-6 space-y-4">
        {(data || []).map((b) => {
          const mustPay = b.paymentMethod === 'online' && b.status === 'confirmed' && b.paymentStatus === 'unpaid';
          return (
            <li key={b.id} className="card space-y-3 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-base font-semibold">{b.rentalName}</p><Badge kind={b.status} label={t(`seller.bk_${b.status}`)} /></div>
              <RentalTracker b={b} />
              <p>{time(b.start)} - {time(b.end)}</p>
              <p className="flex flex-wrap items-center gap-2">
                <span>{t('rentals.rent')}: <strong>{inr(b.amount)}</strong>{b.deposit ? <span className="text-ink/70"> + {t('seller.deposit')} {inr(b.deposit)} ({t('rentals.depositHand')})</span> : null}</span>
                <Badge kind={PAY_TONE[b.paymentStatus]} label={t(`rentals.${payLabel[b.paymentStatus]}`)} />
              </p>
              {mustPay && (
                <div className="rounded-lg bg-gold-light/60 p-3">
                  <p className="text-xs text-ink/80">{t('rentals.payBy', { time: time(b.payBy) })}</p>
                  <button type="button" className="btn-primary mt-2" disabled={busy === b.id} onClick={() => payNow(b)}>{busy === b.id ? t('auth.wait') : `${t('rentals.payNow')} ${inr(b.amount)}`}</button>
                </div>
              )}
              {b.pickup ? (
                <div className="rounded-lg border border-forest/30 bg-white p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-forest">{t('rentals.pickupAddress')}</p>
                  <p className="mt-1 flex items-start gap-1.5 font-semibold"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-forest" aria-hidden="true" />{[b.pickup.address, b.pickup.village, b.pickup.district, b.pickup.state].filter(Boolean).join(', ')} - {b.pickup.pincode}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <a href={map(b.pickup)} target="_blank" rel="noreferrer" className="font-semibold text-forest underline">{t('rentals.mapOpen')}</a>
                    {b.pickup.ownerPhone && <a href={`tel:${b.pickup.ownerPhone}`} className="inline-flex items-center gap-1 font-semibold text-forest underline"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{b.pickup.ownerName}, {b.pickup.ownerPhone}</a>}
                  </div>
                  <p className="mt-2 text-xs text-ink/65">{t('rentals.fixedPlaceShort')}</p>
                </div>
              ) : b.location?.district && ['requested', 'confirmed'].includes(b.status) && <p className="flex items-center gap-1.5 text-xs text-ink/70"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{[b.location.village, b.location.district, b.location.state].filter(Boolean).join(', ')} <span>({t('rentals.addressLater')})</span></p>}
              {['requested', 'confirmed'].includes(b.status) && <button type="button" className="btn-outline px-3 py-1.5" onClick={() => cancel(b)}>{t('market.cancelOrder')}</button>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
