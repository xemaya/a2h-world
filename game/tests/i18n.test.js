import { describe, it, expect } from 'vitest';
import { createI18n } from '../src/i18n.js';

describe('i18n', () => {
  const resources = {
    zh: { hello: '你好', goodbye: '再见' },
    en: { hello: 'Hello', goodbye: 'Bye' }
  };

  it('resolves current-lang key', () => {
    const i = createI18n(resources, 'zh');
    expect(i.t('hello')).toBe('你好');
  });

  it('switches lang', () => {
    const i = createI18n(resources, 'zh');
    i.setLang('en');
    expect(i.t('hello')).toBe('Hello');
  });

  it('returns key on missing translation', () => {
    const i = createI18n(resources, 'zh');
    expect(i.t('missing')).toBe('missing');
  });
});
