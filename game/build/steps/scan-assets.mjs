// game/build/steps/scan-assets.mjs
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { GAME_ROOT } from '../lib/env.mjs';

export function collectAssetRefs(script, characters) {
  const refs = new Set();

  const speakerMap = {};
  for (const [key, char] of Object.entries(characters)) {
    speakerMap[char.speaker_id || key] = key;
  }

  for (const ep of Object.values(script)) {
    for (const screen of ep.screens) {
      if (screen.image) refs.add(screen.image);
      if (screen.bg) refs.add(screen.bg);
      if (screen.partner?.sprite) refs.add(screen.partner.sprite);

      const dialogueLines = screen.dialogue || [];
      for (const line of dialogueLines) {
        if (line.speaker === 'echo') {
          const emotion = line.emotion || 'blank';
          const echo = characters.echo;
          refs.add(`${echo.sprite_dir}/${echo.sprite_pattern.replace('{emotion}', emotion)}`);
        }
      }

      if (screen.options) {
        for (const opt of screen.options) {
          if (opt.echo_emotion_after) {
            const echo = characters.echo;
            refs.add(`${echo.sprite_dir}/${echo.sprite_pattern.replace('{emotion}', opt.echo_emotion_after)}`);
          }
        }
      }
    }
  }

  const echo = characters.echo;
  refs.add(`${echo.sprite_dir}/${echo.sprite_pattern.replace('{emotion}', 'blank')}`);

  return [...refs];
}

export function diffAssets(refs, existingFiles) {
  const missing = [];
  const existing = [];
  for (const ref of refs) {
    if (existingFiles.has(ref)) {
      existing.push(ref);
    } else {
      const type = ref.includes('/bg/') ? 'background' : 'sprite';
      missing.push({ type, output: ref });
    }
  }
  return { missing, existing };
}

export async function scanAssets(gameRoot) {
  const root = gameRoot || GAME_ROOT;
  const script = JSON.parse(readFileSync(resolve(root, 'data/script.zh.json'), 'utf8'));
  const characters = JSON.parse(readFileSync(resolve(root, 'data/characters.json'), 'utf8'));

  const refs = collectAssetRefs(script, characters);

  const existingFiles = new Set();
  for (const ref of refs) {
    if (existsSync(resolve(root, ref))) {
      existingFiles.add(ref);
    }
  }

  const result = diffAssets(refs, existingFiles);

  for (const item of result.missing) {
    if (item.type === 'sprite') {
      for (const [key, char] of Object.entries(characters)) {
        const pattern = char.sprite_pattern.replace('{emotion}', '(.+)');
        const regex = new RegExp(`${char.sprite_dir}/${pattern}`);
        const match = item.output.match(regex);
        if (match) {
          item.character = key;
          item.emotion = match[1];
          item.prompt_context = `${char.name} expression: ${match[1]}`;
          break;
        }
      }
    }
  }

  const cachePath = resolve(root, 'build/cache/asset-needs.json');
  mkdirSync(resolve(root, 'build/cache'), { recursive: true });
  writeFileSync(cachePath, JSON.stringify(result, null, 2));

  return result;
}
