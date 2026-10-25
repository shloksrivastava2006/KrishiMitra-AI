// Whole-site translation into other Indian languages with Google Website Translator.
//
// English and Hindi are written by hand (i18n/en.js, hi.js). Everything else is machine translated in the browser by Google,
// which also covers text that is written directly in pages instead of the dictionaries. Trade-offs, all shown to the user:
// the page text is sent to Google, translations can be wrong, and the script only loads after someone picks such a language.
//
// This file must stay importable in Node (the tests do): nothing here touches window or document until a function is called.

export const BUILT_IN = ['en', 'hi'];

// code = Google's language code, label = the language's own name (so people can find it without reading English).
export const GOOGLE_LANGS = [
  { code: 'bn', label: 'বাংলা' }, { code: 'ta', label: 'தமிழ்' }, { code: 'te', label: 'తెలుగు' }, { code: 'mr', label: 'मराठी' },
  { code: 'gu', label: 'ગુજરાતી' }, { code: 'kn', label: 'ಕನ್ನಡ' }, { code: 'ml', label: 'മലയാളം' }, { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'or', label: 'ଓଡ଼ିଆ' }, { code: 'as', label: 'অসমীয়া' }, { code: 'ur', label: 'اردو' }, { code: 'ne', label: 'नेपाली' },
  { code: 'sd', label: 'سنڌي' }, { code: 'sa', label: 'संस्कृतम्' },
  // Added to Google Translate in 2024. Check each one in the website widget and delete any that does not translate.
  { code: 'bho', label: 'भोजपुरी' }, { code: 'mai', label: 'मैथिली' }, { code: 'doi', label: 'डोगरी' }, { code: 'gom', label: 'कोंकणी' },
  { code: 'mni-Mtei', label: 'Meiteilon (Manipuri)' }, { code: 'lus', label: 'Mizo' },
];

// Hindi is both hand-written (dictionary) and a Google target, because the dictionaries only cover part of the site:
// text written directly in pages (My Crops, calculators, dashboard ...) would otherwise stay English.
//   'hybrid'      : hand-written Hindi underneath, Google fills in the English that is left. Falls back to the dictionary
//                   (partial Hindi) if Google cannot load. Recommended.
//   'google-only' : Hindi works exactly like Tamil: English underneath, Google translates everything.
//                   Use this if Google changes the hand-written Hindi in a way you do not like.
//   'dictionary'  : no Google for Hindi (the old behaviour, partial Hindi).
export const HINDI_MODE = 'hybrid';
const CODES = new Set(['hi', ...GOOGLE_LANGS.map((l) => l.code)]);
export const isGoogleLang = (code) => typeof code === 'string' && CODES.has(code);
// Does picking this language start a Google page translation?
export const usesGoogle = (code, mode = HINDI_MODE) => isGoogleLang(code) && !(code === 'hi' && mode === 'dictionary');
// Which dictionary the app's own text comes from while a page translation is active. Google's source language is English.
export function dictionaryLangFor(translateTo, builtIn, mode = HINDI_MODE) {
  if (!translateTo) return builtIn;
  return translateTo === 'hi' && mode === 'hybrid' ? 'hi' : 'en';
}
export const includedLanguages = () => [...CODES].join(',');
export const googtransValue = (code) => `/en/${code}`;

// Google remembers the chosen language in the "googtrans" cookie, e.g. /en/ta. Only codes from our own list are accepted,
// so a hand-edited cookie cannot make the page load anything else.
export function readGoogtrans(cookieString = '') {
  const m = /(?:^|;\s*)googtrans=([^;]*)/.exec(cookieString);
  if (!m) return '';
  let value = m[1];
  try { value = decodeURIComponent(value); } catch { return ''; }
  const code = /^\/(?:en|auto)\/([A-Za-z-]{2,10})$/.exec(value)?.[1];
  return isGoogleLang(code) ? code : '';
}

export function setGoogtrans(code) {
  if (!isGoogleLang(code)) return;
  document.cookie = `googtrans=${googtransValue(code)}; path=/; max-age=31536000; SameSite=Lax`;
}

// Google may have written the cookie for the bare host or for ".host", so remove both or the page stays translated.
export function clearGoogtrans() {
  const past = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  document.cookie = past;
  const host = window.location.hostname;
  if (host.includes('.')) { document.cookie = `${past}; domain=${host}`; document.cookie = `${past}; domain=.${host}`; }
}

// Google Translate rewrites text nodes, and React then fails with "removeChild / insertBefore ... not a child of this node".
// This widely used workaround makes those two calls ignore nodes that Google has already moved. Installed only when needed.
let guarded = false;
export function installTranslateGuard() {
  if (guarded || typeof Node === 'undefined') return;
  guarded = true;
  const { removeChild, insertBefore } = Node.prototype;
  Node.prototype.removeChild = function guardedRemoveChild(child) {
    if (child && child.parentNode !== this) return child;
    return removeChild.call(this, child);
  };
  Node.prototype.insertBefore = function guardedInsertBefore(node, ref) {
    if (ref && ref.parentNode !== this) return node;
    return insertBefore.call(this, node, ref);
  };
}

let loading = null;
// Loads Google's script once. Needs an element with id "google_translate_element" on the page (I18nProvider renders it).
export function loadGoogleTranslate() {
  if (typeof document === 'undefined') return Promise.resolve();
  if (loading) return loading;
  installTranslateGuard();
  loading = new Promise((resolve, reject) => {
    window.googleTranslateElementInit = () => {
      try {
        // eslint-disable-next-line no-new
        new window.google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: includedLanguages(), autoDisplay: false }, 'google_translate_element');
        resolve();
      } catch (err) { loading = null; reject(err); }
    };
    const script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.onerror = () => { loading = null; reject(new Error('The translator script could not load')); };
    document.head.appendChild(script);
  });
  return loading;
}
