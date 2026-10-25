import { useState } from 'react';
import api, { errorMessage } from '../../services/api.js';
import { badgeClass, inr } from '../market/format.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useApi } from './useApi.js';

export default function AdminSellers() {
  const { t } = useI18n();
  const [version, setVersion] = useState(0); const [error, setError] = useState(''); const [payFor, setPayFor] = useState(null); const [pay, setPay] = useState({ amount: '', reference: '' });
  const { data, error: loadError } = useApi('/admin/sellers', version);
  const refresh = () => setVersion((v) => v + 1);
  const review = async (u, decision) => {
    let note;
    if (['reject', 'suspend'].includes(decision)) { note = window.prompt(t('admin.reasonPrompt')); if (!note) return; }
    try { await api.patch(`/admin/sellers/${u.id}/review`, { decision, note }); refresh(); } catch (e) { setError(errorMessage(e)); }
  };
  const record = async () => {
    setError('');
    try { await api.post(`/admin/sellers/${payFor}/payouts`, pay); setPayFor(null); setPay({ amount: '', reference: '' }); refresh(); } catch (e) { setError(errorMessage(e)); }
  };
  return (
    <div>
      {(error || loadError) && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error || loadError}</p>}
      <p className="mb-3 rounded-lg bg-gold-light/60 p-3 text-xs text-ink/80">{t('admin.payoutHelp')}</p>
      {data && data.length === 0 && <p className="text-ink/70">{t('admin.noSellers')}</p>}
      <ul className="space-y-3">
        {(data || []).map((u) => (
          <li key={u.id} className="card space-y-1 p-4 text-sm">
            <p className="font-semibold">{u.seller?.shopName || u.name} <span className="font-normal text-ink/60">| {u.name} | {u.email} | {u.phone}</span></p>
            <p className="text-ink/70">{[u.seller?.address, u.district, u.state, u.seller?.pincode].filter(Boolean).join(', ')}</p>
            <p><strong>{t('market.licence')}:</strong> {u.seller?.licenceNumber || '-'} | <strong>UPI:</strong> {u.seller?.upiId || '-'} | <strong>{t('seller.accountNumber')}:</strong> {u.seller?.bankAccountLast4 ? `****${u.seller.bankAccountLast4}` : '-'} {u.seller?.bankIfsc || ''}</p>
            <p className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs ${badgeClass(u.seller?.verification === 'verified' ? 'ok' : u.seller?.verification === 'rejected' ? 'bad' : 'warn')}`}>{t(`seller.v_${u.seller?.verification || 'pending'}`)}</span>
              {!u.isActive && <span className={`rounded-full px-2 py-0.5 text-xs ${badgeClass('bad')}`}>{t('admin.suspended')}</span>}
              <span className="text-ink/70">{t('seller.pendingPayout')}: {inr(u.pendingPayout)}</span>
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {u.seller?.verification !== 'verified' && <button type="button" className="btn-primary px-3 py-1.5" onClick={() => review(u, 'verify')}>{t('admin.verify')}</button>}
              {u.seller?.verification !== 'rejected' && <button type="button" className="btn-outline px-3 py-1.5" onClick={() => review(u, 'reject')}>{t('market.reject')}</button>}
              {u.isActive ? <button type="button" className="btn-outline px-3 py-1.5" onClick={() => review(u, 'suspend')}>{t('admin.suspend')}</button> : <button type="button" className="btn-outline px-3 py-1.5" onClick={() => review(u, 'reinstate')}>{t('admin.reinstate')}</button>}
              {u.pendingPayout > 0 && <button type="button" className="btn-outline px-3 py-1.5" onClick={() => setPayFor(payFor === u.id ? null : u.id)}>{t('admin.recordPayout')}</button>}
            </div>
            {payFor === u.id && (
              <div className="flex flex-wrap items-end gap-2 pt-2">
                <label className="text-xs">{t('seller.amount')}<input className="input mt-1 w-32" inputMode="decimal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></label>
                <label className="text-xs">{t('seller.reference')}<input className="input mt-1 w-48" value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></label>
                <button type="button" className="btn-primary px-3 py-2" onClick={record}>{t('market.save')}</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
