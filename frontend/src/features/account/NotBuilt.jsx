import { useI18n } from '../../i18n/I18nProvider.jsx';
import Shell from './AccountShell.jsx';

// Honest stand-ins: these modules have no backend yet, so nothing is saved or invented.
export default function NotBuilt({ titleKey, children }) {
  const { t } = useI18n();
  return (
    <Shell title={t(titleKey)}>
      <div className="card">
        <p className="font-semibold">{t('account.notBuiltTitle')}</p>
        <p className="mt-1 text-sm text-ink/70">{t('account.notBuilt')}</p>
        {children}
      </div>
    </Shell>
  );
}
