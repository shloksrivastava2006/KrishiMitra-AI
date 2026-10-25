import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api, { errorMessage } from '../../services/api.js';
import Field from '../../components/common/Field.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { Badge, ErrorBox, PageTitle } from '../../components/common/ui.jsx';

export default function SellerProfile() {
  const { t } = useI18n(); const { user, setUser } = useAuth(); const { notify } = useToast();
  const s = user.seller || {}; const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: {
    name: user.name, phone: user.phone || '', shopName: s.shopName || '', address: s.address || '', village: user.village || '', district: user.district || '', state: user.state || '',
    pincode: s.pincode || '', licenceNumber: s.licenceNumber || '', upiId: s.upiId || '', bankAccountName: s.bankAccountName || '', bankAccountNumber: '', bankIfsc: s.bankIfsc || '' } });

  const onSubmit = async (v) => {
    setError('');
    const body = { ...v }; if (!body.bankAccountNumber) delete body.bankAccountNumber;   // blank = keep the saved account number
    try { const r = await api.patch('/auth/profile', body); setUser(r.data.data.user); notify(t('seller.profileSaved')); } catch (e) { setError(errorMessage(e)); }
  };
  const v = s.verification || 'pending';
  const req = (k) => errors[k] && t('seller.errRequired');
  return (
    <div>
      <PageTitle>{t('seller.nav_profile')}</PageTitle>
      <div className="card mb-5 flex flex-wrap items-center gap-3">
        <span className="text-sm text-ink/60">{t('seller.verification')}:</span><Badge kind={v} label={t(`seller.v_${v}`)} />
        <span className="text-sm text-ink/70">{t(`seller.banner_${v}`)} {s.verificationNote}</span>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card grid gap-4 sm:grid-cols-2">
        <Field id="sp-name" label={t('auth.fullName')} error={req('name')}><input id="sp-name" className="input" {...register('name', { required: true, minLength: 2 })} /></Field>
        <Field id="sp-phone" label={t('auth.phoneRequired')} error={errors.phone && t('auth.errPhone')}><input id="sp-phone" inputMode="numeric" className="input" {...register('phone', { required: true, pattern: /^[6-9]\d{9}$/ })} /></Field>
        <div className="sm:col-span-2"><Field id="sp-email" label={t('auth.email')}><input id="sp-email" className="input bg-ink/5" value={user.email} readOnly /></Field></div>
        <div className="sm:col-span-2"><Field id="sp-shop" label={t('seller.shopName')} error={req('shopName')}><input id="sp-shop" className="input" {...register('shopName', { required: true, minLength: 2 })} /></Field></div>
        <div className="sm:col-span-2"><Field id="sp-addr" label={t('seller.address')} error={req('address')}><input id="sp-addr" className="input" {...register('address', { required: true, minLength: 5 })} /></Field></div>
        <Field id="sp-village" label={t('market.village')}><input id="sp-village" className="input" {...register('village')} /></Field>
        <Field id="sp-district" label={t('market.district')} error={req('district')}><input id="sp-district" className="input" {...register('district', { required: true })} /></Field>
        <Field id="sp-state" label={t('market.state')} error={req('state')}><input id="sp-state" className="input" {...register('state', { required: true })} /></Field>
        <Field id="sp-pin" label={t('seller.pincode')} error={errors.pincode && t('seller.errPincode')}><input id="sp-pin" inputMode="numeric" className="input" {...register('pincode', { required: true, pattern: /^[1-9]\d{5}$/ })} /></Field>
        <div className="sm:col-span-2"><Field id="sp-lic" label={t('seller.licence')}><input id="sp-lic" className="input" {...register('licenceNumber')} /></Field><p className="mt-1 text-xs text-ink/60">{t('seller.licenceChangeNote')}</p></div>
        <h2 className="text-lg font-semibold sm:col-span-2">{t('seller.payoutDetails')}</h2>
        <Field id="sp-upi" label={t('seller.upi')} error={errors.upiId && t('seller.errUpi')}><input id="sp-upi" className="input" {...register('upiId', { pattern: /^$|^[\w.-]{2,40}@[a-zA-Z]{2,30}$/ })} /></Field>
        <Field id="sp-an" label={t('seller.accountName')}><input id="sp-an" className="input" {...register('bankAccountName')} /></Field>
        <Field id="sp-acc" label={`${t('seller.accountNumber')}${s.bankAccountLast4 ? ` (${t('seller.savedEnding', { n: s.bankAccountLast4 })})` : ''}`} error={errors.bankAccountNumber && t('seller.errAccount')}>
          <input id="sp-acc" inputMode="numeric" autoComplete="off" className="input" placeholder={s.bankAccountLast4 ? t('seller.leaveBlank') : ''} {...register('bankAccountNumber', { pattern: /^$|^\d{9,18}$/ })} />
        </Field>
        <Field id="sp-ifsc" label={t('seller.ifsc')} error={errors.bankIfsc && t('seller.errIfsc')}><input id="sp-ifsc" className="input uppercase" {...register('bankIfsc', { pattern: /^$|^[A-Za-z]{4}0[A-Za-z0-9]{6}$/ })} /></Field>
        <div className="sm:col-span-2"><ErrorBox>{error}</ErrorBox></div>
        <div className="sm:col-span-2"><button className="btn-primary" disabled={isSubmitting}>{isSubmitting ? t('market.saving') : t('market.save')}</button></div>
      </form>
    </div>
  );
}
