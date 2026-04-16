// game/build/steps/gen-assets.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv, requireKey, GAME_ROOT } from '../lib/env.mjs';
import { geminiImage } from '../lib/gemini.mjs';

const IMAGE_MODEL = 'gemini-3.1-flash-image-preview';
const COMMON_STYLE = 'flat 2D comic illustration, NOT 3D, NOT rounded cartoon, cyberpunk aesthetic, halftone dot texture overlay, thick black outlines, flat cel shading';
const BG_TRANSPARENT = 'CRITICAL: COMPLETELY TRANSPARENT BACKGROUND, PNG with alpha channel, NO checkerboard pattern, NO solid background color';

function buildSpritePrompt(character, emotion, characters) {
  const char = characters[character];
  return `${char.character_lock}. Expression: ${emotion}. ${char.style || COMMON_STYLE}. Half-body portrait facing forward. ${BG_TRANSPARENT}`;
}

function buildBgPrompt(promptContext) {
  return `${promptContext}. ${COMMON_STYLE}, palette: #05050f dark background, #00ffcc cyan neon accents, #895AFF purple highlights. Wide scene, 16:9 aspect ratio, NO transparency, detailed cyberpunk environment.`;
}

export async function genAssets(gameRoot, { only = null } = {}) {
  const root = gameRoot || GAME_ROOT;
  loadEnv();
  const key = requireKey('GEMINI_API_KEY');

  const needsPath = resolve(root, 'build/cache/asset-needs.json');
  const needs = JSON.parse(readFileSync(needsPath, 'utf8'));
  const characters = JSON.parse(readFileSync(resolve(root, 'data/characters.json'), 'utf8'));

  let items = needs.missing;
  if (only) {
    const filter = only.split(',');
    items = items.filter(m => filter.some(f => m.output.includes(f)));
  }

  if (items.length === 0) {
    console.log('  No assets to generate.');
    return { succeeded: 0, failed: 0, failures: [] };
  }

  const results = { succeeded: 0, failed: 0, failures: [] };

  for (const item of items) {
    const outputPath = resolve(root, item.output);
    let prompt;

    if (item.type === 'sprite' && item.character) {
      prompt = buildSpritePrompt(item.character, item.emotion, characters);
      console.log(`  Generating sprite: ${item.character}/${item.emotion}...`);
    } else if (item.type === 'background') {
      prompt = buildBgPrompt(item.prompt_context || item.output);
      console.log(`  Generating background: ${item.output}...`);
    } else {
      console.log(`  ⚠ Skipping unknown type: ${item.type} (${item.output})`);
      continue;
    }

    const result = await geminiImage(IMAGE_MODEL, prompt, outputPath, key);

    if (result.success) {
      console.log(`  ✓ ${item.output}`);
      results.succeeded++;

      if (item.type === 'sprite' && item.character && item.emotion) {
        const char = characters[item.character];
        if (char && !char.emotions.includes(item.emotion)) {
          char.emotions.push(item.emotion);
          writeFileSync(resolve(root, 'data/characters.json'), JSON.stringify(characters, null, 2));
        }
      }
    } else {
      console.log(`  ✗ ${item.output}: ${result.error}`);
      results.failed++;
      results.failures.push({ path: item.output, error: result.error });
    }
  }

  return results;
}
