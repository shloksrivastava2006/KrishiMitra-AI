import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import NotBuilt from './NotBuilt.jsx';

export default function MyCalculationsPage() {
  const { t } = useI18n();
  return (
    <NotBuilt titleKey="nav.myCalculations">
      <p className="mt-3 text-sm text-ink/70">{t('account.calcNote')}</p>
      <Link to="/calculators/seed-calculator" className="btn-outline mt-4">{t('account.openSeedCalc')}</Link>
    </NotBuilt>
  );
}
