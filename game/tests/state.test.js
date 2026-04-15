import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/state.js';

const ep01 = {
  id: 'EP01',
  title: 'EP01',
  learned_feeling: '成就感',
  score_delta_hint: 8,
  screens: [
    { type: 'cold_open', image: 'c.png', narration: '...' },
    { type: 'vn', bg: 'b.png', partner: { sprite: 'p.png', name: 'K' }, dialogue: [{ speaker: 'partner', emotion: 'neutral', text: '1' }, { speaker: 'echo', emotion: 'blank', text: '2' }] },
    { type: 'vn', bg: 'b.png', partner: { sprite: 'p.png', name: 'K' }, dialogue: [{ speaker: 'partner', emotion: 'neutral', text: '3' }] },
    { type: 'choice', bg: 'b.png', prompt: '?',
      options: [
        { id: 'A', text: 'a', score: 0, reaction: { speaker: 'partner', text: 'ok' }, echo_emotion_after: 'blank' },
        { id: 'B', text: 'b', score: 8, reaction: { speaker: 'partner', text: 'ok' }, echo_emotion_after: 'happy' }
      ]
    },
    { type: 'outro', image: 'c.png', learned_feeling_display: '成就感' }
  ]
};

describe('state machine', () => {
  it('starts at EP01 screen 0 line 0', () => {
    const s = initialState({ 'EP01': ep01 }, 'EP01');
    expect(s.episodeId).toBe('EP01');
    expect(s.screenIdx).toBe(0);
    expect(s.lineIdx).toBe(0);
    expect(s.learningScore).toBe(0);
  });

  it('NEXT in cold_open advances to vn screen 1 line 0', () => {
    const s = reduce(initialState({ 'EP01': ep01 }, 'EP01'), { type: 'NEXT' });
    expect(s.screenIdx).toBe(1);
    expect(s.lineIdx).toBe(0);
  });

  it('NEXT inside vn dialogue advances line, not screen', () => {
    let s = reduce(initialState({ 'EP01': ep01 }, 'EP01'), { type: 'NEXT' });
    s = reduce(s, { type: 'NEXT' });
    expect(s.screenIdx).toBe(1);
    expect(s.lineIdx).toBe(1);
  });

  it('NEXT at last dialogue line advances to next screen', () => {
    let s = reduce(initialState({ 'EP01': ep01 }, 'EP01'), { type: 'NEXT' });
    s = reduce(s, { type: 'NEXT' });
    s = reduce(s, { type: 'NEXT' });
    expect(s.screenIdx).toBe(2);
    expect(s.lineIdx).toBe(0);
  });

  it('CHOOSE adds score and records choice', () => {
    let s = initialState({ 'EP01': ep01 }, 'EP01');
    s = { ...s, screenIdx: 3, lineIdx: 0 };
    s = reduce(s, { type: 'CHOOSE', optionId: 'B' });
    expect(s.learningScore).toBe(8);
    expect(s.choices).toEqual({ EP01: 'B' });
    expect(s.screenIdx).toBe(3);
    expect(s.lineIdx).toBe(1);
  });

  it('CHOOSE with id A adds 0', () => {
    let s = initialState({ 'EP01': ep01 }, 'EP01');
    s = { ...s, screenIdx: 3 };
    s = reduce(s, { type: 'CHOOSE', optionId: 'A' });
    expect(s.learningScore).toBe(0);
    expect(s.choices.EP01).toBe('A');
  });

  it('NEXT after choice reaction advances to outro', () => {
    let s = initialState({ 'EP01': ep01 }, 'EP01');
    s = { ...s, screenIdx: 3 };
    s = reduce(s, { type: 'CHOOSE', optionId: 'B' });
    s = reduce(s, { type: 'NEXT' });
    expect(s.screenIdx).toBe(4);
    expect(s.lineIdx).toBe(0);
  });

  it('SET_LANG updates lang', () => {
    const s = reduce(initialState({ 'EP01': ep01 }, 'EP01'), { type: 'SET_LANG', lang: 'en' });
    expect(s.lang).toBe('en');
  });

  it('RESTART resets screen/line/score/choices, preserves lang', () => {
    let s = initialState({ 'EP01': ep01 }, 'EP01');
    s = { ...s, screenIdx: 4, lineIdx: 0, learningScore: 8, choices: { EP01: 'B' }, chosenOption: 'B', lang: 'en' };
    const after = reduce(s, { type: 'RESTART' });
    expect(after.screenIdx).toBe(0);
    expect(after.lineIdx).toBe(0);
    expect(after.learningScore).toBe(0);
    expect(after.choices).toEqual({});
    expect(after.chosenOption).toBeUndefined();
    expect(after.lang).toBe('en');
  });

  it('NEXT on outro restarts the episode (single-episode demo)', () => {
    let s = initialState({ 'EP01': ep01 }, 'EP01');
    s = { ...s, screenIdx: 4, learningScore: 8, choices: { EP01: 'B' } };
    const after = reduce(s, { type: 'NEXT' });
    expect(after.screenIdx).toBe(0);
    expect(after.learningScore).toBe(0);
    expect(after.choices).toEqual({});
  });
});
