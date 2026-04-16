import { describe, it, expect } from 'vitest';
import { collectAssetRefs, diffAssets } from '../build/steps/scan-assets.mjs';

describe('collectAssetRefs', () => {
  it('collects bg, sprite, and comic refs from a script', () => {
    const script = {
      EP01: {
        id: 'EP01',
        screens: [
          { type: 'story_intro', content: [] },
          { type: 'cold_open', image: 'assets/bg/ruins_2050.png' },
          {
            type: 'vn', bg: 'assets/bg/market_hall.png',
            partner: { sprite: 'assets/partners/kai.png', name: 'KAI' },
            dialogue: [
              { speaker: 'echo', emotion: 'happy', text: 'hi' },
              { speaker: 'partner', emotion: 'default', text: 'yo' },
              { speaker: 'narrator', text: '...' }
            ]
          },
          {
            type: 'choice', bg: 'assets/bg/market_hall.png', prompt: '?',
            options: [
              { id: 'A', text: 'a', score: 0, reaction: { speaker: 'partner', text: 'r' }, echo_emotion_after: 'concern' },
              { id: 'B', text: 'b', score: 8, reaction: { speaker: 'echo', text: 'r' }, echo_emotion_after: 'happy' }
            ]
          },
          { type: 'outro', image: 'assets/bg/market_hall.png', learned_feeling_display: 'Joy' }
        ]
      }
    };
    const characters = {
      echo: { sprite_dir: 'assets/echo', sprite_pattern: 'echo_{emotion}.png' },
      kai: { speaker_id: 'partner', sprite_dir: 'assets/partners', sprite_pattern: 'kai.png' }
    };

    const refs = collectAssetRefs(script, characters);
    expect(refs).toContain('assets/bg/ruins_2050.png');
    expect(refs).toContain('assets/bg/market_hall.png');
    expect(refs).toContain('assets/partners/kai.png');
    expect(refs).toContain('assets/echo/echo_happy.png');
    expect(refs).toContain('assets/echo/echo_concern.png');
    expect(refs).toContain('assets/echo/echo_blank.png');
  });
});

describe('diffAssets', () => {
  it('identifies missing assets', () => {
    const refs = ['assets/echo/echo_happy.png', 'assets/echo/echo_surprise.png'];
    const existingFiles = new Set(['assets/echo/echo_happy.png']);
    const { missing, existing } = diffAssets(refs, existingFiles);
    expect(existing).toContain('assets/echo/echo_happy.png');
    expect(missing).toHaveLength(1);
    expect(missing[0].output).toBe('assets/echo/echo_surprise.png');
  });
});
