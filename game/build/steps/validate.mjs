// game/build/steps/validate.mjs
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { GAME_ROOT } from '../lib/env.mjs';
import { collectAssetRefs } from './scan-assets.mjs';

export function validateEpisode(ep) {
  const errors = [];

  if (!ep.id) errors.push('Missing episode id');
  if (!ep.screens || !Array.isArray(ep.screens)) {
    errors.push('Missing or invalid screens array');
    return errors;
  }

  for (let i = 0; i < ep.screens.length; i++) {
    const s = ep.screens[i];
    const label = `Screen ${i} (${s.type})`;

    if (!s.type) {
      errors.push(`${label}: missing type`);
      continue;
    }

    if (s.type === 'choice') {
      if (!s.options || s.options.length !== 2) {
        errors.push(`${label}: choice must have exactly 2 options, got ${s.options?.length || 0}`);
      } else {
        for (const opt of s.options) {
          if (!opt.reaction) errors.push(`${label}: option ${opt.id} missing reaction`);
        }
      }
    }

    if (s.type === 'outro') {
      if (!s.learned_feeling_display) {
        errors.push(`${label}: missing learned_feeling_display`);
      }
    }

    if (s.type === 'vn') {
      if (!s.dialogue || s.dialogue.length === 0) {
        errors.push(`${label}: vn screen has no dialogue`);
      }
    }
  }

  return errors;
}

export function validateConsistency(scriptZh, scriptEn) {
  const errors = [];
  const zhIds = Object.keys(scriptZh);
  const enIds = Object.keys(scriptEn);

  if (zhIds.length !== enIds.length) {
    errors.push(`Episode count mismatch: zh=${zhIds.length}, en=${enIds.length}`);
  }

  for (const id of zhIds) {
    if (!scriptEn[id]) {
      errors.push(`Episode ${id} exists in zh but not en`);
      continue;
    }
    const zhScreens = scriptZh[id].screens;
    const enScreens = scriptEn[id].screens;
    if (zhScreens.length !== enScreens.length) {
      errors.push(`${id}: screen count mismatch zh=${zhScreens.length} en=${enScreens.length}`);
      continue;
    }
    for (let i = 0; i < zhScreens.length; i++) {
      const zhD = zhScreens[i].dialogue?.length || 0;
      const enD = enScreens[i].dialogue?.length || 0;
      if (zhD !== enD) {
        errors.push(`${id} screen ${i}: dialogue count mismatch zh=${zhD} en=${enD}`);
      }
    }
  }
  return errors;
}

export function validateAssetFiles(scriptZh, characters, gameRoot) {
  const root = gameRoot || GAME_ROOT;
  const refs = collectAssetRefs(scriptZh, characters);
  const errors = [];
  for (const ref of refs) {
    if (!existsSync(resolve(root, ref))) {
      errors.push(`Missing asset file: ${ref}`);
    }
  }
  return errors;
}

export async function validate(gameRoot) {
  const root = gameRoot || GAME_ROOT;
  const scriptZh = JSON.parse(readFileSync(resolve(root, 'data/script.zh.json'), 'utf8'));
  const scriptEn = JSON.parse(readFileSync(resolve(root, 'data/script.en.json'), 'utf8'));
  const characters = JSON.parse(readFileSync(resolve(root, 'data/characters.json'), 'utf8'));

  const errors = [];

  for (const ep of Object.values(scriptZh)) {
    errors.push(...validateEpisode(ep).map(e => `[${ep.id}] ${e}`));
  }
  for (const ep of Object.values(scriptEn)) {
    errors.push(...validateEpisode(ep).map(e => `[${ep.id}/en] ${e}`));
  }

  errors.push(...validateConsistency(scriptZh, scriptEn));
  errors.push(...validateAssetFiles(scriptZh, characters, root));

  return errors;
}

// CLI entry
if (process.argv[1] && process.argv[1].includes('validate.mjs')) {
  validate().then(errors => {
    if (errors.length === 0) {
      console.log('✅ Validation passed');
    } else {
      console.error('❌ Validation failed:');
      for (const e of errors) console.error(`  - ${e}`);
      process.exit(1);
    }
  });
}
