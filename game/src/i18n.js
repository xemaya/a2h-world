export function createI18n(resources, initialLang = 'zh') {
  let lang = initialLang;
  return {
    t(key) { return resources[lang]?.[key] ?? key; },
    setLang(l) { lang = l; },
    getLang() { return lang; }
  };
}
