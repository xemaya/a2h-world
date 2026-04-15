import { describe, it, expect } from 'vitest';
import { EpisodeSchema } from '../src/schema.js';

describe('EpisodeSchema', () => {
  const valid = {
    id: 'EP01',
    title: '第一笔交易',
    learned_feeling: '成就感',
    score_delta_hint: 8,
    screens: [
      { type: 'cold_open', image: 'comics/ep01.png', narration: '2050 年。' },
      { type: 'vn', bg: 'bg/market.png',
        partner: { sprite: 'partners/kai.png', name: 'KAI' },
        dialogue: [{ speaker: 'partner', emotion: 'neutral', text: '嗨。' }]
      },
      { type: 'vn', bg: 'bg/market.png',
        partner: { sprite: 'partners/kai.png', name: 'KAI' },
        dialogue: [{ speaker: 'echo', emotion: 'blank', text: '✓ 已记录。' }]
      },
      { type: 'choice', bg: 'bg/market.png',
        prompt: '怎么办？',
        options: [
          { id: 'A', text: '逻辑回应', score: 0,
            reaction: { speaker: 'partner', text: '嗯。' }, echo_emotion_after: 'blank' },
          { id: 'B', text: '情感回应', score: 8,
            reaction: { speaker: 'partner', text: '哦。' }, echo_emotion_after: 'happy' }
        ]
      },
      { type: 'outro', image: 'comics/ep01.png', learned_feeling_display: '成就感' }
    ]
  };

  it('accepts a valid episode', () => {
    expect(() => EpisodeSchema.parse(valid)).not.toThrow();
  });

  it('rejects episode without all 5 screen types in order', () => {
    const bad = { ...valid, screens: valid.screens.slice(0, 3) };
    expect(() => EpisodeSchema.parse(bad)).toThrow();
  });

  it('rejects choice with score outside {0, 8}', () => {
    const bad = structuredClone(valid);
    bad.screens[3].options[0].score = 4;
    expect(() => EpisodeSchema.parse(bad)).toThrow();
  });

  it('rejects echo_emotion not in {happy, blank, concern}', () => {
    const bad = structuredClone(valid);
    bad.screens[3].options[0].echo_emotion_after = 'angry';
    expect(() => EpisodeSchema.parse(bad)).toThrow();
  });

  it('requires exactly 2 options in choice screen', () => {
    const bad = structuredClone(valid);
    bad.screens[3].options = [bad.screens[3].options[0]];
    expect(() => EpisodeSchema.parse(bad)).toThrow();
  });
});
