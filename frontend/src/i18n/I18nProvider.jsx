import { dictionaries, translate } from './translate.js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { clearGoogtrans, dictionaryLangFor, loadGoogleTranslate, readGoogtrans, setGoogtrans, usesGoogle } from './googleTranslate.js';

// Small i18next-style layer: t('group.key', { name }). The project had no i18next installed,
// so this keeps the same call shape and can be swapped for i18next later without touching call sites.
//
// Two kinds of language:
//  - hand-written dictionaries (English, Hindi): instant, offline, and the Hindi choice is saved on the user's profile.
//  - Google Website Translator translates the whole page for every other Indian language, and also finishes Hindi
//    (text written directly in pages is not in the dictionaries). See googleTranslate.js. That choice lives only in
//    this browser (the "googtrans" cookie).
export { translate };
export const LANGUAGES = [{ code: 'en', label: 'English' }, { code: 'hi', label: 'हिन्दी' }];

const KEY = 'krishimitra_lang';

const I18nContext = createContext(null);

const initialLang = () => {
  try { const saved = localStorage.getItem(KEY); if (dictionaries[saved]) return saved; } catch { /* storage blocked */ }
  return 'en';
};
const initialTranslateTo = () => (typeof document === 'undefined' ? '' : readGoogtrans(document.cookie));
const remember = (code) => { try { localStorage.setItem(KEY, code); } catch { /* ignore */ } };

export function I18nProvider({ children }) {
  const [builtIn, setBuiltIn] = useState(initialLang);
  const [translateTo, setTranslateTo] = useState(initialTranslateTo);
  const [translateFailed, setTranslateFailed] = useState('');   // the language that could not load, or ''
  // While Google translates the page, the text underneath must be English (its source language),
  // except for Hindi, where the hand-written dictionary stays underneath and Google only finishes the rest.
  const lang = dictionaryLangFor(translateTo, builtIn);

  // Language lives under its own key, so logout (which clears only the token) never resets it.
  // Hindi is only complete with Google's help (see HINDI_MODE). Google's script has not loaded on this page yet, so
  // starting it needs no reload: set the cookie, then the effect below loads the script, which reads it.
  const startHindi = useCallback(() => { setGoogtrans('hi'); setTranslateTo('hi'); }, []);
  const setLang = useCallback((code) => {
    if (!dictionaries[code]) return;
    setBuiltIn(code); remember(code);
    if (code === 'hi' && usesGoogle('hi') && !translateTo) startHindi();
  }, [translateTo, startHindi]);

  // Someone who already chose Hindi earlier gets the complete page too. Tried once per page load, so a blocked
  // translator cannot cause a loop.
  const triedHindi = useRef(false);
  useEffect(() => {
    if (triedHindi.current) return;
    triedHindi.current = true;
    if (builtIn === 'hi' && !translateTo && usesGoogle('hi')) startHindi();
  }, [builtIn, translateTo, startHindi]);

  // One call for the language menu. Starting or undoing a page translation needs a reload: Google rewrites the page
  // and cannot cleanly put it back.
  const chooseLanguage = useCallback((code) => {
    setTranslateFailed('');
    if (usesGoogle(code)) {
      if (code === translateTo) return;
      remember(dictionaryLangFor(code, 'en'));
      setGoogtrans(code);
      window.location.reload();
      return;
    }
    if (!dictionaries[code]) return;
    remember(code);
    if (translateTo) { clearGoogtrans(); window.location.reload(); return; }
    setBuiltIn(code);
  }, [translateTo]);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    if (!translateTo) return;
    loadGoogleTranslate().catch(() => { clearGoogtrans(); setTranslateTo(''); setTranslateFailed(translateTo); });
  }, [translateTo]);

  const t = useCallback((path, vars) => translate(lang, path, vars), [lang]);
  const value = useMemo(() => ({ lang, setLang, t, translateTo, displayLang: translateTo || lang, chooseLanguage, translateFailed }),
    [lang, setLang, t, translateTo, chooseLanguage, translateFailed]);
  return (
    <I18nContext.Provider value={value}>
      {children}
      {/* Google puts its (hidden) translator here. React never renders anything inside it. */}
      <div id="google_translate_element" translate="no" aria-hidden="true" style={{ display: 'none' }} />
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
