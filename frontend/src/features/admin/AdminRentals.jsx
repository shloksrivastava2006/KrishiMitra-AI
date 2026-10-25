import { useState } from 'react';
import api, { errorMessage } from '../../services/api.js';
import { inr } from '../market/format.js';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useApi } from './useApi.js';

// Full account number only when the admin asks for it, just before sending money. Hidden again on refresh.
function Reveal({ id, onError }) {
  const { t } = useI18n(); const [d, setD] = useState(null); const [busy, setBusy] = useState(false);
  const show = async () => { setBusy(true); try { setD((await api.get(`/admin/users/${id}/payout`)).data.data); } catch (e) { onError(errorMessage(e)); } finally { setBusy(false); } };
  if (!d) return <button type="button" className="btn-outline px-3 py-1 text-xs" onClick={show} disabled={busy}>{t('admin.showBank')}</button>;
  return (
    <div className="rounded-lg bg-leaf-light/60 p-3 text-xs" translate="no">
      <p><strong>{t('payout.holder')}:</strong> {d.accountName || '-'} | <strong>{t('seller.accountNumber')}:</strong> {d.accountNumber || '-'} | <strong>IFSC:</strong> {d.ifsc || '-'} | <strong>UPI:</strong> {d.upiId || '-'}</p>
      <button type="button" className="mt-1 font-semibold text-forest underline" onClick={() => setD(null)}>{t('admin.hideBank')}</button>
    </div>
  );
}

function PayoutRow({ o, onDone, onError }) {
  const { t } = useI18n(); const { notify } = useToast();
  const [amount, setAmount] = useState(String(o.owed)); const [reference, setReference] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api.post(`/admin/sellers/${o.id}/payouts`, { amount, reference }); notify(t('admin.payoutSaved')); onDone(); } catch (x) { onError(errorMessage(x)); } finally { setBusy(false); }
  };
  return (
    <li className="card space-y-2 p-4 text-sm">
      <p><span className="font-semibold">{o.name}</span> <span className="text-ink/60">| {o.phone || o.email}</span></p>
      <p>{t('admin.owed')}: <strong>{inr(o.owed)}</strong> | UPI: <strong translate="no">{o.upiIds.join(', ') || '-'}</strong>
        {o.bank && <span> | {t('admin.bank')}: <strong translate="no">{o.bank.name} ****{o.bank.last4} {o.bank.ifsc}</strong></span>}</p>
      {!o.upiIds.length && !o.bank && <p className="text-xs font-semibold text-red-700">{t('admin.noPayoutDetails')}</p>}
      {(o.bank || o.upiIds.length > 0) && <Reveal id={o.id} onError={onError} />}
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold">{t('admin.amountPaid')}<input className="input mt-1 w-32 font-normal" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label className="text-xs font-semibold">{t('admin.payoutRef')}<input className="input mt-1 w-56 font-normal" value={reference} onChange={(e) => setReference(e.target.value)} required minLength={3} /></label>
        <button className="btn-primary px-4 py-2" disabled={busy}>{busy ? t('auth.wait') : t('admin.recordPayout')}</button>
      </form>
    </li>
  );
}

export default function AdminRentals() {
  const { t } = useI18n(); const { notify } = useToast();
  const [version, setVersion] = useState(0); const [error, setError] = useState('');
  const { data, error: loadError } = useApi('/admin/rentals', version);
  const money = useApi('/admin/rental-money', version);
  const refresh = () => setVersion((v) => v + 1);
  const block = async (r) => { try { await api.patch(`/admin/rentals/${r.id}/block`, { blocked: !r.blocked }); refresh(); } catch (e) { setError(errorMessage(e)); } };
  const refunded = async (b) => { try { await api.patch(`/admin/rental-bookings/${b.id}/refunded`); notify(t('seller.saved')); refresh(); } catch (e) { setError(errorMessage(e)); } };
  return (
    <div className="space-y-8">
      {(error || loadError || money.error) && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error || loadError || money.error}</p>}

      <section>
        <h2 className="mb-1 text-lg font-bold">{t('admin.rentMoney')}</h2>
        <p className="mb-3 text-xs text-ink/65">{t('admin.rentMoneyHelp')}</p>
        {money.data && money.data.owners.length === 0 && <p className="text-sm text-ink/70">{t('admin.nothingToPay')}</p>}
        <ul className="space-y-3">{(money.data?.owners || []).map((o) => <PayoutRow key={o.id} o={o} onDone={refresh} onError={setError} />)}</ul>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-bold">{t('admin.rentRefunds')}</h2>
        <p className="mb-3 text-xs text-ink/65">{t('admin.rentRefundsHelp')}</p>
        {money.data && money.data.refunds.length === 0 && <p className="text-sm text-ink/70">{t('admin.nothingToPay')}</p>}
        <ul className="space-y-3">
          {(money.data?.refunds || []).map((b) => (
            <li key={b.id} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <p><span className="font-semibold">{b.rentalName}</span> <span className="text-ink/60">| {b.renterName}{b.renterPhone ? `, ${b.renterPhone}` : ''} | {inr(b.amount)}{b.paymentId ? ` | ${b.paymentId}` : ''}</span></p>
              <button type="button" className="btn-outline px-3 py-1.5" onClick={() => refunded(b)}>{t('admin.markRefunded')}</button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">{t('admin.rentals')}</h2>
        {data && data.length === 0 && <p className="text-ink/70">{t('seller.noEquipment')}</p>}
        <ul className="space-y-3">
          {(data || []).map((r) => (
            <li key={r.id} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <p><span className="font-semibold">{r.name}</span> <span className="text-ink/60">| {r.type} | {r.owner} | {r.hourly ? `${inr(r.hourly)}/h ` : ''}{r.daily ? `${inr(r.daily)}/day` : ''}</span></p>
              <button type="button" className="btn-outline px-3 py-1.5" onClick={() => block(r)}>{r.blocked ? t('admin.unblock') : t('admin.block')}</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
