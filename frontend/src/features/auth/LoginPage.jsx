import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Field from '../../components/common/Field.jsx';
import LanguageSelect from '../../components/common/LanguageSelect.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from './AuthContext.jsx';
import PasswordInput from './PasswordInput.jsx';
import SocialButtons from './SocialButtons.jsx';
import { authErrorText, returnOrHome, socialErrorText } from './authHelpers.js';

const phoneOrEmail = /^(\S+@\S+\.\S+|[6-9]\d{9})$/;

// Farmers, sellers and customers share this page (three tabs). Administrators do NOT log in here: they have their own private page.
export default function LoginPage() {
  const { t } = useI18n();
  const { user, login, socialLogin } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(['seller', 'customer'].includes(location.state?.tab) ? location.state.tab : 'farmer');
  const [serverError, setServerError] = useState('');
  const [socialBusy, setSocialBusy] = useState(false);
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm({ defaultValues: { remember: false } });

  if (user) return <Navigate to={returnOrHome(location, user)} replace />;

  const onSubmit = async ({ identifier, password, remember }) => {
    setServerError('');
    try {
      const u = await login({ identifier: identifier.trim(), password, remember, portal: tab });
      notify(t('auth.loginSuccess', { name: u.name.split(' ')[0] }));
      navigate(returnOrHome(location, u), { replace: true });
    } catch (err) {
      setServerError(authErrorText(err, t));
    }
  };

  // Google / Apple. A person who has no account yet is sent to the signup page with their name and email already filled in.
  const onSocial = async ({ provider, idToken, name }) => {
    setServerError(''); setSocialBusy(true);
    try {
      const u = await socialLogin({ provider, idToken, portal: tab, remember: getValues('remember') });
      notify(t('auth.loginSuccess', { name: u.name.split(' ')[0] }));
      navigate(returnOrHome(location, u), { replace: true });
    } catch (err) {
      const details = err.response?.data?.details;
      if (err.response?.status === 404 && details?.code === 'NO_ACCOUNT') {
        navigate('/register', { state: { ...location.state, tab, social: { provider, idToken, email: details.email, name: name || details.name } } });
        return;
      }
      setServerError(socialErrorText(err, t));
    } finally { setSocialBusy(false); }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-3xl font-bold">{t('auth.loginTitle')}</h1>
        <LanguageSelect />
      </div>

      <div role="tablist" aria-label={t('auth.loginTitle')} className="mt-6 grid grid-cols-3 rounded-lg bg-leaf-light p-1 text-sm font-semibold">
        {['farmer', 'seller', 'customer'].map((key) => (
          <button key={key} role="tab" type="button" aria-selected={tab === key} onClick={() => { setTab(key); setServerError(''); }}
            className={`rounded-md px-3 py-2 ${tab === key ? 'bg-white text-forest shadow-sm' : 'text-ink/60'}`}>
            {t(`auth.${key}Login`)}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink/60">{t(`auth.${tab}LoginNote`)}</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card mt-4 space-y-4">
        <Field id="identifier" label={t('auth.identifier')} error={errors.identifier && t('auth.errIdentifier')}>
          <input id="identifier" className="input" autoComplete="username" aria-invalid={Boolean(errors.identifier)}
            {...register('identifier', { required: true, pattern: phoneOrEmail })} />
        </Field>
        <Field id="password" label={t('auth.password')} error={errors.password && t('auth.errPasswordRequired')}>
          <PasswordInput id="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} {...register('password', { required: true })} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink/80">
          <input type="checkbox" className="h-4 w-4 accent-forest" {...register('remember')} /> {t('auth.remember')}
        </label>
        {serverError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{serverError}</p>}
        <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? t('auth.wait') : t('auth.submitLogin')}</button>
        <p className="text-sm"><Link className="font-semibold text-forest" to="/forgot-password" state={{ tab }}>{t('auth.forgotLink')}</Link></p>
        <SocialButtons mode="login" onToken={onSocial} disabled={isSubmitting || socialBusy} />
        <p className="text-xs text-ink/60">{t('auth.socialPasswordNote')}</p>
      </form>
      <p className="mt-4 text-center text-sm text-ink/70">
        {t('auth.newHere')} <Link className="font-semibold text-forest" to="/register" state={{ ...location.state, tab }}>{t('auth.createAccount')}</Link>
      </p>
    </div>
  );
}
