import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Pencil, Play, Trash2 } from 'lucide-react';
import api, { assetUrl, errorMessage } from '../../services/api.js';
import SmartImage from '../../components/common/SmartImage.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { CATEGORIES, catKey, imageName, inr } from '../market/format.js';
import { Badge, Empty, ErrorBox, Loading, PageTitle, useFetch } from '../../components/common/ui.jsx';

const STATUSES = ['pending', 'approved', 'rejected', 'inactive', 'out_of_stock'];

export default function SellerProducts() {
  const { t } = useI18n(); const { notify } = useToast();
  const { data, error, loading, reload } = useFetch('/products/mine/list');
  const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [status, setStatus] = useState('');
  const [err, setErr] = useState(''); const [edit, setEdit] = useState(null);   // { id, price, stock }

  const rows = useMemo(() => (data || []).filter((p) => (!q || p.name.toLowerCase().includes(q.toLowerCase())) && (!cat || p.category === cat) && (!status || p.status === status)), [data, q, cat, status]);
  const run = async (fn) => { setErr(''); try { await fn(); reload(); } catch (e) { setErr(errorMessage(e)); } };
  const saveQuick = () => run(async () => {
    const body = {}; if (edit.price !== '') body.price = edit.price; if (edit.stock !== '') body.stock = Number(edit.stock);
    await api.patch(`/products/${edit.id}/quick`, body); setEdit(null); notify(t('seller.saved'));
  });
  const toggle = (p) => run(() => api.patch(`/products/${p.id}/quick`, { active: p.status === 'inactive' }));
  const remove = (p) => { if (window.confirm(t('market.confirmDelete'))) run(() => api.delete(`/products/${p.id}`)); };

  return (
    <div>
      <PageTitle action={<Link to="/seller/products/new" className="btn-primary">{t('seller.nav_addProduct')}</Link>}>{t('seller.nav_myProducts')}</PageTitle>
      <div className="mb-4 flex flex-wrap gap-3">
        <input className="input max-w-xs" aria-label={t('market.search')} placeholder={t('market.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input max-w-[12rem]" aria-label={t('market.allCategories')} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">{t('market.allCategories')}</option>{CATEGORIES.map((c) => <option key={c} value={c}>{t(catKey(c))}</option>)}
        </select>
        <select className="input max-w-[12rem]" aria-label={t('seller.allStatuses')} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t('seller.allStatuses')}</option>{STATUSES.map((s) => <option key={s} value={s}>{t(`market.s_${s}`)}</option>)}
        </select>
      </div>
      <ErrorBox>{error || err}</ErrorBox>
      {loading && <Loading />}
      {data && data.length === 0 && <Empty>{t('market.noProducts2')} <Link to="/seller/products/new" className="font-semibold text-forest">{t('seller.nav_addProduct')}</Link></Empty>}
      {data && data.length > 0 && rows.length === 0 && <Empty>{t('seller.noMatch')}</Empty>}
      <ul className="space-y-3">
        {rows.map((p) => (
          <li key={p.id} className="card flex flex-wrap gap-4 p-4 text-sm">
            {p.images[0] ? <img src={assetUrl(p.images[0])} alt="" className="h-20 w-20 rounded-lg object-cover" /> : <SmartImage folder="products" name={imageName(p.category)} alt="" className="h-20 w-20 rounded-lg" />}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{p.name} <span className="font-normal text-ink/60">| {t(catKey(p.category))}</span></p>
              <p>{inr(p.price)} / {p.unit}{p.discountPercent ? <span className="text-ink/60"> ({t('seller.offPercent', { n: p.discountPercent })}, {inr(p.listPrice)})</span> : ''} | {t('market.left', { n: p.stock })}</p>
              {p.status === 'rejected' && p.rejectionReason && <p className="text-red-700">{t('market.rejectedWhy')}: {p.rejectionReason}</p>}
              {edit?.id === p.id && (
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <label className="text-xs">{t('market.prodPrice')}<input className="input mt-1 w-28" inputMode="decimal" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} /></label>
                  <label className="text-xs">{t('market.prodStock')}<input className="input mt-1 w-24" inputMode="numeric" value={edit.stock} onChange={(e) => setEdit({ ...edit, stock: e.target.value })} /></label>
                  <button type="button" className="btn-primary px-3 py-2" onClick={saveQuick}>{t('market.save')}</button>
                  <button type="button" className="btn-outline px-3 py-2" onClick={() => setEdit(null)}>{t('market.cancelEdit')}</button>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge kind={p.status} label={t(`market.s_${p.status}`)} />
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className="btn-outline px-3 py-1.5" onClick={() => setEdit({ id: p.id, price: String(p.listPrice), stock: String(p.stock) })}>{t('seller.priceStock')}</button>
                <Link to={`/seller/products/${p.id}/edit`} className="btn-outline px-3 py-1.5"><Pencil className="h-4 w-4" aria-hidden="true" /> {t('market.edit')}</Link>
                {['approved', 'out_of_stock', 'inactive'].includes(p.status) && (
                  <button type="button" className="btn-outline px-3 py-1.5" onClick={() => toggle(p)}>{p.status === 'inactive' ? <><Play className="h-4 w-4" aria-hidden="true" /> {t('seller.resume')}</> : <><Pause className="h-4 w-4" aria-hidden="true" /> {t('seller.pause')}</>}</button>
                )}
                <button type="button" className="px-2 text-red-700" aria-label={t('market.delete')} onClick={() => remove(p)}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
