import { Languages } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';

// Shown while Google is translating the page: says what is happening, and gives a one-click way back.
export default function TranslationNotice() {
  const { t, translateTo, translateFailed, chooseLanguage } = useI18n();
  if (!translateTo && !translateFailed) return null;
  return (
    <div role="status" className="no-print border-b border-gold/30 bg-gold-light/70 px-4 py-2 text-xs text-ink/80">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1">
        <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="flex-1">{translateFailed ? t(translateFailed === 'hi' ? 'nav.translateFailedHi' : 'nav.translateFailed') : t('nav.translateNote')}</p>
        {translateTo && <button type="button" className="font-semibold text-forest underline" onClick={() => chooseLanguage('en')}>{t('nav.showOriginal')}</button>}
      </div>
    </div>
  );
}
