import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api, { errorMessage } from '../../services/api.js';
import Field from '../../components/common/Field.jsx';
import PasswordInput from '../auth/PasswordInput.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';

export default function AddAdminForm({ onCreated }) {
  const { t } = useI18n();
  const { notify } = useToast();
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();
  const onSubmit = async (values) => {
    setServerError('');
    try {
      await api.post('/admin/users', values);
      notify(t('admin.adminCreated', { email: values.email }));
      reset(); onCreated();
    } catch (err) { setServerError(errorMessage(err)); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="card mb-6 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><h2 className="text-lg font-semibold">{t('admin.addAdmin')}</h2><p className="text-sm text-ink/70">{t('admin.addAdminHelp')}</p></div>
      <Field id="a-name" label={t('auth.fullName')} error={errors.name && t('auth.errName')}>
        <input id="a-name" className="input" {...register('name', { required: true, minLength: 2 })} />
      </Field>
      <Field id="a-email" label={t('auth.email')} error={errors.email && t('auth.errEmail')}>
        <input id="a-email" type="email" className="input" {...register('email', { required: true, pattern: /^\S+@\S+\.\S+$/ })} />
      </Field>
      <Field id="a-password" label={t('auth.password')} error={errors.password && t('admin.errAdminPassword')}>
        <PasswordInput id="a-password" autoComplete="new-password" {...register('password', { required: true, minLength: 12 })} />
      </Field>
      <div className="flex items-end"><button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? t('auth.wait') : t('admin.createAdmin')}</button></div>
      {serverError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">{serverError}</p>}
    </form>
  );
}
