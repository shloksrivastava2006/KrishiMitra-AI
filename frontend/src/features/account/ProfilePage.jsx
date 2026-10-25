import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api, { errorMessage } from '../../services/api.js';
import Field from '../../components/common/Field.jsx';
import LanguageSelect from '../../components/common/LanguageSelect.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { ErrorBox, PageTitle } from '../../components/common/ui.jsx';

// Editable contact details. The server only reads name, phone, village, district and state here;
// role, email and account status can never be changed through this form.
export default function ProfilePage() {
  const { t } = useI18n(); const { user, setUser } = useAuth(); const { notify } = useToast();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { name: user.name, phone: user.phone || '', village: user.village || '', district: user.district || '', state: user.state || '' } });

  const onSubmit = async (v) => {
    setError('');
    const body = { name: v.name.trim(), village: v.village.trim(), district: v.district.trim(), state: v.state.trim() };
    if (v.phone) body.phone = v.phone;   // blank keeps the saved number, so the mobile-number login keeps working
    try { const r = await api.patch('/auth/profile', body); setUser(r.data.data.user); notify(t('farmer.profileSaved')); }
    catch (e) { setError(errorMessage(e)); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12">
      <div><PageTitle>{t('nav.profile')}</PageTitle><p className="-mt-3 text-sm text-ink/65">{t('farmer.profileIntro')}</p></div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card grid gap-4 sm:grid-cols-2">
        <Field id="pf-name" label={t('auth.fullName')} error={errors.name && t('seller.errRequired')}><input id="pf-name" className="input" autoComplete="name" {...register('name', { required: true, minLength: 2 })} /></Field>
        <Field id="pf-phone" label={t('auth.phoneRequired')} error={errors.phone && t('auth.errPhone')}><input id="pf-phone" inputMode="numeric" autoComplete="tel" className="input" {...register('phone', { pattern: /^$|^[6-9]\d{9}$/ })} /></Field>
        <div className="sm:col-span-2"><Field id="pf-email" label={t('auth.email')}><input id="pf-email" className="input bg-ink/5" value={user.email} readOnly /></Field><p className="mt-1 text-xs text-ink/60">{t('farmer.profileHint')}</p></div>
        <Field id="pf-village" label={t('market.village')}><input id="pf-village" className="input" {...register('village')} /></Field>
        <Field id="pf-district" label={t('market.district')}><input id="pf-district" className="input" {...register('district')} /></Field>
        <Field id="pf-state" label={t('market.state')}><input id="pf-state" className="input" {...register('state')} /></Field>
        <dl className="grid content-end gap-1 text-sm"><dt className="text-ink/60">{t('account.role')}</dt><dd className="font-medium capitalize">{user.role}</dd></dl>
        <div className="sm:col-span-2"><ErrorBox>{error}</ErrorBox></div>
        <div className="sm:col-span-2"><button className="btn-primary" disabled={isSubmitting}>{isSubmitting ? t('market.saving') : t('market.save')}</button></div>
      </form>
      <div className="card"><h2 className="mb-3 text-lg font-semibold">{t('auth.language')}</h2><LanguageSelect /></div>
    </div>
  );
}
