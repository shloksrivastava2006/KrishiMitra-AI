import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Field from '../../components/common/Field.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from './AuthContext.jsx';
import PasswordInput from './PasswordInput.jsx';
import { authErrorText } from './authHelpers.js';

// Private page at /admin/login. It is not linked from the public site. The server (POST /auth/admin/login) only accepts admin accounts.
export default function AdminLoginPage() {
  const { t } = useI18n();
  const { user, adminLogin, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  if (user?.role === 'admin') return <Navigate to="/admin" replace />;

  const onSubmit = async ({ email, password }) => {
    setServerError('');
    try {
      const u = await adminLogin({ email: email.trim(), password, remember: false });
      notify(t('auth.loginSuccess', { name: u.name.split(' ')[0] }));
      navigate('/admin', { replace: true });
    } catch (err) { setServerError(authErrorText(err, t)); }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="flex items-center gap-2 text-3xl font-bold"><ShieldCheck className="h-7 w-7 text-forest" aria-hidden="true" /> {t('auth.adminTitle')}</h1>
      <p className="mt-2 text-sm text-ink/70">{t('auth.adminNote')}</p>
      {user && (
        <div className="mt-4 rounded-lg bg-gold-light/60 p-3 text-sm">
          {t('auth.adminSwitch')} <button type="button" className="font-semibold text-forest underline" onClick={() => logout()}>{t('nav.logout')}</button>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card mt-4 space-y-4">
        <Field id="a-email" label={t('auth.email')} error={errors.email && t('auth.errEmail')}>
          <input id="a-email" type="email" className="input" autoComplete="username" {...register('email', { required: true, pattern: /^\S+@\S+\.\S+$/ })} />
        </Field>
        <Field id="a-pass" label={t('auth.password')} error={errors.password && t('auth.errPasswordRequired')}>
          <PasswordInput id="a-pass" autoComplete="current-password" {...register('password', { required: true })} />
        </Field>
        {serverError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{serverError}</p>}
        <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? t('auth.wait') : t('auth.submitLogin')}</button>
      </form>
    </div>
  );
}
