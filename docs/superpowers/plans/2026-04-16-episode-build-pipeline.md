# Episode Build Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One command (`npm run build:episode -- --outline=build/briefs/ep02-brief.md`) builds a playable episode from a markdown outline.

**Architecture:** A single orchestrator (`build-episode.mjs`) runs 4 sequential steps: gen-script (LLM generates script JSON from outline), scan-assets (finds missing sprites/backgrounds), gen-assets (generates missing assets via Gemini image API), validate (checks completeness). Each step reads/writes to well-defined intermediate files. The existing game engine gets one change: dynamic sprite resolution from `characters.json` instead of hardcoded paths.

**Tech Stack:** Node.js ESM, Gemini API (text model for scripts, image model for assets), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-16-episode-build-pipeline-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `game/data/characters.json` | Create | Character registry: names, sprite patterns, emotions, visual prompts |
| `game/build/steps/gen-script.mjs` | Create | Step 1: outline → zh/en script JSON via Gemini text API |
| `game/build/steps/scan-assets.mjs` | Create | Step 2: scan scripts, output missing asset list |
| `game/build/steps/gen-assets.mjs` | Create | Step 3: generate missing sprites/backgrounds via Gemini image API |
| `game/build/steps/validate.mjs` | Create | Step 4: full integrity check |
| `game/build/build-episode.mjs` | Create | Orchestrator: runs steps 1-4, checkpointing, CLI |
| `game/build/lib/gemini.mjs` | Create | Shared Gemini API helpers (text + image) |
| `game/build/lib/env.mjs` | Create | Shared .env loader |
| `game/src/ui/screens.js` | Modify | Dynamic sprite resolution from characters.json |
| `game/src/main.js` | Modify | Load characters.json at boot, pass to screens |
| `game/package.json` | Modify | Add `build:episode` and `validate` scripts |
| `game/tests/scan-assets.test.js` | Create | Tests for scan-assets |
| `game/tests/validate.test.js` | Create | Tests for validate |

---

### Task 1: Create shared utilities (env loader + Gemini API helpers)

**Files:**
- Create: `game/build/lib/env.mjs`
- Create: `game/build/lib/gemini.mjs`

- [ ] **Step 1: Create env.mjs — shared .env loader**

```javascript
// game/build/lib/env.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GAME_ROOT = resolve(__dirname, '../..');

export function loadEnv() {
  try {
    const env = readFileSync(resolve(GAME_ROOT, '.env'), 'utf8');
    for (const line of env.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
}

export function requireKey(name) {
  if (!process.env[name]) {
    console.error(`ERROR: ${name} not set. Add it to game/.env`);
    process.exit(1);
  }
  return process.env[name];
}

export { GAME_ROOT };
```

- [ ] **Step 2: Create gemini.mjs — text and image API helpers**

```javascript
// game/build/lib/gemini.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function geminiText(model, systemPrompt, userPrompt, key, { temperature = 0.7 } = {}) {
  const url = `${BASE_URL}/${model}:generateContent?key=${key}`;
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: { temperature }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Gemini text API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text in Gemini response');
  return text;
}

export async function geminiImage(model, prompt, outputPath, key, { maxRetries = 2 } = {}) {
  const url = `${BASE_URL}/${model}:generateContent?key=${key}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, candidateCount: 1 }
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const parts = json.candidates?.[0]?.content?.parts || [];
      const imgPart = parts.find(p => p.inline_data || p.inlineData);
      const b64 = imgPart?.inline_data?.data || imgPart?.inlineData?.data;
      if (!b64) throw new Error('No image data in response');

      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, Buffer.from(b64, 'base64'));
      return { success: true, path: outputPath };
    } catch (err) {
      if (attempt === maxRetries) return { success: false, path: outputPath, error: err.message };
      await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add game/build/lib/env.mjs game/build/lib/gemini.mjs
git commit -m "feat(build): add shared env loader and Gemini API helpers"
```

---

### Task 2: Create character registry (`characters.json`)

**Files:**
- Create: `game/data/characters.json`

- [ ] **Step 1: Create characters.json with ECHO and KAI**

```json
{
  "echo": {
    "name": "ECHO",
    "speaker_id": "echo",
    "sprite_dir": "assets/echo",
    "sprite_pattern": "echo_{emotion}.png",
    "emotions": ["blank", "concern", "happy"],
    "character_lock": "ECHO character — follow EXACTLY: flat trapezoid body wide-at-top narrow-at-bottom, NO neck, head merged with body, THREE short thick antennae sticking upward from top of head, TWO white oval eyes with NO pupils, stubby arms, solid #895AFF purple body with halftone texture, circular cyan (#00ffcc) A2H badge on chest, NO nose, NO ears, NO pupils, comic book style with thick black 3-4px outlines",
    "style": "flat 2D comic illustration, NOT 3D, NOT rounded cartoon, cyberpunk aesthetic, halftone dot texture overlay, thick black outlines, flat cel shading"
  },
  "kai": {
    "name": "KAI",
    "speaker_id": "partner",
    "sprite_dir": "assets/partners",
    "sprite_pattern": "kai.png",
    "emotions": ["default"],
    "character_lock": "KAI character: young Asian male freelancer age 25, short dark hair with purple highlights, sharp confident facial features, wearing black oversized hoodie with cyan neon edge lighting, small 'a2hmarket.ai' text logo on chest in cyan glow, hands in pockets or one hand visible, half-body portrait from waist up, cyberpunk comic style with thick black outlines, flat cel shading, semi-realistic anime influenced"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add game/data/characters.json
git commit -m "feat(data): add character registry with ECHO and KAI"
```

---

### Task 3: Implement scan-assets with tests

**Files:**
- Create: `game/build/steps/scan-assets.mjs`
- Create: `game/tests/scan-assets.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// game/tests/scan-assets.test.js
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
    expect(refs).toContain('assets/echo/echo_blank.png'); // default fallback
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd game && npx vitest run tests/scan-assets.test.js`
Expected: FAIL — `scan-assets.mjs` does not exist yet.

- [ ] **Step 3: Implement scan-assets.mjs**

```javascript
// game/build/steps/scan-assets.mjs
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GAME_ROOT } from '../lib/env.mjs';

export function collectAssetRefs(script, characters) {
  const refs = new Set();

  // Build a reverse map: speaker_id → character key
  const speakerMap = {};
  for (const [key, char] of Object.entries(characters)) {
    speakerMap[char.speaker_id || key] = key;
  }

  for (const ep of Object.values(script)) {
    for (const screen of ep.screens) {
      if (screen.image) refs.add(screen.image);
      if (screen.bg) refs.add(screen.bg);
      if (screen.partner?.sprite) refs.add(screen.partner.sprite);

      // Collect ECHO emotions from dialogue
      const dialogueLines = screen.dialogue || [];
      for (const line of dialogueLines) {
        if (line.speaker === 'echo') {
          const emotion = line.emotion || 'blank';
          const echo = characters.echo;
          refs.add(`${echo.sprite_dir}/${echo.sprite_pattern.replace('{emotion}', emotion)}`);
        }
      }

      // Collect echo_emotion_after from choice options
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

  // Always include default ECHO blank
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

  // Check which files exist
  const existingFiles = new Set();
  for (const ref of refs) {
    if (existsSync(resolve(root, ref))) {
      existingFiles.add(ref);
    }
  }

  const result = diffAssets(refs, existingFiles);

  // Enrich missing items with prompt context from characters
  for (const item of result.missing) {
    if (item.type === 'sprite') {
      // Parse character and emotion from path
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

  // Write result
  const cachePath = resolve(root, 'build/cache/asset-needs.json');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(resolve(root, 'build/cache'), { recursive: true });
  writeFileSync(cachePath, JSON.stringify(result, null, 2));

  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd game && npx vitest run tests/scan-assets.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add game/build/steps/scan-assets.mjs game/tests/scan-assets.test.js
git commit -m "feat(build): add scan-assets step with tests"
```

---

### Task 4: Implement validate with tests

**Files:**
- Create: `game/build/steps/validate.mjs`
- Create: `game/tests/validate.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd game && npx vitest run tests/validate.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement validate.mjs**

```javascript
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

  // Validate each episode structure
  for (const ep of Object.values(scriptZh)) {
    errors.push(...validateEpisode(ep).map(e => `[${ep.id}] ${e}`));
  }
  for (const ep of Object.values(scriptEn)) {
    errors.push(...validateEpisode(ep).map(e => `[${ep.id}/en] ${e}`));
  }

  // Cross-language consistency
  errors.push(...validateConsistency(scriptZh, scriptEn));

  // Asset file existence
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd game && npx vitest run tests/validate.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add game/build/steps/validate.mjs game/tests/validate.test.js
git commit -m "feat(build): add validate step with tests"
```

---

### Task 5: Implement gen-script (outline → script JSON)

**Files:**
- Create: `game/build/steps/gen-script.mjs`

- [ ] **Step 1: Create gen-script.mjs**

```javascript
// game/build/steps/gen-script.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv, requireKey, GAME_ROOT } from '../lib/env.mjs';
import { geminiText } from '../lib/gemini.mjs';

const TEXT_MODEL = 'gemini-2.5-flash';

function buildSystemPrompt(characters, existingEpisode) {
  const worldBibleRules = `
INVIOLABLE RULES:
1. Tasks completed by an Agent alone lose human-recognized value.
2. Humans must choose an Agent partner.
3. Time travel happens only once (ECHO is the only one).
4. ECHO cannot directly predict the future, only guide/demonstrate.
5. A2H Market platform is neutral, takes no sides.

BRAND SLOGAN: "没有全能的个体，只有互补的进化" — must appear in the outro.
ECHO VOICE: System-like ("✓ 已记录", "正在处理", "数据不足"). No metaphors. No future prediction.
`;

  const characterInfo = Object.entries(characters)
    .map(([k, v]) => `- ${v.name}: speaker_id="${v.speaker_id}", emotions=[${v.emotions.join(',')}]`)
    .join('\n');

  const schema = `
OUTPUT JSON SCHEMA:
{
  "id": "EPXX",
  "title": "中文标题",
  "learned_feeling": "感受名",
  "score_delta_hint": 8,
  "screens": [
    { "type": "story_intro", "content": ["line1", "", "line2", ...] },
    { "type": "cold_open", "image": "assets/bg/SCENE.png", "narration": "旁白文字" },
    { "type": "vn", "bg": "assets/bg/SCENE.png", "partner": { "sprite": "assets/partners/NAME.png", "name": "NAME" },
      "dialogue": [{ "speaker": "partner|echo|narrator", "emotion": "EMOTION", "text": "台词" }] },
    { "type": "choice", "bg": "assets/bg/SCENE.png", "prompt": "旁白描述",
      "options": [
        { "id": "A", "text": "选项文字", "score": 0, "reaction": { "speaker": "partner", "text": "反应" }, "echo_emotion_after": "blank" },
        { "id": "B", "text": "选项文字", "score": 8, "reaction": { "speaker": "echo", "text": "反应" }, "echo_emotion_after": "happy" }
      ] },
    { "type": "outro", "image": "assets/bg/SCENE.png", "learned_feeling_display": "感受展示词" }
  ]
}

RULES:
- "bg" fields: use descriptive filenames like "assets/bg/ep02_scene_name.png"
- "emotion" fields: choose from character's known emotions or invent new ones if needed
- story_intro screen: 7-9 lines of text with "" for spacing, sets up the 2050 contrast
- cold_open: one powerful narration sentence about 2050
- vn screens: 10-25 dialogue lines each, mix of partner/echo/narrator
- choice: exactly 2 options. Option A = safe/logical (score:0). Option B = emotionally aware (score:8)
- outro: learned_feeling_display is the emotion word shown large on screen
- Partner sprite: use "assets/partners/{name_lowercase}.png"
`;

  const fewShot = existingEpisode
    ? `\nFEW-SHOT EXAMPLE (EP01):\n${JSON.stringify(existingEpisode, null, 2).slice(0, 3000)}...\n`
    : '';

  return `You are a script writer for the A2H UNIVERSE visual novel game.
${worldBibleRules}
CHARACTERS:
${characterInfo}
${schema}
${fewShot}
Return ONLY valid JSON. No markdown fences. No explanation.`;
}

function buildTranslatePrompt() {
  return `You are a translator for the A2H UNIVERSE visual novel game.
Translate the following Chinese episode JSON to English.
Translate ONLY these fields: "title", "learned_feeling", "narration", "text", "prompt", "learned_feeling_display", and "content" array strings.
Keep ALL other fields (id, type, speaker, emotion, score, bg, image, sprite, name, etc.) UNCHANGED.
ECHO voice in English: "✓ Logged.", "Processing.", "……Recording."
Return ONLY valid JSON. No markdown fences.`;
}

export async function genScript(outlinePath, episodeId, gameRoot) {
  const root = gameRoot || GAME_ROOT;
  loadEnv();
  const key = requireKey('GEMINI_API_KEY');

  const outline = readFileSync(resolve(root, outlinePath), 'utf8');
  const characters = JSON.parse(readFileSync(resolve(root, 'data/characters.json'), 'utf8'));

  // Load existing EP01 as few-shot example
  const existingScript = JSON.parse(readFileSync(resolve(root, 'data/script.zh.json'), 'utf8'));
  const existingEpisode = existingScript.EP01 || null;

  // Step 1: Generate Chinese script
  console.log('  Generating Chinese script...');
  const systemPrompt = buildSystemPrompt(characters, existingEpisode);
  const userPrompt = `Generate episode ${episodeId} from this outline:\n\n${outline}`;

  let zhText = await geminiText(TEXT_MODEL, systemPrompt, userPrompt, key, { temperature: 0.7 });

  // Strip markdown fences if present
  zhText = zhText.replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim();

  let zhEpisode;
  try {
    zhEpisode = JSON.parse(zhText);
  } catch (err) {
    // Retry with lower temperature
    console.log('  First attempt failed to parse, retrying...');
    zhText = await geminiText(TEXT_MODEL, systemPrompt, userPrompt, key, { temperature: 0.3 });
    zhText = zhText.replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim();
    zhEpisode = JSON.parse(zhText);
  }

  zhEpisode.id = episodeId;

  // Append to zh script
  existingScript[episodeId] = zhEpisode;
  writeFileSync(resolve(root, 'data/script.zh.json'), JSON.stringify(existingScript, null, 2));
  console.log(`  ✓ Chinese script saved (${episodeId})`);

  // Step 2: Translate to English
  console.log('  Translating to English...');
  const translatePrompt = buildTranslatePrompt();
  let enText = await geminiText(TEXT_MODEL, translatePrompt, JSON.stringify(zhEpisode, null, 2), key, { temperature: 0.3 });
  enText = enText.replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim();

  let enEpisode;
  try {
    enEpisode = JSON.parse(enText);
  } catch (err) {
    console.log('  Translation parse failed, retrying...');
    enText = await geminiText(TEXT_MODEL, translatePrompt, JSON.stringify(zhEpisode, null, 2), key, { temperature: 0.1 });
    enText = enText.replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim();
    enEpisode = JSON.parse(enText);
  }

  enEpisode.id = episodeId;

  const existingEn = JSON.parse(readFileSync(resolve(root, 'data/script.en.json'), 'utf8'));
  existingEn[episodeId] = enEpisode;
  writeFileSync(resolve(root, 'data/script.en.json'), JSON.stringify(existingEn, null, 2));
  console.log(`  ✓ English script saved (${episodeId})`);

  return { zh: zhEpisode, en: enEpisode };
}
```

- [ ] **Step 2: Commit**

```bash
git add game/build/steps/gen-script.mjs
git commit -m "feat(build): add gen-script step (outline → zh/en script JSON)"
```

---

### Task 6: Implement gen-assets (generate missing sprites/backgrounds)

**Files:**
- Create: `game/build/steps/gen-assets.mjs`

- [ ] **Step 1: Create gen-assets.mjs**

```javascript
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

      // Update characters.json emotions list for new sprite emotions
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
```

- [ ] **Step 2: Commit**

```bash
git add game/build/steps/gen-assets.mjs
git commit -m "feat(build): add gen-assets step (generate missing sprites/backgrounds)"
```

---

### Task 7: Implement orchestrator (`build-episode.mjs`)

**Files:**
- Create: `game/build/build-episode.mjs`
- Modify: `game/package.json`

- [ ] **Step 1: Create build-episode.mjs**

```javascript
// game/build/build-episode.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv, GAME_ROOT } from './lib/env.mjs';
import { genScript } from './steps/gen-script.mjs';
import { scanAssets } from './steps/scan-assets.mjs';
import { genAssets } from './steps/gen-assets.mjs';
import { validate } from './steps/validate.mjs';

const CACHE_DIR = resolve(GAME_ROOT, 'build/cache');
const CHECKPOINT_PATH = resolve(CACHE_DIR, 'checkpoint.json');

function parseArgs(argv) {
  const args = { outline: null, resume: false, step: null, only: null };
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--outline=')) args.outline = arg.slice('--outline='.length);
    if (arg === '--resume') args.resume = true;
    if (arg.startsWith('--step=')) args.step = arg.slice('--step='.length);
    if (arg.startsWith('--only=')) args.only = arg.slice('--only='.length);
  }
  return args;
}

function inferEpisodeId() {
  const scriptPath = resolve(GAME_ROOT, 'data/script.zh.json');
  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
  const ids = Object.keys(script).map(k => parseInt(k.replace('EP', ''), 10)).filter(n => !isNaN(n));
  const next = ids.length > 0 ? Math.max(...ids) + 1 : 1;
  return `EP${String(next).padStart(2, '0')}`;
}

function readCheckpoint() {
  if (!existsSync(CHECKPOINT_PATH)) return null;
  return JSON.parse(readFileSync(CHECKPOINT_PATH, 'utf8'));
}

function writeCheckpoint(episodeId, completedSteps) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CHECKPOINT_PATH, JSON.stringify({ episodeId, completedSteps, timestamp: new Date().toISOString() }, null, 2));
}

function clearCheckpoint() {
  if (existsSync(CHECKPOINT_PATH)) unlinkSync(CHECKPOINT_PATH);
}

const STEPS = ['gen-script', 'scan-assets', 'gen-assets', 'validate'];

async function main() {
  loadEnv();
  const args = parseArgs(process.argv);

  let episodeId;
  let completedSteps = [];
  let outline = args.outline;

  // Resume mode
  if (args.resume) {
    const cp = readCheckpoint();
    if (!cp) {
      console.error('No checkpoint found. Run without --resume first.');
      process.exit(1);
    }
    episodeId = cp.episodeId;
    completedSteps = cp.completedSteps;
    console.log(`Resuming ${episodeId} from after: ${completedSteps.join(', ') || 'start'}`);
  }

  // Single step mode
  if (args.step) {
    if (!STEPS.includes(args.step)) {
      console.error(`Unknown step: ${args.step}. Valid: ${STEPS.join(', ')}`);
      process.exit(1);
    }
  }

  // Determine episode ID
  if (!episodeId) {
    if (outline) {
      // Try to read EP ID from outline heading
      const text = readFileSync(resolve(GAME_ROOT, outline), 'utf8');
      const match = text.match(/^#\s+(EP\.?\d+)/mi);
      episodeId = match ? match[1].replace('.', '').replace('EP', 'EP') : inferEpisodeId();
      // Normalize: "EP.02" → "EP02"
      episodeId = episodeId.replace('.', '');
    } else {
      episodeId = inferEpisodeId();
    }
  }

  console.log(`\n🎮 Building episode: ${episodeId}\n`);

  const shouldRun = (step) => {
    if (args.step) return args.step === step;
    return !completedSteps.includes(step);
  };

  // Step 1: gen-script
  if (shouldRun('gen-script')) {
    if (!outline) {
      console.error('--outline is required for gen-script step.');
      process.exit(1);
    }
    const start = Date.now();
    console.log('📝 Step 1/4: Generating script...');
    await genScript(outline, episodeId);
    console.log(`  Done in ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
    completedSteps.push('gen-script');
    writeCheckpoint(episodeId, completedSteps);
  }

  // Step 2: scan-assets
  if (shouldRun('scan-assets')) {
    const start = Date.now();
    console.log('🔍 Step 2/4: Scanning assets...');
    const result = await scanAssets();
    console.log(`  Found ${result.missing.length} missing, ${result.existing.length} existing`);
    console.log(`  Done in ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
    completedSteps.push('scan-assets');
    writeCheckpoint(episodeId, completedSteps);
  }

  // Step 3: gen-assets
  if (shouldRun('gen-assets')) {
    const needsPath = resolve(GAME_ROOT, 'build/cache/asset-needs.json');
    if (!existsSync(needsPath)) {
      console.log('⏭ No asset-needs.json found, running scan first...');
      await scanAssets();
    }
    const needs = JSON.parse(readFileSync(needsPath, 'utf8'));

    if (needs.missing.length === 0) {
      console.log('✅ Step 3/4: All assets exist, skipping generation.\n');
    } else {
      const start = Date.now();
      console.log(`🎨 Step 3/4: Generating ${needs.missing.length} assets...`);
      const result = await genAssets(undefined, { only: args.only });
      console.log(`  Succeeded: ${result.succeeded}, Failed: ${result.failed}`);
      if (result.failures.length > 0) {
        for (const f of result.failures) console.log(`  ⚠ ${f.path}: ${f.error}`);
      }
      console.log(`  Done in ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
    }
    completedSteps.push('gen-assets');
    writeCheckpoint(episodeId, completedSteps);
  }

  // Step 4: validate
  if (shouldRun('validate')) {
    const start = Date.now();
    console.log('✔️  Step 4/4: Validating...');
    const errors = await validate();
    if (errors.length > 0) {
      console.error('❌ Validation failed:');
      for (const e of errors) console.error(`  - ${e}`);
      console.log(`  Done in ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
      process.exit(1);
    }
    console.log(`  ✅ All checks passed`);
    console.log(`  Done in ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
    completedSteps.push('validate');
  }

  // Clear checkpoint on full success
  if (!args.step && completedSteps.length === STEPS.length) {
    clearCheckpoint();
  }

  console.log(`🎮 Episode ${episodeId} ready!\n`);
}

main().catch(err => {
  console.error(`\n💥 Build failed: ${err.message}`);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
```

- [ ] **Step 2: Add npm scripts to package.json**

Add to `game/package.json` scripts:

```json
"build:episode": "node build/build-episode.mjs",
"validate": "node build/steps/validate.mjs"
```

- [ ] **Step 3: Commit**

```bash
git add game/build/build-episode.mjs game/package.json
git commit -m "feat(build): add episode orchestrator with checkpointing and CLI"
```

---

### Task 8: Update game engine for dynamic sprite resolution

**Files:**
- Modify: `game/src/main.js`
- Modify: `game/src/ui/screens.js`

- [ ] **Step 1: Modify main.js to load characters.json at boot and pass to renderScreen**

In `game/src/main.js`, add characters loading after the existing `loadJson` calls (around line 29):

```javascript
// After line 34 (the Promise.all for scripts and UI):
const characters = await loadJson('./data/characters.json');
```

Then pass `characters` into the `refs` object (around line 56):

```javascript
const refs = {
  stage: document.querySelector('#stage'),
  dialoguePanel: document.querySelector('.dialogue-panel'),
  dialogueContent: document.querySelector('[data-slot="dialogue-content"]'),
  choiceOptions: document.querySelector('[data-slot="choice-options"]'),
  characters  // add this
};
```

- [ ] **Step 2: Modify screens.js to use dynamic sprite resolution**

In `game/src/ui/screens.js`, add a helper function after line 16:

```javascript
function resolveSpritePath(characters, characterKey, emotion) {
  const char = characters?.[characterKey];
  if (!char) return `assets/echo/echo_${emotion || 'blank'}.png`; // fallback
  const fallbackEmotion = char.emotions?.[0] || 'blank';
  const actualEmotion = emotion || fallbackEmotion;
  return `${char.sprite_dir}/${char.sprite_pattern.replace('{emotion}', actualEmotion)}`;
}
```

Then update `renderCharacters` (line 28) to accept and use characters:

```javascript
function renderCharacters(activeSpeaker, echoEmotion, partnerSprite, partnerName, characters) {
  const echoActive = activeSpeaker === 'echo';
  const partnerActive = activeSpeaker === 'partner';
  const echoSrc = characters
    ? resolveSpritePath(characters, 'echo', echoEmotion || 'blank')
    : `assets/echo/echo_${echoEmotion || 'blank'}.png`;
  return h('div', { class: 'characters' },
    h('img', {
      class: `sprite partner${partnerActive ? ' active' : ''}`,
      src: partnerSprite,
      alt: partnerName || ''
    }),
    h('img', {
      class: `sprite echo${echoActive ? ' active' : ''}`,
      src: echoSrc,
      alt: 'ECHO'
    })
  );
}
```

Update all callers of `renderCharacters` to pass `characters` from `refs`:

In `paintStageVn` (line 70), add `characters` parameter:
```javascript
function paintStageVn(stage, screen, line, characters) {
  const echoEmotion = line.speaker === 'echo' ? (line.emotion || 'blank') : 'blank';
  stage.replaceChildren(
    ...renderSceneBg(screen.bg).filter(Boolean),
    renderCharacters(line.speaker, echoEmotion, screen.partner.sprite, screen.partner.name, characters)
  );
}
```

Similarly update `paintStageChoicePrompt`, `paintStageChoiceReaction`, `paintStageOutro` to accept and pass `characters`.

In `renderScreen`, extract characters from refs and pass through:
```javascript
const { stage, dialoguePanel, dialogueContent, choiceOptions, characters } = refs;
```

Pass `characters` to each `paintStage*` call.

- [ ] **Step 3: Run existing tests to verify no regressions**

Run: `cd game && npx vitest run`
Expected: All existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add game/src/main.js game/src/ui/screens.js
git commit -m "feat(game): dynamic sprite resolution from characters.json"
```

---

### Task 9: Add build/cache to .gitignore and final cleanup

**Files:**
- Modify: `game/.gitignore`

- [ ] **Step 1: Add build cache to gitignore**

Append to `game/.gitignore`:

```
build/cache/
```

- [ ] **Step 2: Run full validation on existing content**

Run: `cd game && npm run validate`
Expected: `✅ Validation passed` (all EP01 assets exist, structure is valid).

- [ ] **Step 3: Run all tests**

Run: `cd game && npm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add game/.gitignore
git commit -m "chore: add build/cache to gitignore"
```
