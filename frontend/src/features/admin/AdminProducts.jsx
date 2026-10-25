import { useState } from 'react';
import api, { errorMessage } from '../../services/api.js';
import { catKey, inr } from '../market/format.js';
import { assetUrl } from '../../services/api.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useApi } from './useApi.js';

export default function AdminProducts() {
  const { t } = useI18n();
  const [status, setStatus] = useState('pending'); const [version, setVersion] = useState(0); const [error, setError] = useState('');
  const { data, error: loadError } = useApi(`/admin/products?status=${status}`, version);
  const review = async (p, decision) => {
    let reason;
    if (decision === 'reject') { reason = window.prompt(t('market.reasonPrompt')); if (!reason) return; }
    try { await api.patch(`/admin/products/${p.id}/review`, { decision, reason }); setVersion((v) => v + 1); } catch (e) { setError(errorMessage(e)); }
  };
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {['pending', 'approved', 'rejected'].map((s) => <button key={s} type="button" onClick={() => setStatus(s)} className={`rounded-full px-4 py-1.5 text-sm font-medium ${status === s ? 'bg-forest text-white' : 'bg-leaf-light text-forest'}`}>{t(`market.s_${s}`)}</button>)}
      </div>
      {(error || loadError) && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error || loadError}</p>}
      {data && data.length === 0 && <p className="text-ink/70">{t('market.nothingToReview')}</p>}
      <ul className="space-y-3">
        {(data || []).map((p) => (
          <li key={p.id} className="card space-y-1 p-4 text-sm">
            <p className="font-semibold">{p.name} <span className="font-normal text-ink/60">| {t(catKey(p.category))} | {inr(p.price)} / {p.unit} | {t('market.left', { n: p.stock })}</span></p>
            {p.images?.length > 0 && <div className="flex flex-wrap gap-2 py-1">{p.images.map((u) => <a key={u} href={assetUrl(u)} target="_blank" rel="noreferrer"><img src={assetUrl(u)} alt="" className="h-20 w-20 rounded-lg object-cover" /></a>)}</div>}
            {p.description && <p className="text-ink/80">{p.description}</p>}
            {p.isProduce && <p className="text-ink/70">{[p.variety, p.grade && t('market.gradeLabel', { g: p.grade }), p.organic && t('market.organic'), p.harvestDate && `${t('sell.harvestDate')}: ${new Date(p.harvestDate).toLocaleDateString('en-IN')}`, [p.village, p.district, p.state].filter(Boolean).join(', ')].filter(Boolean).join(' | ')}</p>}
            {p.isProduce && p.organic && <p className="text-xs text-earth">{t('sell.adminOrganicCheck')}</p>}
            {(p.minOrderQty > 1 || p.discountPercent > 0) && <p className="text-ink/70">{p.discountPercent > 0 ? `${t('seller.discount')}: ${p.discountPercent}% | ` : ''}{t('seller.minOrder')}: {p.minOrderQty} {p.unit}</p>}
            <p><strong>{t('market.licence')}:</strong> {p.licenceNumber || '-'}</p>
            <p className="text-ink/70">{t('market.sellerContact')}: {p.seller.shopName ? `${p.seller.shopName} (${p.seller.name})` : p.seller.name}{p.seller.verification ? ` [${t(`seller.v_${p.seller.verification}`)}]` : ''}, {p.seller.email}{p.seller.phone ? `, ${p.seller.phone}` : ''}</p>
            <div className="flex gap-2 pt-1">
              {status !== 'approved' && <button type="button" className="btn-primary px-3 py-1.5" onClick={() => review(p, 'approve')}>{t('market.approve')}</button>}
              {status !== 'rejected' && <button type="button" className="btn-outline px-3 py-1.5" onClick={() => review(p, 'reject')}>{t('market.reject')}</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
