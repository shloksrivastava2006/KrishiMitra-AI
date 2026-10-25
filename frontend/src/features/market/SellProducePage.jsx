import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import api, { assetUrl, errorMessage } from '../../services/api.js';
import Field from '../../components/common/Field.jsx';
import SmartImage from '../../components/common/SmartImage.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { Badge, Empty, ErrorBox, ImagePicker, Loading, PageTitle, fmtDate } from '../../components/common/ui.jsx';
import { crops as knownCrops } from '../../constants/content.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { GRADES, PRODUCE_CATS, UNITS, catKey, inr, isProduce, placeholderFor } from './format.js';

const DAY = 24 * 60 * 60 * 1000;
const isoDay = (d) => new Date(d).toISOString().slice(0, 10);
// Mirrors the server's window: harvested in the last 60 days, or expected within the next 90.
const minHarvest = () => isoDay(Date.now() - 60 * DAY);
const maxHarvest = () => isoDay(Date.now() + 90 * DAY);

// Best guess for the category when a farmer starts from one of their recorded crops. The farmer can change it.
const CROP_CATEGORY = { wheat: 'grains-pulses', rice: 'grains-pulses', maize: 'grains-pulses', pulses: 'grains-pulses', chickpea: 'grains-pulses', 'pigeon pea': 'grains-pulses', peas: 'grains-pulses',
  mustard: 'oilseeds', soybean: 'oilseeds', groundnut: 'oilseeds', tomato: 'vegetables', potato: 'vegetables', onion: 'vegetables', sugarcane: 'farm-other' };

const blank = (user) => ({ name: '', category: '', variety: '', description: '', price: '', unit: 'kg', stock: '', minOrderQty: '1', harvestDate: '', grade: '', organic: false,
  deliveryAvailable: true, deliveryLocation: '', village: user?.village || '', district: user?.district || '', state: user?.state || '' });

export default function SellProducePage() {
  const { t, lang } = useI18n(); const { notify } = useToast(); const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState(null); const [editing, setEditing] = useState(null); const [images, setImages] = useState([]);
  const [error, setError] = useState(''); const [fromCrop, setFromCrop] = useState('');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: blank(user) });
  const cropId = params.get('crop');
  const minDate = useMemo(minHarvest, []); const maxDate = useMemo(maxHarvest, []);

  const load = useCallback(() => api.get('/products/mine/list').then((r) => setItems(r.data.data.filter((p) => isProduce(p.category)))).catch((e) => setError(errorMessage(e))), []);
  useEffect(() => { load(); }, [load]);

  // "Sell this crop" on My Crops opens this page with ?crop=<id>: fill what we already know so the farmer types less.
  useEffect(() => {
    if (!cropId) return;
    api.get('/crops').then((r) => {
      const c = r.data.data.find((x) => x._id === cropId);
      if (!c) return;
      const harvest = c.expectedHarvestDate ? isoDay(c.expectedHarvestDate) : '';
      reset({ ...blank(user), name: c.name, variety: c.variety || '', category: CROP_CATEGORY[c.name.toLowerCase()] || '', harvestDate: harvest >= minHarvest() && harvest <= maxHarvest() ? harvest : '' });
      setFromCrop(c.name);
    }).catch(() => {});
  }, [cropId, reset, user]);

  const clearForm = () => { setEditing(null); setImages([]); setFromCrop(''); reset(blank(user)); if (cropId) setParams({}, { replace: true }); };

  const startEdit = (p) => {
    setEditing(p.id); setImages(p.images || []); setFromCrop('');
    reset({ name: p.name, category: p.category, variety: p.variety || '', description: p.description || '', price: String(p.listPrice), unit: p.unit, stock: String(p.stock), minOrderQty: String(p.minOrderQty || 1),
      harvestDate: p.harvestDate ? isoDay(p.harvestDate) : '', grade: p.grade || '', organic: Boolean(p.organic), deliveryAvailable: p.deliveryAvailable, deliveryLocation: p.deliveryLocation || '',
      village: p.village || '', district: p.district || '', state: p.state || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (v) => {
    setError('');
    try {
      const body = { ...v, stock: Number(v.stock), minOrderQty: Number(v.minOrderQty) || 1, images };
      if (editing) await api.put(`/products/${editing}`, body); else await api.post('/products', body);
      notify(t(editing ? 'sell.updated' : 'sell.submitted')); clearForm(); load();
    } catch (e) { setError(errorMessage(e)); }
  };

  const remove = async (p) => {
    if (!window.confirm(t('market.confirmDelete'))) return;
    try { await api.delete(`/products/${p.id}`); if (editing === p.id) clearForm(); load(); } catch (e) { setError(errorMessage(e)); }
  };
  const quick = async (p, patch) => { setError(''); try { await api.patch(`/products/${p.id}/quick`, patch); load(); } catch (e) { setError(errorMessage(e)); } };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageTitle>{t('sell.title')}</PageTitle>
      <p className="max-w-2xl text-ink/70">{t('sell.intro')}</p>
      <p className="mt-3 rounded-lg bg-gold-light/60 p-3 text-xs text-ink/80">{t('sell.paymentNote')}</p>
      <p className="mt-2 rounded-lg bg-gold-light/60 p-3 text-xs text-ink/80">{t('sell.approvalNote')}</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card mt-6 grid gap-4 sm:grid-cols-2">
        <h2 className="text-lg font-semibold sm:col-span-2">{editing ? t('sell.editTitle') : t('sell.addTitle')}</h2>
        {fromCrop && <p className="rounded-lg bg-leaf-light p-3 text-sm sm:col-span-2">{t('sell.fromCrop', { name: fromCrop })}</p>}

        <Field id="s-cat" label={t('sell.whatSell')} error={errors.category && t('market.errCat')}>
          <select id="s-cat" className="input" {...register('category', { required: true })}><option value="">-</option>{PRODUCE_CATS.map((c) => <option key={c} value={c}>{t(catKey(c))}</option>)}</select>
        </Field>
        <Field id="s-name" label={t('sell.name')} error={errors.name && t('auth.errName')}>
          <input id="s-name" list="s-names" className="input" {...register('name', { required: true, minLength: 2, maxLength: 100 })} />
          <datalist id="s-names">{knownCrops.map((c) => <option key={c.id} value={c.name} />)}</datalist>
        </Field>
        <Field id="s-var" label={t('sell.variety')}><input id="s-var" className="input" placeholder={t('sell.varietyEx')} {...register('variety', { maxLength: 60 })} /></Field>
        <Field id="s-grade" label={t('sell.grade')}>
          <select id="s-grade" className="input" {...register('grade')}><option value="">{t('sell.gradeNone')}</option>{GRADES.map((g) => <option key={g} value={g}>{t(`sell.grade_${g}`)}</option>)}</select>
        </Field>
        <div className="sm:col-span-2"><Field id="s-desc" label={t('sell.description')}><textarea id="s-desc" rows="3" className="input" {...register('description', { maxLength: 1000 })} /></Field><p className="mt-1 text-xs text-ink/60">{t('sell.descriptionHelp')}</p></div>
        <div className="sm:col-span-2"><span className="label">{t('seller.photos')}</span><ImagePicker value={images} onChange={setImages} /></div>

        <div>
          <Field id="s-price" label={t('sell.price')} error={errors.price && t('market.errPrice')}><input id="s-price" inputMode="decimal" className="input" {...register('price', { required: true, pattern: /^\d{1,7}(\.\d{1,2})?$/ })} /></Field>
          <p className="mt-1 text-xs text-ink/60">{t('sell.priceHelp')}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id="s-unit" label={t('market.prodUnit')}><select id="s-unit" className="input" {...register('unit')}>{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select></Field>
          <Field id="s-stock" label={t('sell.quantity')} error={errors.stock && t('market.errStock')}><input id="s-stock" inputMode="numeric" className="input" {...register('stock', { required: true, pattern: /^\d{1,7}$/ })} /></Field>
        </div>
        <Field id="s-min" label={t('seller.minOrder')} error={errors.minOrderQty && t('market.errStock')}><input id="s-min" inputMode="numeric" className="input" {...register('minOrderQty', { pattern: /^\d{1,4}$/ })} /></Field>
        <div>
          <Field id="s-harvest" label={t('sell.harvestDate')} error={errors.harvestDate && t('sell.errHarvest')}><input id="s-harvest" type="date" min={minDate} max={maxDate} className="input" {...register('harvestDate', { validate: (v) => !v || (v >= minDate && v <= maxDate) })} /></Field>
          <p className="mt-1 text-xs text-ink/60">{t('sell.harvestHelp')}</p>
        </div>

        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-forest" {...register('organic')} /> {t('sell.organic')}</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-forest" {...register('deliveryAvailable')} /> {t('seller.deliveryAvailable')}</label>
        <Field id="s-dloc" label={t('seller.deliveryLocation')}><input id="s-dloc" className="input" placeholder={t('seller.deliveryLocationEx')} {...register('deliveryLocation', { maxLength: 200 })} /></Field>
        <Field id="s-village" label={t('market.village')}><input id="s-village" className="input" {...register('village')} /></Field>
        <Field id="s-district" label={t('market.district')}><input id="s-district" className="input" {...register('district')} /></Field>
        <Field id="s-state" label={t('market.state')}><input id="s-state" className="input" {...register('state')} /></Field>

        {editing && <p className="text-xs text-ink/60 sm:col-span-2">{t('sell.editNote')}</p>}
        <div className="sm:col-span-2"><ErrorBox>{error}</ErrorBox></div>
        <div className="flex gap-3 sm:col-span-2">
          <button className="btn-primary" disabled={isSubmitting}>{isSubmitting ? t('market.saving') : t(editing ? 'market.save' : 'sell.submit')}</button>
          {(editing || fromCrop) && <button type="button" className="btn-outline" onClick={clearForm}>{t('market.cancelEdit')}</button>}
        </div>
      </form>

      <h2 className="mb-3 mt-10 text-xl font-semibold">{t('sell.myListings')}</h2>
      {!items && !error && <Loading />}
      {items && items.length === 0 && <Empty>{t('sell.none')}</Empty>}
      <ul className="space-y-3">
        {(items || []).map((p) => <Row key={p.id} p={p} lang={lang} onEdit={() => startEdit(p)} onRemove={() => remove(p)} onQuick={(patch) => quick(p, patch)} />)}
      </ul>
    </div>
  );
}

function Row({ p, lang, onEdit, onRemove, onQuick }) {
  const { t } = useI18n();
  const [price, setPrice] = useState(String(p.listPrice)); const [stock, setStock] = useState(String(p.stock));
  useEffect(() => { setPrice(String(p.listPrice)); setStock(String(p.stock)); }, [p.listPrice, p.stock]);
  const [folder, name] = placeholderFor(p.category);
  const harvest = p.harvestDate && (new Date(p.harvestDate) > new Date() ? t('sell.expected', { date: fmtDate(p.harvestDate, lang) }) : t('sell.harvested', { date: fmtDate(p.harvestDate, lang) }));
  const priceOk = /^\d{1,7}(\.\d{1,2})?$/.test(price); const stockOk = /^\d{1,7}$/.test(stock);
  const changed = price !== String(p.listPrice) || stock !== String(p.stock);
  return (
    <li className="card flex flex-col gap-3 p-4 text-sm sm:flex-row">
      {p.images?.[0] ? <img src={assetUrl(p.images[0])} alt="" className="h-20 w-20 rounded-lg object-cover" /> : <SmartImage folder={folder} name={name} alt="" className="h-20 w-20 rounded-lg" />}
      <div className="flex-1 space-y-1">
        <p className="font-semibold">{p.name}{p.variety ? ` (${p.variety})` : ''} <span className="font-normal text-ink/60">| {t(catKey(p.category))}</span></p>
        <p>{inr(p.price)} / {p.unit} | {t('market.left', { n: p.stock })}{harvest ? ` | ${harvest}` : ''}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge kind={p.status} label={t(`market.s_${p.status}`)} />
          {p.organic && <span className="rounded-full bg-leaf-light px-2.5 py-0.5 text-xs font-medium text-forest">{t('market.organic')}</span>}
          {p.grade && <span className="rounded-full bg-earth-light px-2.5 py-0.5 text-xs">{t('market.gradeLabel', { g: p.grade })}</span>}
          {p.status === 'approved' && <Link to={`/marketplace/${p.id}`} className="text-xs text-forest underline">{t('sell.viewListing')}</Link>}
        </div>
        {p.status === 'rejected' && p.rejectionReason && <p className="text-red-700">{t('market.rejectedWhy')}: {p.rejectionReason}</p>}
        {['approved', 'inactive', 'out_of_stock'].includes(p.status) && (
          <div className="flex flex-wrap items-end gap-2 pt-1">
            <label className="text-xs text-ink/60">{t('sell.price')}<input aria-label={t('sell.price')} inputMode="decimal" className="input mt-0.5 w-24 py-1" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
            <label className="text-xs text-ink/60">{t('sell.quantity')}<input aria-label={t('sell.quantity')} inputMode="numeric" className="input mt-0.5 w-24 py-1" value={stock} onChange={(e) => setStock(e.target.value)} /></label>
            <button type="button" className="btn-outline px-3 py-1.5" disabled={!changed || !priceOk || !stockOk} onClick={() => onQuick({ price, stock: Number(stock) })}>{t('sell.updateNow')}</button>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-start gap-2 sm:flex-col sm:items-end">
        <button type="button" className="btn-outline px-3 py-1.5" onClick={onEdit}>{t('market.edit')}</button>
        {p.status === 'approved' && <button type="button" className="btn-outline px-3 py-1.5" onClick={() => onQuick({ active: false })}>{t('sell.pause')}</button>}
        {p.status === 'out_of_stock' && <button type="button" className="btn-outline px-3 py-1.5" onClick={() => onQuick({ active: false })}>{t('sell.pause')}</button>}
        {p.status === 'inactive' && <button type="button" className="btn-primary px-3 py-1.5" onClick={() => onQuick({ active: true })}>{t('sell.resume')}</button>}
        <button type="button" className="text-red-700" onClick={onRemove}>{t('market.delete')}</button>
      </div>
    </li>
  );
}
