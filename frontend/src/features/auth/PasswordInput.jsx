import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';

// Password field with a show/hide toggle. Works with react-hook-form's register().
const PasswordInput = forwardRef(function PasswordInput({ id, autoComplete, ...rest }, ref) {
  const [shown, setShown] = useState(false);
  const { t } = useI18n();
  return (
    <div className="relative">
      <input id={id} ref={ref} type={shown ? 'text' : 'password'} autoComplete={autoComplete} className="input pr-10" {...rest} />
      <button type="button" onClick={() => setShown(!shown)} aria-pressed={shown}
        aria-label={shown ? t('auth.hidePassword') : t('auth.showPassword')}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink/60 hover:text-forest">
        {shown ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
});
export default PasswordInput;
