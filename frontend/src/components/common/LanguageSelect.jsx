import { Globe } from 'lucide-react';
import { LANGUAGES, useI18n } from '../../i18n/I18nProvider.jsx';
import { GOOGLE_LANGS } from '../../i18n/googleTranslate.js';

// One menu for every language. English and Hindi are hand-written; the rest translate the whole page with Google Translate.
// translate="no": the language names must stay in their own script when the page is translated.
export default function LanguageSelect({ className = '' }) {
  const { displayLang, chooseLanguage, t } = useI18n();
  return (
    <label translate="no" className={`inline-flex items-center gap-1.5 text-sm text-ink/70 ${className}`}>
      <Globe className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{t('nav.language')}</span>
      <select value={displayLang} onChange={(e) => chooseLanguage(e.target.value)} className="max-w-[9.5rem] rounded-md border border-earth/30 bg-white px-2 py-1 text-sm font-medium text-ink">
        {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        <optgroup label={t('nav.moreLanguages')}>
          {GOOGLE_LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </optgroup>
      </select>
    </label>
  );
}
