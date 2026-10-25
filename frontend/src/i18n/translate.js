import en from './en.js';
import hi from './hi.js';

export const dictionaries = { en, hi };
const lookup = (dict, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), dict);

// Falls back to English, then to the key itself, so a missing string never renders blank.
export const translate = (lang, path, vars) => {
  const raw = lookup(dictionaries[lang], path) ?? lookup(en, path) ?? path;
  return vars ? raw.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '') : raw;
};
