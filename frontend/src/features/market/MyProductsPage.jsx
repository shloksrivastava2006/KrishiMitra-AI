import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api, { errorMessage } from '../../services/api.js';
import Field from '../../components/common/Field.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { INPUT_CATS, LICENCE_CATS, UNITS, badgeClass, catKey, inr, isProduce } from './format.js';

const blank = { name: '', category: '', description: '', price: '', unit: 'kg', stock: '', district: '', state: '', licenceNumber: '' };

export default function MyProductsPage() {
  const { t } = useI18n(); const { notify } = useToast();
  const [items, setItems] = useState(null); const [editing, setEditing] = useState(null); const [error, setError] = useState('');
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({ defaultValues: blank });
  const needsLicence = LICENCE_CATS.includes(watch('category'));

  const load = useCallback(() => api.get('/products/mine/list').then((r) => setItems(r.data.data.filter((p) => !isProduce(p.category)))).catch((e) => setError(errorMessage(e))), []);
  useEffect(() => { load(); }, [load]);

  const startEdit = (p) => { setEditing(p.id); reset({ name: p.name, category: p.category, description: p.description || '', price: String(p.price), unit: p.unit, stock: String(p.stock), district: p.district || '', state: p.state || '', licenceNumber: p.licenceNumber || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const cancelEdit = () => { setEditing(null); reset(blank); };

  const onSubmit = async (v) => {
    setError('');
    try {
      const body = { ...v, stock: Number(v.stock) };
      if (editing) await api.put(`/products/${editing}`, body); else await api.post('/products', body);
      notify(t('market.s_pending')); cancelEdit(); load();
    } catch (e) { setError(errorMessage(e)); }
  };
  const remove = async (p) => {
    if (!window.confirm(t('market.confirmDelete'))) return;
    try { await api.delete(`/products/${p.id}`); load(); } catch (e) { setError(errorMessage(e)); }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t('market.myProducts')}</h1>
      <p className="mt-2 rounded-lg bg-leaf-light p-3 text-sm">{t('market.sellProduceHint')} <Link to="/sell-produce" className="font-semibold text-forest underline">{t('nav.sellProduce')}</Link></p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card mt-6 grid gap-4 sm:grid-cols-2">
        <h2 className="text-lg font-semibold sm:col-span-2">{editing ? t('market.editProduct') : t('market.addProduct')}</h2>
        <Field id="p-name" label={t('market.prodName')} error={errors.name && t('auth.errName')}><input id="p-name" className="input" {...register('name', { required: true, minLength: 2 })} /></Field>
        <Field id="p-cat" label={t('market.prodCategory')} error={errors.category && t('market.errCat')}>
          <select id="p-cat" className="input" {...register('category', { required: true })}><option value="">-</option>{INPUT_CATS.map((c) => <option key={c} value={c}>{t(catKey(c))}</option>)}</select>
        </Field>
        <Field id="p-price" label={t('market.prodPrice')} error={errors.price && t('market.errPrice')}><input id="p-price" inputMode="decimal" className="input" {...register('price', { required: true, pattern: /^\d{1,7}(\.\d{1,2})?$/ })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="p-unit" label={t('market.prodUnit')}><select id="p-unit" className="input" {...register('unit')}>{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select></Field>
          <Field id="p-stock" label={t('market.prodStock')} error={errors.stock && t('market.errStock')}><input id="p-stock" inputMode="numeric" className="input" {...register('stock', { required: true, pattern: /^\d{1,7}$/ })} /></Field>
        </div>
        <Field id="p-district" label={t('market.district')}><input id="p-district" className="input" {...register('district')} /></Field>
        <Field id="p-state" label={t('market.state')}><input id="p-state" className="input" {...register('state')} /></Field>
        {needsLicence && (
          <div className="sm:col-span-2">
            <Field id="p-lic" label={t('market.licenceLabel')} error={errors.licenceNumber && t('market.errLicence')}><input id="p-lic" className="input" {...register('licenceNumber', { required: true })} /></Field>
            <p className="mt-1 text-xs text-ink/60">{t('market.licenceHelp')}</p>
          </div>
        )}
        <div className="sm:col-span-2"><Field id="p-desc" label={t('market.prodDescription')}><textarea id="p-desc" rows="3" className="input" {...register('description')} /></Field></div>
        {editing && <p className="text-xs text-ink/60 sm:col-span-2">{t('market.editResetNote')}</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">{error}</p>}
        <div className="flex gap-3 sm:col-span-2"><button className="btn-primary" disabled={isSubmitting}>{isSubmitting ? t('market.saving') : t('market.save')}</button>{editing && <button type="button" className="btn-outline" onClick={cancelEdit}>{t('market.cancelEdit')}</button>}</div>
      </form>

      {items && items.length === 0 && <p className="mt-6 text-ink/70">{t('market.noProducts2')}</p>}
      <ul className="mt-6 space-y-3">
        {(items || []).map((p) => (
          <li key={p.id} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-semibold">{p.name} <span className="font-normal text-ink/60">| {t(catKey(p.category))}</span></p>
              <p>{inr(p.price)} / {p.unit} | {t('market.left', { n: p.stock })}</p>
              {p.status === 'rejected' && p.rejectionReason && <p className="text-red-700">{t('market.rejectedWhy')}: {p.rejectionReason}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass(p.status === 'approved' ? 'ok' : p.status === 'rejected' ? 'bad' : 'warn')}`}>{t(`market.s_${p.status}`)}</span>
              <button type="button" className="btn-outline px-3 py-1.5" onClick={() => startEdit(p)}>{t('market.edit')}</button>
              <button type="button" className="text-red-700" onClick={() => remove(p)}>{t('market.delete')}</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
