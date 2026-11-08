import en from './en.js';
import sv from './sv.js';
import common from './common.js';
export const SUPPORTED_LANGUAGES = ['sv', 'en'];
export const detectLanguage = navigator => /^sv/i.test(navigator?.language ?? '') ? 'sv' : 'en';
export const resolveLanguage = (saved, navigator) => SUPPORTED_LANGUAGES.includes(saved) ? saved : detectLanguage(navigator);
export function createI18n({
  language = 'en',
  dictionaries = {
    en,
    sv
  },
  warn = console.warn
} = {}) {
  let current = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';

  function t(key, params = {}) {
    let text = common[key] ?? dictionaries[current]?.[key];
    if (text == null) {
      warn(`Missing translation: ${current}:${key}`);
      text = dictionaries.en?.[key] ?? key;
    }
    return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) => Object.hasOwn(params, name) ? String(params[name]) : match);
  }
  return {
    t,
    getLanguage: () => current,
    setLanguage(lang) {
      if (SUPPORTED_LANGUAGES.includes(lang)) current = lang;
    },
    applyToDom(root) {
      for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
    }
  };
}
