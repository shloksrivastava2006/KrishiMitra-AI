import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api, { errorMessage, tokenStore } from '../../services/api.js';
import Field from '../../components/common/Field.jsx';
import LanguageSelect from '../../components/common/LanguageSelect.jsx';
import PasswordInput from '../auth/PasswordInput.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { ErrorBox, PageTitle } from '../../components/common/ui.jsx';

export default function SellerSettings() {
  const { t } = useI18n(); const { notify } = useToast(); const [error, setError] = useState('');
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm();
  const onSubmit = async (v) => {
    setError('');
    try {
      const r = await api.post('/auth/change-password', v);
      // The server ended every other session; keep this one by switching to the fresh token.
      const remembered = Boolean(localStorage.getItem('krishimitra_token'));
      tokenStore.set(r.data.data.token, remembered);
      notify(t('seller.passwordChanged')); reset();
    } catch (e) { setError(errorMessage(e)); }
  };
  return (
    <div className="space-y-6">
      <PageTitle>{t('seller.nav_settings')}</PageTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card max-w-md space-y-4">
        <h2 className="text-lg font-semibold">{t('seller.changePassword')}</h2>
        <Field id="cp-cur" label={t('seller.currentPassword')} error={errors.currentPassword && t('auth.errPasswordRequired')}><PasswordInput id="cp-cur" autoComplete="current-password" {...register('currentPassword', { required: true })} /></Field>
        <Field id="cp-new" label={t('seller.newPassword')} error={errors.newPassword && t('auth.errPasswordShort')}><PasswordInput id="cp-new" autoComplete="new-password" {...register('newPassword', { required: true, minLength: 8 })} /></Field>
        <Field id="cp-conf" label={t('auth.confirmPassword')} error={errors.confirmPassword && t('auth.errConfirm')}><PasswordInput id="cp-conf" autoComplete="new-password" {...register('confirmPassword', { required: true, validate: (v) => v === watch('newPassword') })} /></Field>
        <p className="text-xs text-ink/60">{t('seller.passwordNote')}</p>
        <ErrorBox>{error}</ErrorBox>
        <button className="btn-primary" disabled={isSubmitting}>{isSubmitting ? t('market.saving') : t('seller.changePassword')}</button>
      </form>
      <div className="card max-w-md"><h2 className="mb-3 text-lg font-semibold">{t('auth.language')}</h2><LanguageSelect /></div>
    </div>
  );
}
