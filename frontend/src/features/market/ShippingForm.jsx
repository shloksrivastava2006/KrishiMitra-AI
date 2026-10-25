import { useState } from 'react';
import { errorMessage } from '../../services/api.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';

// Courier details the seller adds when dispatching (or fixes later). Every field is optional: hand delivery needs none.
export default function ShippingForm({ initial = {}, submitLabel, onSubmit, onCancel }) {
  const { t } = useI18n();
  const [v, setV] = useState({
    courier: initial.courier || '', trackingNumber: initial.trackingNumber || '', note: initial.note || '',
    expectedDelivery: initial.expectedDelivery ? String(initial.expectedDelivery).slice(0, 10) : '',
  });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const today = new Date().toISOString().slice(0, 10);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await onSubmit(v); } catch (x) { setErr(errorMessage(x)); setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="mt-1 grid w-full gap-3 rounded-xl border border-earth/20 bg-leaf-light/40 p-3 sm:grid-cols-2">
      <p className="text-xs text-ink/70 sm:col-span-2">{t('market.shipHelp')}</p>
      <label className="text-xs font-semibold">{t('market.courier')}<input className="input mt-1 font-normal" maxLength={60} value={v.courier} onChange={set('courier')} placeholder="India Post, DTDC, own vehicle..." /></label>
      <label className="text-xs font-semibold">{t('market.trackingNo')}<input className="input mt-1 font-normal" maxLength={40} value={v.trackingNumber} onChange={set('trackingNumber')} /></label>
      <label className="text-xs font-semibold">{t('market.expected')}<input type="date" min={today} className="input mt-1 font-normal" value={v.expectedDelivery} onChange={set('expectedDelivery')} /></label>
      <label className="text-xs font-semibold">{t('market.shipNote')}<input className="input mt-1 font-normal" maxLength={200} value={v.note} onChange={set('note')} /></label>
      {err && <p role="alert" className="rounded-lg bg-red-50 p-2 text-xs text-red-800 sm:col-span-2">{err}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn-primary px-4 py-1.5" disabled={busy}>{busy ? t('auth.wait') : submitLabel}</button>
        <button type="button" className="btn-outline px-4 py-1.5" onClick={onCancel} disabled={busy}>{t('admin.cancel')}</button>
      </div>
    </form>
  );
}
