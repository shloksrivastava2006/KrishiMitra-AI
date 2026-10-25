import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../../services/api.js';
import Field from '../../components/common/Field.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { CATEGORIES, LICENCE_CATS, UNITS, catKey } from '../market/format.js';
import { ErrorBox, ImagePicker, Loading, PageTitle } from '../../components/common/ui.jsx';

const blank = { name: '', category: '', subcategory: '', description: '', price: '', discountPercent: '', unit: 'kg', stock: '', minOrderQty: '1', district: '', state: '', deliveryAvailable: true, deliveryLocation: '', licenceNumber: '' };

// Used for both "Add Product" (/seller/products/new) and "Edit" (/seller/products/:id/edit).
export default function ProductForm() {
  const { id } = useParams(); const editing = Boolean(id);
  const { t } = useI18n(); const { notify } = useToast(); const navigate = useNavigate();
  const [images, setImages] = useState([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(editing);
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({ defaultValues: blank });
  const needsLicence = LICENCE_CATS.includes(watch('category'));

  useEffect(() => {
    if (!editing) return;
    api.get('/products/mine/list').then((r) => {
      const p = r.data.data.find((x) => x.id === id);
      if (!p) return setError(t('seller.productNotFound'));
      setImages(p.images || []);
      reset({ name: p.name, category: p.category, subcategory: p.subcategory || '', description: p.description || '', price: String(p.listPrice), discountPercent: p.discountPercent ? String(p.discountPercent) : '',
        unit: p.unit, stock: String(p.stock), minOrderQty: String(p.minOrderQty), district: p.district || '', state: p.state || '', deliveryAvailable: p.deliveryAvailable,
        deliveryLocation: p.deliveryLocation || '', licenceNumber: p.licenceNumber || '' });
    }).catch((e) => setError(errorMessage(e))).finally(() => setLoading(false));
  }, [id, editing, reset, t]);

  const onSubmit = async (v) => {
    setError('');
    try {
      const body = { ...v, stock: Number(v.stock), minOrderQty: Number(v.minOrderQty) || 1, discountPercent: Number(v.discountPercent) || 0, images };
      if (editing) await api.put(`/products/${id}`, body); else await api.post('/products', body);
      notify(t(editing ? 'seller.productUpdated' : 'seller.productSubmitted'));
      navigate('/seller/products');
    } catch (e) { setError(errorMessage(e)); }
  };

  if (loading) return <Loading />;
  return (
    <div>
      <PageTitle>{t(editing ? 'seller.editProduct' : 'seller.nav_addProduct')}</PageTitle>
      <p className="mb-4 rounded-lg bg-gold-light/60 p-3 text-xs text-ink/80">{t('seller.approvalNote')}</p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field id="p-name" label={t('market.prodName')} error={errors.name && t('auth.errName')}><input id="p-name" className="input" {...register('name', { required: true, minLength: 2 })} /></Field></div>
        <Field id="p-cat" label={t('market.prodCategory')} error={errors.category && t('market.errCat')}>
          <select id="p-cat" className="input" {...register('category', { required: true })}><option value="">-</option>{CATEGORIES.map((c) => <option key={c} value={c}>{t(catKey(c))}</option>)}</select>
        </Field>
        <Field id="p-sub" label={t('seller.subcategory')}><input id="p-sub" className="input" placeholder={t('seller.subcategoryEx')} {...register('subcategory')} /></Field>
        <div className="sm:col-span-2"><Field id="p-desc" label={t('market.prodDescription')}><textarea id="p-desc" rows="3" className="input" {...register('description', { maxLength: 1000 })} /></Field></div>
        <div className="sm:col-span-2"><span className="label">{t('seller.photos')}</span><ImagePicker value={images} onChange={setImages} /></div>
        <Field id="p-price" label={t('seller.listPrice')} error={errors.price && t('market.errPrice')}><input id="p-price" inputMode="decimal" className="input" {...register('price', { required: true, pattern: /^\d{1,7}(\.\d{1,2})?$/ })} /></Field>
        <Field id="p-disc" label={t('seller.discount')} error={errors.discountPercent && t('seller.errDiscount')}><input id="p-disc" inputMode="decimal" className="input" {...register('discountPercent', { pattern: /^$|^\d{1,2}(\.\d{1,2})?$/, max: 90 })} /></Field>
        <Field id="p-unit" label={t('market.prodUnit')}><select id="p-unit" className="input" {...register('unit')}>{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select></Field>
        <Field id="p-stock" label={t('market.prodStock')} error={errors.stock && t('market.errStock')}><input id="p-stock" inputMode="numeric" className="input" {...register('stock', { required: true, pattern: /^\d{1,7}$/ })} /></Field>
        <Field id="p-min" label={t('seller.minOrder')} error={errors.minOrderQty && t('market.errStock')}><input id="p-min" inputMode="numeric" className="input" {...register('minOrderQty', { pattern: /^\d{1,4}$/ })} /></Field>
        <div className="flex items-end"><label className="flex items-center gap-2 pb-2.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-forest" {...register('deliveryAvailable')} /> {t('seller.deliveryAvailable')}</label></div>
        <Field id="p-district" label={t('market.district')}><input id="p-district" className="input" {...register('district')} /></Field>
        <Field id="p-state" label={t('market.state')}><input id="p-state" className="input" {...register('state')} /></Field>
        <div className="sm:col-span-2"><Field id="p-dloc" label={t('seller.deliveryLocation')}><input id="p-dloc" className="input" placeholder={t('seller.deliveryLocationEx')} {...register('deliveryLocation')} /></Field></div>
        {needsLicence && (
          <div className="sm:col-span-2">
            <Field id="p-lic" label={t('market.licenceLabel')} error={errors.licenceNumber && t('market.errLicence')}><input id="p-lic" className="input" {...register('licenceNumber', { required: true })} /></Field>
            <p className="mt-1 text-xs text-ink/60">{t('market.licenceHelp')}</p>
          </div>
        )}
        {editing && <p className="text-xs text-ink/60 sm:col-span-2">{t('market.editResetNote')}</p>}
        <div className="sm:col-span-2"><ErrorBox>{error}</ErrorBox></div>
        <div className="flex gap-3 sm:col-span-2">
          <button className="btn-primary" disabled={isSubmitting}>{isSubmitting ? t('market.saving') : t(editing ? 'market.save' : 'seller.submitForApproval')}</button>
          <button type="button" className="btn-outline" onClick={() => navigate('/seller/products')}>{t('market.cancelEdit')}</button>
        </div>
      </form>
    </div>
  );
}
