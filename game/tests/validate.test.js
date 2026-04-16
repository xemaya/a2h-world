// game/tests/validate.test.js
import { describe, it, expect } from 'vitest';
import { validateEpisode } from '../build/steps/validate.mjs';

function makeEpisode(overrides = {}) {
  return {
    id: 'EP01', title: 'Test', learned_feeling: 'Joy', score_delta_hint: 8,
    screens: [
      { type: 'story_intro', content: ['line1'] },
      { type: 'cold_open', image: 'assets/bg/ruins_2050.png', narration: 'text' },
      { type: 'vn', bg: 'assets/bg/market_hall.png', partner: { sprite: 'assets/partners/kai.png', name: 'KAI' },
        dialogue: [{ speaker: 'echo', emotion: 'blank', text: 'hi' }] },
      { type: 'vn', bg: 'assets/bg/market_hall.png', partner: { sprite: 'assets/partners/kai.png', name: 'KAI' },
        dialogue: [{ speaker: 'partner', emotion: 'default', text: 'yo' }] },
      { type: 'choice', bg: 'assets/bg/market_hall.png', prompt: '?',
        options: [
          { id: 'A', text: 'a', score: 0, reaction: { speaker: 'partner', text: 'r' }, echo_emotion_after: 'blank' },
          { id: 'B', text: 'b', score: 8, reaction: { speaker: 'echo', text: 'r' }, echo_emotion_after: 'happy' }
        ] },
      { type: 'outro', image: 'assets/bg/market_hall.png', learned_feeling_display: 'Joy' }
    ],
    ...overrides
  };
}

describe('validateEpisode', () => {
  it('passes a valid episode', () => {
    const errors = validateEpisode(makeEpisode());
    expect(errors).toHaveLength(0);
  });

  it('fails if choice has wrong number of options', () => {
    const ep = makeEpisode();
    ep.screens[4].options = [{ id: 'A', text: 'a', score: 0, reaction: { speaker: 'partner', text: 'r' }, echo_emotion_after: 'blank' }];
    const errors = validateEpisode(ep);
    expect(errors.some(e => e.includes('2 options'))).toBe(true);
  });

  it('fails if outro missing learned_feeling_display', () => {
    const ep = makeEpisode();
    delete ep.screens[5].learned_feeling_display;
    const errors = validateEpisode(ep);
    expect(errors.some(e => e.includes('learned_feeling_display'))).toBe(true);
  });
});
