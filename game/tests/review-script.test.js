import { describe, it, expect } from 'vitest';
import { reviewEpisode } from '../build/review-script.mjs';

const lockedTerms = {
  locked_identical_both_langs: ['A2H Market', 'ECHO', 'a2hmarket.ai'],
  locked_pairs: { '互补': 'complementary', '进化': 'evolution' },
  forbidden_phrases_zh: ['让我们一起', '赋能'],
  forbidden_phrases_en: ["Let's together", 'empower'],
  echo_mandatory_phrases_zh: ['✓'],
  echo_mandatory_phrases_en: ['✓']
};

function screen(type, overrides = {}) {
  const defaults = {
    cold_open: { type: 'cold_open', image: '', narration: 'x' },
    vn: { type: 'vn', bg: '', partner: { sprite: '', name: 'X' },
          dialogue: [{ speaker: 'echo', emotion: 'blank', text: '✓ 已记录。' }] },
    choice: { type: 'choice', bg: '', prompt: 'x',
              options: [
                { id: 'A', text: 'a', score: 0, reaction: { speaker: 'partner', text: 'ok' }, echo_emotion_after: 'blank' },
                { id: 'B', text: 'b', score: 8, reaction: { speaker: 'partner', text: 'ok' }, echo_emotion_after: 'happy' }]
            },
    outro: { type: 'outro', image: '', learned_feeling_display: '成就感' }
  };
  return { ...defaults[type], ...overrides };
}

function makeEp(overrides = {}) {
  return {
    id: 'EP01',
    title: '第一笔交易',
    learned_feeling: '成就感',
    score_delta_hint: 8,
    screens: [
      screen('cold_open'),
      screen('vn'),
      screen('vn'),
      screen('choice'),
      screen('outro')
    ],
    ...overrides
  };
}

describe('reviewEpisode', () => {
  it('passes a minimal valid episode', () => {
    const { passed, violations } = reviewEpisode(makeEp(), { lang: 'zh', lockedTerms });
    expect(passed).toBe(true);
    expect(violations).toEqual([]);
  });

  it('flags AI-slop forbidden phrase', () => {
    const ep = makeEp();
    ep.screens[1].dialogue[0].text = '让我们一起完成这个任务';
    const { passed, violations } = reviewEpisode(ep, { lang: 'zh', lockedTerms });
    expect(passed).toBe(false);
    expect(violations.find(v => v.rule === 'forbidden_phrase')).toBeDefined();
  });

  it('flags ECHO line missing mandatory phrase in a long dialogue', () => {
    const ep = makeEp();
    ep.screens[1].dialogue = Array.from({ length: 5 }, () =>
      ({ speaker: 'echo', emotion: 'blank', text: '这是普通句子。' }));
    const { passed, violations } = reviewEpisode(ep, { lang: 'zh', lockedTerms });
    expect(passed).toBe(false);
    expect(violations.find(v => v.rule === 'echo_voice')).toBeDefined();
  });

  it('flags reaction that judges the choice (rule B.4)', () => {
    const ep = makeEp();
    ep.screens[3].options[0].reaction.text = '你说得对！';
    const { passed, violations } = reviewEpisode(ep, { lang: 'zh', lockedTerms });
    expect(passed).toBe(false);
    expect(violations.find(v => v.rule === 'ambiguous_choice')).toBeDefined();
  });

  it('flags dialogue explicitly stating the lesson (rule C.5)', () => {
    const ep = makeEp();
    ep.screens[1].dialogue[0] = { speaker: 'partner', emotion: 'neutral', text: '你学会了信任。' };
    const { passed, violations } = reviewEpisode(ep, { lang: 'zh', lockedTerms });
    expect(passed).toBe(false);
    expect(violations.find(v => v.rule === 'feeling_spelled_out')).toBeDefined();
  });

  it('flags screen 2-3 dialogue exceeding 250 char budget', () => {
    const ep = makeEp();
    const longText = '这是一段很长的对话'.repeat(40);
    ep.screens[1].dialogue = [{ speaker: 'partner', emotion: 'neutral', text: longText }];
    const { passed, violations } = reviewEpisode(ep, { lang: 'zh', lockedTerms });
    expect(passed).toBe(false);
    expect(violations.find(v => v.rule === 'word_budget')).toBeDefined();
  });

  it('flags missing locked brand word across whole episode', () => {
    const ep = makeEp();
    const { passed, violations } = reviewEpisode(ep, {
      lang: 'zh', lockedTerms,
      requireLockedTermsAtLeastOnce: ['A2H Market']
    });
    expect(passed).toBe(false);
    expect(violations.find(v => v.rule === 'locked_term_missing')).toBeDefined();
  });
});
