import { useI18n } from '../../i18n/I18nProvider.jsx';

export default function AdminNotBuilt() {
  const { t } = useI18n();
  return <div className="card"><p className="text-ink/70">{t('admin.notBuilt')}</p></div>;
}
