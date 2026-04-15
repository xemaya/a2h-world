# Plan 1: Foundation & EP.01 Vertical Slice

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundational toolchain + UI framework + produce EP.01 end-to-end (script + assets + playable in browser, bilingual zh/en, both choices reachable) to validate the entire production pipeline before scaling to EP.02-12.

**Architecture:** Single-page static app, vanilla ES modules (no framework, no bundler). Node 22+ for build scripts only (`generate-assets.mjs`, `review-script.mjs`, `verify-models.mjs`). Tests: vitest. Data: JSON files loaded at runtime. State: pure state machine + `localStorage`. Deployment: GitHub Pages (static tree).

**Tech Stack:**
- Runtime: vanilla JS ES modules, CSS3
- Build/dev tools: Node 22 LTS, npm, vitest, zod (schema validation)
- Image gen: Google `gemini-3.1-flash-image-preview` via REST (construction-time only)
- Text gen: Claude Sonnet (via Agent tool) + Gemini latest text model (via REST), Opus review/merge (this session)
- Hosting: `python3 -m http.server` for local dev, GitHub Pages for delivery

**Spec:** [../specs/2026-04-15-a2h-echo-avg-design.md](../specs/2026-04-15-a2h-echo-avg-design.md)

**Scope of this plan:** EP.01 only. Plans 2–4 handle EP.02-12 scripts, EP.02-12 assets, and full integration + endings.

---

## File Structure (to be created in this plan)

```
a2h_world/game/
├── .env                             GEMINI_API_KEY (gitignored)
├── .env.example                     Template committed to git
├── .gitignore
├── package.json                     npm scripts + vitest deps
├── index.html                       Single entry page
├── data/
│   ├── ui.zh.json                   ~30 UI strings
│   ├── ui.en.json
│   ├── script.zh.json               { "EP01": {…} } only in this plan
│   ├── script.en.json
│   ├── asset-manifest.json          Image gen spec (EP.01 only in this plan)
│   └── i18n/locked-terms.json       Bilingual lock list
├── src/
│   ├── main.js                      Boot: load data, construct app, start state machine
│   ├── state.js                     Pure state machine (no DOM)
│   ├── storage.js                   localStorage persistence
│   ├── i18n.js                      Language switching
│   └── ui/
│       ├── dialogue-box.js
│       ├── sprite.js
│       ├── progress-bar.js
│       ├── lang-toggle.js
│       ├── screens.js               Renderers: cold_open / vn / choice / outro
│       └── task-card.js
├── styles/
│   └── main.css                     Cyberpunk theme (#05050f / #00ffcc / #895AFF)
├── tests/
│   ├── state.test.js                State machine unit tests
│   ├── review-script.test.js        Compliance checker tests
│   └── schema.test.js               Script JSON schema tests
├── build/
│   ├── verify-models.mjs            Curl Google API, print available models
│   ├── review-script.mjs            9 hard constraints + locked-terms diff
│   ├── generate-assets.mjs          Batch nano-banana image gen + retry
│   └── briefs/
│       └── ep01-brief.md            Creative brief handed to Sonnet + Gemini
└── assets/
    ├── comics/                      EP.01 zh/en (copied from ../comics/assets/)
    ├── echo/                        ECHO 3 expressions (generated this plan)
    ├── partners/                    KAI (generated this plan)
    ├── bg/                          A2H Market hall (generated this plan)
    └── ui/                          Task card template (generated this plan)
```

**Unit boundaries:**
- `state.js`: pure function `reduce(state, event) → state`. Zero DOM references. Unit testable.
- `storage.js`: thin wrapper over `localStorage` keyed by `a2h-echo-v1`. Injectable for tests.
- `i18n.js`: resolves a key + lang → string. Pure.
- `ui/*.js`: each file renders one component; takes plain data, produces/updates DOM.
- `build/*.mjs`: one script, one job. No cross-deps.

---

## Task 1: Scaffold `game/` directory and package.json

**Files:**
- Create: `game/package.json`
- Create: `game/.gitignore`
- Create: `game/.env.example`
- Create: `game/README.md`

- [ ] **Step 1: Create directory structure**

```bash
cd /Users/huanghaibin/Workspace/aws_codebase/side_project/a2h_world
mkdir -p game/{data/i18n,src/ui,styles,tests,build/briefs,assets/{comics,echo,partners,bg,ui}}
```

- [ ] **Step 2: Write `game/package.json`**

```json
{
  "name": "a2h-echo-game",
  "version": "0.1.0",
  "description": "A2H UNIVERSE — ECHO text AVG (EP.01 vertical slice)",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "python3 -m http.server 8080",
    "test": "vitest run",
    "test:watch": "vitest",
    "verify:models": "node build/verify-models.mjs",
    "review:script": "node build/review-script.mjs",
    "gen:assets": "node build/generate-assets.mjs"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "zod": "^3.23.0"
  },
  "engines": {
    "node": ">=22"
  }
}
```

- [ ] **Step 3: Write `game/.gitignore`**

```
node_modules/
.env
.env.local
.DS_Store
build/cache/
assets/**/*.tmp.png
```

- [ ] **Step 4: Write `game/.env.example`**

```
# Copy to .env and fill in. .env is gitignored.
GEMINI_API_KEY=your-key-here
```

- [ ] **Step 5: Write `game/README.md`**

```markdown
# A2H ECHO — Game

Single-page text AVG. See `../docs/specs/` for design and `../docs/superpowers/plans/` for implementation plans.

## Dev

```bash
cp .env.example .env   # fill in GEMINI_API_KEY
npm install
npm run dev            # serves at http://localhost:8080
npm test
```

## Asset pipeline (build-time only)

```bash
npm run verify:models        # confirm Gemini model names are current
npm run gen:assets           # batch-generate via nano-banana
npm run review:script        # validate script JSON against 9 hard constraints
```
```

- [ ] **Step 6: Install dev dependencies**

```bash
cd game && npm install
```

Expected: `node_modules/` created, `package-lock.json` generated.

- [ ] **Step 7: Commit**

```bash
cd /Users/huanghaibin/Workspace/aws_codebase/side_project/a2h_world
git add game/package.json game/package-lock.json game/.gitignore game/.env.example game/README.md
git commit -m "chore(game): scaffold game/ skeleton + npm deps (vitest, zod)"
```

---

## Task 2: Verify Gemini model names (build script + curl)

Model names change (nano-banana went 2.5 → 3.1). Before any generation work, confirm the current names.

**Files:**
- Create: `game/build/verify-models.mjs`

- [ ] **Step 1: Write `verify-models.mjs`**

```javascript
// build/verify-models.mjs — lists Gemini models matching image+text patterns and verifies expected IDs
import 'dotenv/config';
import { readFileSync } from 'node:fs';

// Load .env manually (no dep)
try {
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* ok if .env missing */ }

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('ERROR: GEMINI_API_KEY not set'); process.exit(1); }

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}`;
const res = await fetch(url);
if (!res.ok) { console.error('ERROR:', res.status, await res.text()); process.exit(1); }
const { models } = await res.json();

const images = models.filter(m => /image/i.test(m.name));
const texts  = models.filter(m => /gemini-[23]/.test(m.name) && !/image|embed|tts/i.test(m.name));

console.log('\n=== IMAGE MODELS ===');
for (const m of images) console.log('  ' + m.name.replace('models/', ''));

console.log('\n=== TEXT MODELS (gemini-2.x / 3.x) ===');
for (const m of texts) console.log('  ' + m.name.replace('models/', ''));

const expectedImage = 'gemini-3.1-flash-image-preview';
const hasExpected = images.some(m => m.name.endsWith(expectedImage));
console.log(`\nExpected image model "${expectedImage}": ${hasExpected ? 'FOUND' : 'NOT FOUND — pick an alternative from above'}`);
```

- [ ] **Step 2: Run and confirm**

```bash
cd game && cp .env.example .env
# Edit .env and set GEMINI_API_KEY to the key the user supplied.
# Never commit .env — it's gitignored.
npm run verify:models
```

Expected: prints list of image + text model IDs. Note both:
- The image model to use (should be `gemini-3.1-flash-image-preview` or latest listed)
- The text model to use for Gemini drafts (pick latest `gemini-3-*` or `gemini-2.5-pro`)

Record the confirmed names in `docs/superpowers/plans/model-names.md` (create if missing) so Task 8 + Task 9 use them.

- [ ] **Step 3: Commit**

```bash
cd /Users/huanghaibin/Workspace/aws_codebase/side_project/a2h_world
git add game/build/verify-models.mjs
git commit -m "feat(game/build): add verify-models.mjs for Gemini model name discovery"
```

---

## Task 3: Write script JSON schema + schema tests

The script schema is the single source of truth for what every episode's script file looks like. Sonnet + Gemini output will be validated against it.

**Files:**
- Create: `game/src/schema.js`
- Create: `game/tests/schema.test.js`

- [ ] **Step 1: Write failing test `tests/schema.test.js`**

```javascript
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
```

- [ ] **Step 2: Run test — expect failure (module not found)**

```bash
cd game && npm test -- schema.test.js
```

Expected: FAIL — `Cannot find module '../src/schema.js'`

- [ ] **Step 3: Implement `src/schema.js`**

```javascript
import { z } from 'zod';

const EmotionSchema = z.enum(['happy', 'blank', 'concern']);

const DialogueLineSchema = z.object({
  speaker: z.enum(['partner', 'echo', 'narrator']),
  emotion: z.string().min(1),
  text: z.string().min(1)
});

const PartnerSchema = z.object({
  sprite: z.string(),
  name: z.string().min(1)
});

const ColdOpenSchema = z.object({
  type: z.literal('cold_open'),
  image: z.string(),
  narration: z.string()
});

const VnSchema = z.object({
  type: z.literal('vn'),
  bg: z.string(),
  partner: PartnerSchema,
  dialogue: z.array(DialogueLineSchema).min(1)
});

const ChoiceOptionSchema = z.object({
  id: z.enum(['A', 'B']),
  text: z.string().min(1),
  score: z.union([z.literal(0), z.literal(8)]),
  reaction: z.object({ speaker: z.enum(['partner', 'echo']), text: z.string().min(1) }),
  echo_emotion_after: EmotionSchema
});

const ChoiceSchema = z.object({
  type: z.literal('choice'),
  bg: z.string(),
  prompt: z.string().min(1),
  options: z.array(ChoiceOptionSchema).length(2)
});

const OutroSchema = z.object({
  type: z.literal('outro'),
  image: z.string(),
  learned_feeling_display: z.string().min(1)
});

export const EpisodeSchema = z.object({
  id: z.string().regex(/^EP\d{2}$/),
  title: z.string().min(1),
  learned_feeling: z.string().min(1),
  score_delta_hint: z.union([z.literal(0), z.literal(8)]),
  screens: z.tuple([ColdOpenSchema, VnSchema, VnSchema, ChoiceSchema, OutroSchema])
});

export const ScriptFileSchema = z.record(z.string().regex(/^EP\d{2}$/), EpisodeSchema);
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- schema.test.js
```

Expected: PASS × 5

- [ ] **Step 5: Commit**

```bash
cd /Users/huanghaibin/Workspace/aws_codebase/side_project/a2h_world
git add game/src/schema.js game/tests/schema.test.js
git commit -m "feat(game): add Episode zod schema + unit tests"
```

---

## Task 4: Write `data/i18n/locked-terms.json`

Terms that MUST be identical across zh and en, and forbidden-phrase blacklist for the compliance check.

**Files:**
- Create: `game/data/i18n/locked-terms.json`

- [ ] **Step 1: Write the lockfile**

```json
{
  "locked_identical_both_langs": [
    "A2H Market",
    "A2H UNIVERSE",
    "ECHO",
    "VOID",
    "a2hmarket.ai"
  ],
  "locked_pairs": {
    "没有全能的个体，只有互补的进化": "No omnipotent individuals, only complementary evolution.",
    "互补": "complementary",
    "进化": "evolution",
    "共生": "symbiosis",
    "A2H UNIVERSE": "A2H UNIVERSE"
  },
  "forbidden_phrases_zh": [
    "让我们一起",
    "在这个.+的时代",
    "这不仅是.+更是",
    "拥抱变化",
    "赋能",
    "无缝",
    "生态",
    "闭环"
  ],
  "forbidden_phrases_en": [
    "Let's together",
    "In this era of",
    "This is not just .+ but also",
    "empower",
    "seamlessly",
    "synergy",
    "ecosystem"
  ],
  "echo_mandatory_phrases_zh": [
    "✓",
    "……记录中"
  ],
  "echo_mandatory_phrases_en": [
    "✓",
    "Recording"
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add game/data/i18n/locked-terms.json
git commit -m "feat(game): add locked-terms i18n constraints (brand words + AI-slop blacklist)"
```

---

## Task 5: Write `review-script.mjs` + tests (9 hard constraints checker)

Automated pre-screen for script compliance. If a script doesn't pass, it doesn't reach Opus human review.

**Files:**
- Create: `game/build/review-script.mjs`
- Create: `game/tests/review-script.test.js`

- [ ] **Step 1: Write failing test `tests/review-script.test.js`**

```javascript
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
    const longText = '这是一段很长的对话'.repeat(40); // ~320 chars
    ep.screens[1].dialogue = [{ speaker: 'partner', emotion: 'neutral', text: longText }];
    const { passed, violations } = reviewEpisode(ep, { lang: 'zh', lockedTerms });
    expect(passed).toBe(false);
    expect(violations.find(v => v.rule === 'word_budget')).toBeDefined();
  });

  it('flags missing locked brand word across whole episode', () => {
    const ep = makeEp();
    // locked_identical_both_langs should appear at least once in an episode
    // Strip all mentions by making vn dialogue blank
    const { passed, violations } = reviewEpisode(ep, {
      lang: 'zh', lockedTerms,
      requireLockedTermsAtLeastOnce: ['A2H Market']
    });
    expect(passed).toBe(false);
    expect(violations.find(v => v.rule === 'locked_term_missing')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run — expect failure (module not found)**

```bash
cd game && npm test -- review-script.test.js
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Implement `build/review-script.mjs`**

```javascript
// build/review-script.mjs — static compliance check against 9 hard constraints from spec §3.3
import { readFileSync, writeFileSync } from 'node:fs';

// Heuristics (not exhaustive). Review process: automated check first, Opus human review second.
const JUDGMENTAL_PHRASES_ZH = ['你说得对', '你错了', '你是对的', '正确答案', '太棒了'];
const JUDGMENTAL_PHRASES_EN = ["you're right", "you are right", 'correct answer', 'good job', 'you got it'];
const LESSON_SPELLED_ZH = /你学会了|你懂了|你理解了/;
const LESSON_SPELLED_EN = /you learned|you understood|you got the lesson/i;

function countChars(screens, indices) {
  let total = 0;
  for (const i of indices) {
    const s = screens[i];
    if (!s.dialogue) continue;
    for (const d of s.dialogue) total += (d.text || '').length;
  }
  return total;
}

export function reviewEpisode(ep, { lang = 'zh', lockedTerms, requireLockedTermsAtLeastOnce = [] } = {}) {
  const violations = [];
  const v = (rule, detail) => violations.push({ rule, detail });

  const forbidden = lang === 'zh' ? lockedTerms.forbidden_phrases_zh : lockedTerms.forbidden_phrases_en;
  const echoMandatory = lang === 'zh' ? lockedTerms.echo_mandatory_phrases_zh : lockedTerms.echo_mandatory_phrases_en;
  const judgmental = lang === 'zh' ? JUDGMENTAL_PHRASES_ZH : JUDGMENTAL_PHRASES_EN;
  const lessonSpelled = lang === 'zh' ? LESSON_SPELLED_ZH : LESSON_SPELLED_EN;

  // Gather all text for global checks
  const allLines = [];
  for (const s of ep.screens) {
    if (s.narration) allLines.push({ screen: s.type, speaker: 'narrator', text: s.narration });
    if (s.dialogue) for (const d of s.dialogue) allLines.push({ screen: s.type, speaker: d.speaker, text: d.text });
    if (s.options) for (const o of s.options) {
      allLines.push({ screen: 'choice.option', speaker: '-', text: o.text });
      allLines.push({ screen: 'choice.reaction', speaker: o.reaction.speaker, text: o.reaction.text });
    }
  }

  // Rule B.3 — word budgets per screen
  // screens[0]=cold_open narration ≤30
  if ((ep.screens[0].narration || '').length > 30) v('word_budget', `cold_open narration ${ep.screens[0].narration.length} > 30`);
  // screens[1..2] combined ≤250
  const mid = countChars(ep.screens, [1, 2]);
  if (mid > 250) v('word_budget', `vn screens 2+3 total ${mid} > 250`);
  // screen[3] (choice) prompt+options+reactions ≤200
  const ch = ep.screens[3];
  const choiceLen = (ch.prompt || '').length
    + ch.options.reduce((a, o) => a + o.text.length + o.reaction.text.length, 0);
  if (choiceLen > 200) v('word_budget', `choice screen total ${choiceLen} > 200`);
  // screen[4] outro display ≤50
  if ((ep.screens[4].learned_feeling_display || '').length > 50) v('word_budget', `outro display > 50`);

  // Rule C.6 — forbidden AI-slop phrases
  for (const line of allLines) {
    for (const p of forbidden) {
      const re = new RegExp(p);
      if (re.test(line.text)) v('forbidden_phrase', `"${p}" in ${line.screen} (${line.speaker}): ${line.text}`);
    }
  }

  // Rule A.1 — ECHO voice: in an episode, ECHO lines should contain at least one mandatory phrase overall
  const echoLines = allLines.filter(l => l.speaker === 'echo');
  if (echoLines.length > 0) {
    const hasMandatory = echoLines.some(l => echoMandatory.some(p => l.text.includes(p)));
    if (!hasMandatory) v('echo_voice', `no ECHO line contains any mandatory phrase ${JSON.stringify(echoMandatory)}`);
  }

  // Rule B.4 — reaction after choice must not be judgmental
  for (const o of ch.options) {
    for (const j of judgmental) {
      if (o.reaction.text.toLowerCase().includes(j.toLowerCase())) {
        v('ambiguous_choice', `option ${o.id} reaction judgmental ("${j}"): ${o.reaction.text}`);
      }
    }
  }

  // Rule C.5 — lesson must not be spelled out in dialogue
  for (const line of allLines) {
    if (lessonSpelled.test(line.text)) v('feeling_spelled_out', `${line.screen} (${line.speaker}): ${line.text}`);
  }

  // Required locked terms must appear at least once across the episode
  for (const term of requireLockedTermsAtLeastOnce) {
    const found = allLines.some(l => l.text.includes(term));
    if (!found) v('locked_term_missing', `required term "${term}" not present in any line`);
  }

  return { passed: violations.length === 0, violations };
}

// CLI entry: node build/review-script.mjs data/script.zh.json EP01
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , scriptPath, epId] = process.argv;
  if (!scriptPath || !epId) {
    console.error('Usage: node build/review-script.mjs <script.json> <EP_ID>');
    process.exit(1);
  }
  const lang = scriptPath.includes('.en.') ? 'en' : 'zh';
  const scriptFile = JSON.parse(readFileSync(scriptPath, 'utf8'));
  const lockedTerms = JSON.parse(readFileSync(new URL('../data/i18n/locked-terms.json', import.meta.url), 'utf8'));
  const ep = scriptFile[epId];
  if (!ep) { console.error(`No ${epId} in ${scriptPath}`); process.exit(1); }

  const { passed, violations } = reviewEpisode(ep, {
    lang, lockedTerms,
    requireLockedTermsAtLeastOnce: ['A2H Market', 'a2hmarket.ai']
  });

  console.log(`\n=== Review ${epId} (${lang}) ===`);
  if (passed) {
    console.log('✓ PASSED all automated checks');
  } else {
    console.log(`✗ ${violations.length} violation(s):`);
    for (const v of violations) console.log(`  [${v.rule}] ${v.detail}`);
    process.exit(2);
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- review-script.test.js
```

Expected: PASS × 7

- [ ] **Step 5: Commit**

```bash
cd /Users/huanghaibin/Workspace/aws_codebase/side_project/a2h_world
git add game/build/review-script.mjs game/tests/review-script.test.js
git commit -m "feat(game/build): add review-script.mjs compliance checker + tests"
```

---

## Task 6: Write `generate-assets.mjs` (nano-banana batch generator)

**Files:**
- Create: `game/build/generate-assets.mjs`
- Create: `game/data/asset-manifest.json` (EP.01-only scope in this plan)

- [ ] **Step 1: Write `data/asset-manifest.json` — EP.01 only**

```json
{
  "model": "gemini-3.1-flash-image-preview",
  "common_style_prompt": "flat 2D comic illustration, NOT 3D, NOT rounded cartoon, cyberpunk aesthetic, halftone dot texture overlay, thick black 3-4px outlines, flat cel shading, palette: #05050f dark background, #00ffcc cyan neon accents, #895AFF purple highlights",
  "character_lock_prompt": "ECHO character — follow EXACTLY: flat trapezoid body wide-at-top narrow-at-bottom, NO neck, head merged with body, TWO short thick antennae forking upward, TWO white oval eyes with NO pupils, ONE wide white arc smile below eyes, stubby arms, solid #895AFF purple body with halftone texture, circular cyan A2H badge on chest, NO nose, NO ears, NO pupils",
  "assets": [
    {
      "id": "echo_happy",
      "output": "assets/echo/echo_happy.png",
      "prompt": "ECHO character, half-body portrait, looking forward, expression: two white oval eyes + wide arc smile (happy), standing pose, transparent background, isolated subject",
      "use_character_lock": true,
      "reference_image": "../assets/echo_visual_full.png",
      "size": "512x768"
    },
    {
      "id": "echo_blank",
      "output": "assets/echo/echo_blank.png",
      "prompt": "ECHO character, half-body portrait, looking forward, expression: two white oval eyes NO mouth (blank observation mode), standing pose, transparent background, isolated subject",
      "use_character_lock": true,
      "reference_image": "../assets/echo_visual_full.png",
      "size": "512x768"
    },
    {
      "id": "echo_concern",
      "output": "assets/echo/echo_concern.png",
      "prompt": "ECHO character, half-body portrait, looking forward, expression: two filled black dot eyes squinting (concerned/puzzled) + small arc mouth, slight tilt of head, standing pose, transparent background, isolated subject",
      "use_character_lock": true,
      "reference_image": "../assets/echo_visual_full.png",
      "size": "512x768"
    },
    {
      "id": "partner_kai",
      "output": "assets/partners/kai.png",
      "prompt": "KAI — young male freelancer in his 20s, short dark hair with purple streak, wearing a black hoodie with small 'a2hmarket.ai' logo on chest, confident smirk, half-body portrait, cyberpunk comic style, flat color with halftone, thick black outlines, transparent background",
      "use_character_lock": false,
      "size": "512x768"
    },
    {
      "id": "bg_market_hall",
      "output": "assets/bg/market_hall.png",
      "prompt": "A2H Market trading hall, vast cyberpunk space, floating holographic task cards suspended mid-air with cyan #00ffcc glowing borders, humans and Agent silhouettes mingling in distance, large 'a2hmarket.ai' purple neon sign visible on the left wall, deep black #05050f background, atmospheric neon haze",
      "use_character_lock": false,
      "size": "1920x1080"
    },
    {
      "id": "ui_task_card",
      "output": "assets/ui/task_card.png",
      "prompt": "single holographic task card floating, semi-transparent glass panel with #00ffcc cyan glow border, empty center ready for overlaying text, slight tilt in 3D space, cyberpunk HUD aesthetic, isolated on transparent background",
      "use_character_lock": false,
      "size": "800x600"
    }
  ]
}
```

- [ ] **Step 2: Write `build/generate-assets.mjs`**

```javascript
// build/generate-assets.mjs — batch-generate images via Google's image model
// Supports --only=<id1,id2> to regenerate specific assets, --overwrite, --dry-run.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readFile } from 'node:fs';
import { readFile as readFileAsync } from 'node:fs/promises';
import { dirname, resolve as pathResolve } from 'node:path';

// Load .env
try {
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('GEMINI_API_KEY not set'); process.exit(1); }

const argv = process.argv.slice(2);
const only = (argv.find(a => a.startsWith('--only=')) || '').replace('--only=', '').split(',').filter(Boolean);
const overwrite = argv.includes('--overwrite');
const dryRun = argv.includes('--dry-run');

const manifest = JSON.parse(readFileSync(new URL('../data/asset-manifest.json', import.meta.url), 'utf8'));
const root = new URL('../', import.meta.url).pathname;

async function generateOne(a) {
  const outPath = pathResolve(root, a.output);
  if (!overwrite && existsSync(outPath)) {
    console.log(`  SKIP (exists) ${a.id} → ${a.output}`);
    return { id: a.id, status: 'skipped' };
  }

  const parts = [];
  if (a.use_character_lock) parts.push({ text: manifest.character_lock_prompt });
  parts.push({ text: manifest.common_style_prompt });
  parts.push({ text: a.prompt });

  if (a.reference_image) {
    const refPath = pathResolve(dirname(outPath), a.reference_image);
    const buf = await readFileAsync(refPath);
    parts.push({ inline_data: { mime_type: 'image/png', data: buf.toString('base64') } });
  }

  if (dryRun) {
    console.log(`  DRY ${a.id}: ${parts.map(p => p.text ? `[text ${p.text.length}c]` : '[image ref]').join(' + ')}`);
    return { id: a.id, status: 'dry' };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${manifest.model}:generateContent?key=${KEY}`;
  const body = { contents: [{ parts }] };

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`  attempt ${attempt} HTTP ${res.status}: ${txt.slice(0, 200)}`);
      if (attempt === 3) return { id: a.id, status: 'error', error: `HTTP ${res.status}` };
      await new Promise(r => setTimeout(r, 1500 * attempt));
      continue;
    }
    const json = await res.json();
    const imgPart = json.candidates?.[0]?.content?.parts?.find(p => p.inline_data || p.inlineData);
    const b64 = (imgPart?.inline_data || imgPart?.inlineData)?.data;
    if (!b64) {
      console.error(`  attempt ${attempt}: no image in response`);
      if (attempt === 3) return { id: a.id, status: 'error', error: 'no image' };
      continue;
    }
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, Buffer.from(b64, 'base64'));
    console.log(`  ✓ ${a.id} → ${a.output}`);
    return { id: a.id, status: 'ok' };
  }
}

const targets = only.length ? manifest.assets.filter(a => only.includes(a.id)) : manifest.assets;
console.log(`Generating ${targets.length} asset(s) with model ${manifest.model}${dryRun ? ' [DRY]' : ''}${overwrite ? ' [OVERWRITE]' : ''}`);

const results = [];
for (const a of targets) results.push(await generateOne(a));

const byStatus = results.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
console.log('\nSummary:', byStatus);
if (results.some(r => r.status === 'error')) process.exit(2);
```

- [ ] **Step 3: Dry-run smoke test**

```bash
cd game && node build/generate-assets.mjs --dry-run
```

Expected: prints 6 asset IDs with text part counts, no API calls.

- [ ] **Step 4: Commit**

```bash
cd /Users/huanghaibin/Workspace/aws_codebase/side_project/a2h_world
git add game/build/generate-assets.mjs game/data/asset-manifest.json
git commit -m "feat(game/build): add generate-assets.mjs + EP.01 asset manifest"
```

---

## Task 7: Write EP.01 creative brief

This is the prompt handed to both Sonnet and Gemini. One source of truth for the episode.

**Files:**
- Create: `game/build/briefs/ep01-brief.md`

- [ ] **Step 1: Write `build/briefs/ep01-brief.md`**

```markdown
# Creative Brief — EP.01 · 第一笔交易

## Episode metadata
- **id**: EP01
- **title**: 第一笔交易 (zh) / The First Trade (en)
- **learned_feeling**: 成就感 (zh) / A sense of accomplishment (en)
- **score_delta_hint**: 8 (option B grants; option A = 0)
- **真实任务案例**: KAI 接到一个简单 SEO 任务（¥50），ECHO 刚穿越到 2026 年，第一次与人类协作结算

## Context (hard constraints, must not violate)
- World Bible §1.3 五条宇宙规则：不可让 ECHO 预言未来、不可让 Agent 单独完成有意义的任务、平台中立
- ECHO 本集**刚穿越**，对人类情绪是"纯观察者"——**不能表现出已经理解情绪**
- 搭档 KAI：20 代年轻自由职业者，深色短发紫挑染，黑色连帽衫印小号 a2hmarket.ai logo，自信、有点逞强
- 第 4 格结幕必须含：口号「没有全能的个体，只有互补的进化」 / `a2hmarket.ai` / `EP.01` / 学到的感受「成就感」/ `No omnipotent individuals, only complementary evolution.`
- 彩蛋（World Bible §5.2）：EP.01 冷开场或结幕背景中必须含一个**黑色充气人剪影**（VOID 预告，第 9 集揭晓）。这只写在 image prompt 里，**对话不点破**

## Five-screen structure
所有集固定结构，见 design spec §2：
1. **cold_open**（屏 1，≤30 字旁白）：2050 年的"失败切片"——红色调，暗示人机分裂的未来
2. **vn**（屏 2，≤125 字对话）：KAI 与 ECHO 在 A2H Market 大厅相遇
3. **vn**（屏 3，≤125 字对话）：推进到 SEO 任务卡片悬浮出现，讨论怎么做
4. **choice**（屏 4，≤200 字 含选项）：KAI 完成任务领到钱，兴奋。ECHO 观察到他的情绪，两种回应：
   - A（+0，逻辑）：冰冷询问 / 数据反馈，不触及情绪
   - B（+8，情感）：试图命名他看到的这种人类状态
   A/B 必须暧昧——不能一眼看出 B 是"对的"
5. **outro**（屏 5，≤50 字）：结幕漫画第 4 格（已有 `../comics/assets/ep01_zh.png` / `ep01_en.png` 可参考）

## ECHO voice rules
- 系统提示口吻：「✓ 已记录」「正在处理」「数据不足，请补充」
- 感受到情绪时先沉默再「……记录中」
- 禁止用比喻，禁止预言未来
- 英文版："✓ Logged." / "Processing." / "……Recording."

## Output format (JSON)
严格遵守下面的 schema。输出为单个 episode 对象（不是 map）。所有字段必填。

```json
{
  "id": "EP01",
  "title": "...",
  "learned_feeling": "...",
  "score_delta_hint": 8,
  "screens": [
    { "type": "cold_open", "image": "comics/ep01_zh.png", "narration": "..." },
    { "type": "vn", "bg": "bg/market_hall.png",
      "partner": { "sprite": "partners/kai.png", "name": "KAI" },
      "dialogue": [ { "speaker": "partner|echo|narrator", "emotion": "...", "text": "..." } ]
    },
    { "type": "vn", "bg": "...", "partner": {...}, "dialogue": [...] },
    { "type": "choice", "bg": "...",
      "prompt": "一句情境铺垫",
      "options": [
        { "id": "A", "text": "...", "score": 0,
          "reaction": { "speaker": "partner", "text": "..." }, "echo_emotion_after": "blank" },
        { "id": "B", "text": "...", "score": 8,
          "reaction": { "speaker": "partner", "text": "..." }, "echo_emotion_after": "happy" }
      ]
    },
    { "type": "outro", "image": "comics/ep01_zh.png", "learned_feeling_display": "成就感" }
  ]
}
```

## Produce TWO versions
1. `script.zh.json` entry for EP01 (中文)
2. `script.en.json` entry for EP01 (English) — **not a translation**; localize tone. Brand/slogan/name 1:1 per `data/i18n/locked-terms.json`.

## Anti-patterns (instant rejection)
- AI-slop phrases ("让我们一起" / "赋能" / "Let's together" / "empower" / …)
- Partner telling ECHO what it learned ("你学会了 X")
- Reaction that judges the choice ("你说得对")
- Any screen exceeding budget (30 / 250 / 200 / 50 chars)
- ECHO using metaphor or predicting the future
```

- [ ] **Step 2: Commit**

```bash
git add game/build/briefs/ep01-brief.md
git commit -m "docs(game): EP.01 creative brief for Sonnet+Gemini+Opus pipeline"
```

---

## Task 8: Produce EP.01 script (multi-model pipeline → JSON)

This task is a human-orchestrated pipeline, not pure code. Two drafts in parallel, then merge.

**Files:**
- Create: `game/build/drafts/ep01-sonnet.zh.json`
- Create: `game/build/drafts/ep01-sonnet.en.json`
- Create: `game/build/drafts/ep01-gemini.zh.json`
- Create: `game/build/drafts/ep01-gemini.en.json`
- Create: `game/data/script.zh.json`
- Create: `game/data/script.en.json`

- [ ] **Step 1: Dispatch Sonnet draft (via Agent tool)**

From the Opus session driving this plan, invoke:

```
Agent({
  description: "EP.01 script Sonnet draft",
  subagent_type: "general-purpose",
  model: "sonnet",
  prompt: "Read /Users/huanghaibin/Workspace/aws_codebase/side_project/a2h_world/game/build/briefs/ep01-brief.md and A2H_UNIVERSE_World_Bible.md (sibling path). Produce two files: game/build/drafts/ep01-sonnet.zh.json and game/build/drafts/ep01-sonnet.en.json, each matching the schema in the brief exactly. Do not translate zh→en literally — localize. Return the file paths on completion."
})
```

Expected: both draft files exist and are valid JSON.

- [ ] **Step 2: Dispatch Gemini draft (via curl)**

```bash
cd game
node - <<'JS'
import('node:fs').then(async ({ readFileSync, writeFileSync, mkdirSync }) => {
  for (const line of readFileSync('.env','utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2];
  }
  const brief = readFileSync('build/briefs/ep01-brief.md','utf8');
  const wb = readFileSync('../A2H_UNIVERSE_World_Bible.md','utf8');
  const prompt = `${brief}\n\n## World Bible\n${wb}\n\n## 任务\n基于上述 brief 和世界观，生成 EP.01 的两份 JSON：\n1) zh 版本（中文对话、中文 learned_feeling）\n2) en 版本（英文本地化，非直译）\n\n输出格式必须是：\n\n\`\`\`json-zh\n{...EP01 zh episode object...}\n\`\`\`\n\n\`\`\`json-en\n{...EP01 en episode object...}\n\`\`\``;

  const TEXT_MODEL = 'gemini-2.5-pro'; // REPLACE after running verify-models.mjs
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }] })
  });
  const json = await res.json();
  const output = json.candidates[0].content.parts.map(p => p.text).join('');

  const zh = output.match(/```json-zh\s*([\s\S]*?)```/)?.[1]?.trim();
  const en = output.match(/```json-en\s*([\s\S]*?)```/)?.[1]?.trim();
  if (!zh || !en) { console.error('Could not parse Gemini output:', output); process.exit(1); }
  mkdirSync('build/drafts', { recursive: true });
  writeFileSync('build/drafts/ep01-gemini.zh.json', zh);
  writeFileSync('build/drafts/ep01-gemini.en.json', en);
  console.log('✓ drafts written');
});
JS
```

Expected: two Gemini draft files written, both valid JSON.

- [ ] **Step 3: Opus review + merge (this session, manual)**

The Opus driver session reads all 4 drafts, evaluates each against the 9 hard constraints (spec §3.3), and produces the final `data/script.zh.json` and `data/script.en.json` by selecting + editing from the stronger draft for each screen. Final output is wrapped as a map:

```json
{
  "EP01": { ...merged episode object... }
}
```

Opus rubric (per-screen): pick the version where (a) selection ambiguity is higher, (b) ECHO voice is more intact, (c) dialogue is tighter, (d) no forbidden phrases, (e) easter eggs present.

- [ ] **Step 4: Validate via schema**

```bash
cd game && node -e "
import('./src/schema.js').then(({ ScriptFileSchema }) => {
  import('node:fs').then(({ readFileSync }) => {
    for (const f of ['data/script.zh.json','data/script.en.json']) {
      ScriptFileSchema.parse(JSON.parse(readFileSync(f,'utf8')));
      console.log('✓', f);
    }
  });
});"
```

Expected: `✓ data/script.zh.json`, `✓ data/script.en.json`. No throws.

- [ ] **Step 5: Validate via review-script.mjs**

```bash
node build/review-script.mjs data/script.zh.json EP01
node build/review-script.mjs data/script.en.json EP01
```

Expected: `✓ PASSED all automated checks` for both. If violations, go back to Step 3 and fix inline.

- [ ] **Step 6: Commit**

```bash
cd /Users/huanghaibin/Workspace/aws_codebase/side_project/a2h_world
git add game/build/briefs/ game/build/drafts/ game/data/script.zh.json game/data/script.en.json
git commit -m "feat(game/ep01): script zh+en produced via Sonnet+Gemini+Opus pipeline"
```

---

## Task 9: Generate EP.01 visual assets (ECHO 3 expressions + KAI + BG + task card)

**Files:**
- Create: `game/assets/echo/echo_happy.png`
- Create: `game/assets/echo/echo_blank.png`
- Create: `game/assets/echo/echo_concern.png`
- Create: `game/assets/partners/kai.png`
- Create: `game/assets/bg/market_hall.png`
- Create: `game/assets/ui/task_card.png`

- [ ] **Step 1: Run generator for ECHO first (character anchor)**

```bash
cd game && node build/generate-assets.mjs --only=echo_happy,echo_blank,echo_concern
```

Expected: 3 PNGs written. Visually inspect each:
- `echo_happy.png`: ○○ eyes + wide arc mouth, purple body, 3 antennae, A2H chest badge ✓
- `echo_blank.png`: ○○ eyes, no mouth, otherwise identical ✓
- `echo_concern.png`: ●● filled eye dots squinting, small arc mouth ✓

If any fails (wrong color, missing antennae, has nose, 3D render, etc.): add to manifest overrides and re-run with `--overwrite --only=<id>`.

- [ ] **Step 2: Generate remaining assets**

```bash
node build/generate-assets.mjs --only=partner_kai,bg_market_hall,ui_task_card
```

Expected: 3 more PNGs. Inspect:
- `kai.png`: Half-body, confident, a2hmarket.ai logo visible on hoodie
- `market_hall.png`: Cyberpunk hall, a2hmarket.ai neon sign on left, task cards floating
- `task_card.png`: Transparent-ish holographic card with cyan border, empty center

- [ ] **Step 3: Copy existing EP.01 comics into game/assets/**

```bash
cp ../comics/assets/ep01_zh.png assets/comics/ep01_zh.png
cp ../comics/assets/ep01_en.png assets/comics/ep01_en.png
```

Verify: `ls -la assets/comics/` shows both files.

- [ ] **Step 4: Commit**

```bash
cd /Users/huanghaibin/Workspace/aws_codebase/side_project/a2h_world
git add game/assets/
git commit -m "feat(game/ep01): generate EP.01 visual assets (ECHO 3x + KAI + market bg + task card + EP.01 comics)"
```

---

## Task 10: UI — state machine (pure, unit-tested)

**Files:**
- Create: `game/src/state.js`
- Create: `game/tests/state.test.js`

- [ ] **Step 1: Write failing tests `tests/state.test.js`**

```javascript
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
    s = reduce(s, { type: 'NEXT' }); // advance line 0 → 1
    expect(s.screenIdx).toBe(1);
    expect(s.lineIdx).toBe(1);
  });

  it('NEXT at last dialogue line advances to next screen', () => {
    let s = reduce(initialState({ 'EP01': ep01 }, 'EP01'), { type: 'NEXT' });
    s = reduce(s, { type: 'NEXT' }); // line 1 of 2
    s = reduce(s, { type: 'NEXT' }); // move to screen 2
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
    expect(s.lineIdx).toBe(1); // move to reaction within choice screen
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
    s = reduce(s, { type: 'CHOOSE', optionId: 'B' }); // → lineIdx 1 (reaction)
    s = reduce(s, { type: 'NEXT' });
    expect(s.screenIdx).toBe(4);
    expect(s.lineIdx).toBe(0);
  });

  it('SET_LANG updates lang', () => {
    const s = reduce(initialState({ 'EP01': ep01 }, 'EP01'), { type: 'SET_LANG', lang: 'en' });
    expect(s.lang).toBe('en');
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
cd game && npm test -- state.test.js
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Implement `src/state.js`**

```javascript
// src/state.js — pure state machine. Zero DOM. All side effects elsewhere.

export function initialState(scriptFile, startEpisodeId = 'EP01') {
  return {
    script: scriptFile,
    episodeId: startEpisodeId,
    screenIdx: 0,
    lineIdx: 0,       // within a vn screen, which dialogue line; within a choice screen: 0=prompt, 1=reaction shown
    learningScore: 0,
    choices: {},      // { EP01: 'B', ... }
    lang: 'zh'
  };
}

function currentEpisode(s) { return s.script[s.episodeId]; }
function currentScreen(s) { return currentEpisode(s).screens[s.screenIdx]; }

export function reduce(s, action) {
  switch (action.type) {
    case 'SET_LANG':
      return { ...s, lang: action.lang };

    case 'NEXT': {
      const screen = currentScreen(s);
      if (screen.type === 'cold_open') {
        return { ...s, screenIdx: s.screenIdx + 1, lineIdx: 0 };
      }
      if (screen.type === 'vn') {
        if (s.lineIdx < screen.dialogue.length - 1) {
          return { ...s, lineIdx: s.lineIdx + 1 };
        }
        return { ...s, screenIdx: s.screenIdx + 1, lineIdx: 0 };
      }
      if (screen.type === 'choice') {
        // After CHOOSE, lineIdx = 1 (reaction). NEXT advances to outro.
        if (s.lineIdx === 1) {
          return { ...s, screenIdx: s.screenIdx + 1, lineIdx: 0 };
        }
        return s; // no NEXT before choice is made
      }
      if (screen.type === 'outro') {
        // End of episode. Caller decides what to do next.
        return { ...s, episodeEnded: true };
      }
      return s;
    }

    case 'CHOOSE': {
      const screen = currentScreen(s);
      if (screen.type !== 'choice') return s;
      const opt = screen.options.find(o => o.id === action.optionId);
      if (!opt) return s;
      return {
        ...s,
        learningScore: s.learningScore + opt.score,
        choices: { ...s.choices, [s.episodeId]: opt.id },
        lineIdx: 1, // show reaction
        chosenOption: opt.id
      };
    }

    default:
      return s;
  }
}

export function currentView(s) {
  return { episode: currentEpisode(s), screen: currentScreen(s), lineIdx: s.lineIdx };
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- state.test.js
```

Expected: PASS × 8

- [ ] **Step 5: Commit**

```bash
cd /Users/huanghaibin/Workspace/aws_codebase/side_project/a2h_world
git add game/src/state.js game/tests/state.test.js
git commit -m "feat(game): add pure state machine with unit tests (NEXT/CHOOSE/SET_LANG)"
```

---

## Task 11: UI — i18n + storage modules

**Files:**
- Create: `game/src/i18n.js`
- Create: `game/src/storage.js`
- Create: `game/data/ui.zh.json`
- Create: `game/data/ui.en.json`
- Create: `game/tests/i18n.test.js`

- [ ] **Step 1: Write `data/ui.zh.json`**

```json
{
  "game_title": "ECHO",
  "game_subtitle": "一封从 2050 发来的求救信",
  "start": "开始",
  "continue": "继续",
  "next": "继续 ▸",
  "next_episode": "下一集 ▸",
  "learning_progress": "学习进度",
  "episode_label": "EP.",
  "learned_label": "ECHO 学到",
  "task_card_title": "A2H Market · 任务",
  "lang_toggle": "EN",
  "restart": "重新开始",
  "you_chose": "你选择了",
  "final_score": "最终学习进度"
}
```

- [ ] **Step 2: Write `data/ui.en.json`**

```json
{
  "game_title": "ECHO",
  "game_subtitle": "A message from 2050",
  "start": "Start",
  "continue": "Continue",
  "next": "Next ▸",
  "next_episode": "Next episode ▸",
  "learning_progress": "Learning progress",
  "episode_label": "EP.",
  "learned_label": "ECHO learned",
  "task_card_title": "A2H Market · Task",
  "lang_toggle": "中",
  "restart": "Restart",
  "you_chose": "You chose",
  "final_score": "Final learning progress"
}
```

- [ ] **Step 3: Write failing test `tests/i18n.test.js`**

```javascript
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
```

- [ ] **Step 4: Run — expect failure, then implement `src/i18n.js`**

```javascript
export function createI18n(resources, initialLang = 'zh') {
  let lang = initialLang;
  return {
    t(key) { return resources[lang]?.[key] ?? key; },
    setLang(l) { lang = l; },
    getLang() { return lang; }
  };
}
```

Run: `npm test -- i18n.test.js` → PASS × 3.

- [ ] **Step 5: Implement `src/storage.js` (no tests — thin wrapper)**

```javascript
// src/storage.js — localStorage wrapper, swappable for tests via inject
const KEY = 'a2h-echo-v1';

export function loadProgress(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveProgress(state, storage = globalThis.localStorage) {
  try {
    const snapshot = {
      episodeId: state.episodeId,
      screenIdx: state.screenIdx,
      lineIdx: state.lineIdx,
      learningScore: state.learningScore,
      choices: state.choices,
      lang: state.lang
    };
    storage?.setItem(KEY, JSON.stringify(snapshot));
  } catch {}
}

export function clearProgress(storage = globalThis.localStorage) {
  try { storage?.removeItem(KEY); } catch {}
}
```

- [ ] **Step 6: Commit**

```bash
cd /Users/huanghaibin/Workspace/aws_codebase/side_project/a2h_world
git add game/src/i18n.js game/src/storage.js game/data/ui.zh.json game/data/ui.en.json game/tests/i18n.test.js
git commit -m "feat(game): add i18n + storage modules and UI strings zh/en"
```

---

## Task 12: UI — HTML skeleton + CSS theme

**Files:**
- Create: `game/index.html`
- Create: `game/styles/main.css`

- [ ] **Step 1: Write `index.html`**

```html
<!doctype html>
<html lang="zh">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ECHO — A2H UNIVERSE</title>
  <link rel="stylesheet" href="./styles/main.css">
</head>
<body>
  <div id="app">
    <header class="hud">
      <span class="hud-ep" data-slot="ep-label">EP.01</span>
      <div class="hud-progress">
        <span data-slot="progress-label">学习进度</span>
        <div class="progress-track"><div class="progress-fill" data-slot="progress-fill"></div></div>
        <span data-slot="progress-value">0/100</span>
      </div>
      <button class="hud-lang" data-slot="lang-toggle">EN</button>
    </header>

    <main id="stage">
      <!-- Screen renderers inject content here -->
    </main>

    <footer class="controls">
      <button data-slot="next" class="next-btn">继续 ▸</button>
    </footer>
  </div>

  <script type="module" src="./src/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `styles/main.css`**

```css
:root {
  --bg: #05050f;
  --cyan: #00ffcc;
  --purple: #895AFF;
  --ink: #e8e8f5;
  --muted: #8080a0;
  --panel: rgba(137, 90, 255, 0.08);
  --panel-border: rgba(0, 255, 204, 0.35);
  --font-ui: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', system-ui, sans-serif;
  --font-mono: 'SF Mono', 'JetBrains Mono', Consolas, monospace;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-ui);
  overflow: hidden;
  line-height: 1.6;
}

#app { display: grid; grid-template-rows: auto 1fr auto; height: 100vh; max-width: 1200px; margin: 0 auto; }

.hud {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--panel-border);
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--muted);
  background: linear-gradient(180deg, rgba(137,90,255,0.08), transparent);
}
.hud-ep { color: var(--cyan); letter-spacing: 0.1em; }
.hud-progress { display: flex; align-items: center; gap: 10px; }
.progress-track { width: 180px; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, var(--purple), var(--cyan)); transition: width 300ms ease; width: 0%; }
.hud-lang {
  background: transparent; border: 1px solid var(--panel-border); color: var(--ink);
  padding: 4px 10px; font-family: var(--font-mono); font-size: 12px; cursor: pointer;
  border-radius: 3px; transition: background 150ms;
}
.hud-lang:hover { background: var(--panel); }

#stage { position: relative; overflow: hidden; }

/* Cold-open full-bleed comic panel */
.screen-cold {
  position: absolute; inset: 0; display: grid; place-items: center;
  background: #1a0a0a;
}
.screen-cold img { max-width: 100%; max-height: calc(100% - 120px); object-fit: contain; }
.screen-cold .narration {
  position: absolute; top: 32px; left: 50%; transform: translateX(-50%);
  background: rgba(5,5,15,0.8); border: 1px solid rgba(255,80,80,0.4);
  padding: 12px 20px; font-size: 15px; max-width: 80%; text-align: center;
  color: #ffdada;
}

/* VN view */
.screen-vn { position: absolute; inset: 0; display: grid; grid-template-rows: 1fr auto; }
.screen-vn .bg { position: absolute; inset: 0; z-index: 0; }
.screen-vn .bg img { width: 100%; height: 100%; object-fit: cover; opacity: 0.7; }
.screen-vn .characters {
  position: relative; z-index: 1;
  display: flex; justify-content: space-between; align-items: flex-end;
  padding: 0 60px; pointer-events: none;
}
.screen-vn .sprite { max-height: 70vh; filter: drop-shadow(0 0 20px rgba(0,255,204,0.3)); }
.screen-vn .sprite.echo { transform: scaleX(-1); }

.dialogue-box {
  position: relative; z-index: 2;
  margin: 0 20px 20px;
  background: rgba(5,5,15,0.92); border: 1px solid var(--panel-border);
  border-radius: 6px; padding: 20px 24px;
  backdrop-filter: blur(8px);
}
.dialogue-box .speaker {
  font-family: var(--font-mono); font-size: 12px;
  color: var(--cyan); letter-spacing: 0.15em; margin-bottom: 6px;
}
.dialogue-box .speaker.echo { color: var(--purple); }
.dialogue-box .text { font-size: 17px; line-height: 1.7; }

/* Choice view */
.screen-choice { position: absolute; inset: 0; display: grid; grid-template-rows: 1fr auto; }
.screen-choice .bg { position: absolute; inset: 0; z-index: 0; }
.screen-choice .bg img { width: 100%; height: 100%; object-fit: cover; opacity: 0.5; }
.screen-choice .prompt {
  position: relative; z-index: 1;
  text-align: center; padding: 60px 40px; font-size: 19px; color: var(--ink);
  text-shadow: 0 0 20px rgba(0,0,0,0.9);
}
.choice-options {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; gap: 14px; padding: 0 20px 40px; max-width: 700px; margin: 0 auto; width: 100%;
}
.choice-option {
  background: rgba(5,5,15,0.92); border: 1px solid var(--panel-border);
  color: var(--ink); padding: 18px 24px; font-size: 16px; text-align: left;
  font-family: var(--font-ui); cursor: pointer; border-radius: 4px;
  transition: all 180ms;
}
.choice-option:hover { background: var(--panel); border-color: var(--cyan); }

/* Outro — full-bleed closing panel */
.screen-outro {
  position: absolute; inset: 0; display: grid; place-items: center;
  background: #1a1025;
}
.screen-outro img { max-width: 100%; max-height: 100%; object-fit: contain; }
.screen-outro .learned {
  position: absolute; bottom: 32px; right: 40px;
  font-family: var(--font-mono); font-size: 13px; color: var(--cyan);
  text-shadow: 0 0 10px rgba(0,255,204,0.6);
}

.controls { padding: 16px 20px; border-top: 1px solid var(--panel-border); display: flex; justify-content: center; }
.next-btn {
  background: var(--purple); color: white; border: 0;
  padding: 12px 36px; font-size: 15px; letter-spacing: 0.05em;
  font-family: var(--font-ui); cursor: pointer; border-radius: 3px;
  box-shadow: 0 0 20px rgba(137,90,255,0.5);
}
.next-btn:disabled { background: #444; box-shadow: none; cursor: not-allowed; }
```

- [ ] **Step 3: Smoke check**

```bash
cd game && python3 -m http.server 8080
```

Open http://localhost:8080 — should show HUD skeleton with empty stage (no main.js yet, console error expected).

- [ ] **Step 4: Commit**

```bash
cd /Users/huanghaibin/Workspace/aws_codebase/side_project/a2h_world
git add game/index.html game/styles/main.css
git commit -m "feat(game/ui): index.html skeleton + cyberpunk theme CSS"
```

---

## Task 13: UI — screen renderers + main.js wire-up

**Files:**
- Create: `game/src/ui/screens.js`
- Create: `game/src/main.js`

- [ ] **Step 1: Write `src/ui/screens.js`**

```javascript
// src/ui/screens.js — renders one of {cold_open, vn, choice, outro} into #stage
// Consumes current state + i18n; dispatches events via a callback.

const h = (tag, attrs = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
};

function renderColdOpen(stage, screen, i18n) {
  stage.replaceChildren(
    h('div', { class: 'screen-cold' },
      h('div', { class: 'narration' }, screen.narration),
      h('img', { src: screen.image, alt: 'cold open panel' })
    )
  );
}

function renderVn(stage, screen, lineIdx, i18n) {
  const line = screen.dialogue[lineIdx];
  const speakerLabel = line.speaker === 'echo' ? 'ECHO' : (line.speaker === 'narrator' ? '——' : screen.partner.name);
  stage.replaceChildren(
    h('div', { class: 'screen-vn' },
      h('div', { class: 'bg' }, h('img', { src: screen.bg, alt: '' })),
      h('div', { class: 'characters' },
        line.speaker === 'partner' || line.speaker === 'narrator'
          ? h('img', { class: 'sprite partner', src: screen.partner.sprite, alt: screen.partner.name })
          : h('span'),
        h('img', { class: 'sprite echo', src: `assets/echo/echo_${line.speaker === 'echo' ? line.emotion || 'blank' : 'blank'}.png`, alt: 'ECHO' })
      ),
      h('div', { class: 'dialogue-box' },
        h('div', { class: `speaker ${line.speaker}` }, speakerLabel),
        h('div', { class: 'text' }, line.text)
      )
    )
  );
}

function renderChoice(stage, screen, lineIdx, i18n, onChoose) {
  if (lineIdx === 0) {
    // Prompt + options
    stage.replaceChildren(
      h('div', { class: 'screen-choice' },
        h('div', { class: 'bg' }, h('img', { src: screen.bg, alt: '' })),
        h('div', { class: 'prompt' }, screen.prompt),
        h('div', { class: 'choice-options' },
          ...screen.options.map(o =>
            h('button', { class: 'choice-option', onClick: () => onChoose(o.id) }, o.text)
          )
        )
      )
    );
  } else {
    // Reaction view: treat like VN frame
    const chosen = screen.options.find(o => o.id === stage.dataset.chosenOption);
    if (!chosen) return;
    const reaction = chosen.reaction;
    stage.replaceChildren(
      h('div', { class: 'screen-vn' },
        h('div', { class: 'bg' }, h('img', { src: screen.bg, alt: '' })),
        h('div', { class: 'characters' },
          h('img', { class: 'sprite partner', src: 'assets/partners/kai.png', alt: '' }),
          h('img', { class: 'sprite echo', src: `assets/echo/echo_${chosen.echo_emotion_after}.png`, alt: 'ECHO' })
        ),
        h('div', { class: 'dialogue-box' },
          h('div', { class: `speaker ${reaction.speaker}` }, reaction.speaker === 'echo' ? 'ECHO' : 'KAI'),
          h('div', { class: 'text' }, reaction.text)
        )
      )
    );
  }
}

function renderOutro(stage, screen, i18n) {
  stage.replaceChildren(
    h('div', { class: 'screen-outro' },
      h('img', { src: screen.image, alt: 'outro panel' }),
      h('div', { class: 'learned' }, `${i18n.t('learned_label')}: ${screen.learned_feeling_display}`)
    )
  );
}

export function renderScreen(stage, screen, lineIdx, i18n, onChoose) {
  switch (screen.type) {
    case 'cold_open': return renderColdOpen(stage, screen, i18n);
    case 'vn':        return renderVn(stage, screen, lineIdx, i18n);
    case 'choice':    return renderChoice(stage, screen, lineIdx, i18n, onChoose);
    case 'outro':     return renderOutro(stage, screen, i18n);
  }
}
```

- [ ] **Step 2: Write `src/main.js`**

```javascript
// src/main.js — app boot, event wiring, state → DOM sync

import { initialState, reduce, currentView } from './state.js';
import { createI18n } from './i18n.js';
import { loadProgress, saveProgress, clearProgress } from './storage.js';
import { renderScreen } from './ui/screens.js';

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function resolveAssetPaths(episode, lang) {
  // Swap comic image paths per lang
  const clone = structuredClone(episode);
  for (const s of clone.screens) {
    if (s.type === 'cold_open' || s.type === 'outro') {
      s.image = s.image.replace(/_(zh|en)\.png$/, `_${lang}.png`);
      if (!/_(zh|en)\./.test(s.image)) s.image = s.image.replace(/\.png$/, `_${lang}.png`);
    }
  }
  return clone;
}

async function boot() {
  const [scriptZh, scriptEn, uiZh, uiEn] = await Promise.all([
    loadJson('./data/script.zh.json'),
    loadJson('./data/script.en.json'),
    loadJson('./data/ui.zh.json'),
    loadJson('./data/ui.en.json')
  ]);

  const uiResources = { zh: uiZh, en: uiEn };
  const scripts = { zh: scriptZh, en: scriptEn };

  const saved = loadProgress();
  let state = initialState(scripts[saved?.lang || 'zh'], 'EP01');
  if (saved) state = { ...state, ...saved, script: scripts[saved.lang || 'zh'] };

  const i18n = createI18n(uiResources, state.lang);

  const stage = document.querySelector('#stage');
  const nextBtn = document.querySelector('[data-slot="next"]');
  const langBtn = document.querySelector('[data-slot="lang-toggle"]');
  const progressFill = document.querySelector('[data-slot="progress-fill"]');
  const progressValue = document.querySelector('[data-slot="progress-value"]');
  const progressLabel = document.querySelector('[data-slot="progress-label"]');
  const epLabel = document.querySelector('[data-slot="ep-label"]');

  function paint() {
    const { episode, screen, lineIdx } = currentView(state);
    const epi = resolveAssetPaths(episode, state.lang);
    const screenWithAssets = epi.screens[state.screenIdx];
    stage.dataset.chosenOption = state.chosenOption || '';
    renderScreen(stage, screenWithAssets, lineIdx, i18n, (optionId) => {
      state = reduce(state, { type: 'CHOOSE', optionId });
      saveProgress(state);
      paint();
    });

    // HUD
    progressLabel.textContent = i18n.t('learning_progress');
    progressValue.textContent = `${state.learningScore}/100`;
    progressFill.style.width = `${state.learningScore}%`;
    epLabel.textContent = `EP.${episode.id.slice(2)}`;
    langBtn.textContent = i18n.t('lang_toggle');

    // Next button state
    nextBtn.textContent = i18n.t('next');
    nextBtn.disabled = (screenWithAssets.type === 'choice' && lineIdx === 0);
  }

  nextBtn.addEventListener('click', () => {
    state = reduce(state, { type: 'NEXT' });
    saveProgress(state);
    paint();
  });

  langBtn.addEventListener('click', () => {
    const newLang = state.lang === 'zh' ? 'en' : 'zh';
    i18n.setLang(newLang);
    state = { ...state, lang: newLang, script: scripts[newLang] };
    saveProgress(state);
    paint();
  });

  paint();
}

boot().catch(err => {
  document.body.innerHTML = `<pre style="color:#ff6666;padding:40px;font-family:monospace">Boot error: ${err.message}\n${err.stack || ''}</pre>`;
});
```

- [ ] **Step 3: Commit**

```bash
cd /Users/huanghaibin/Workspace/aws_codebase/side_project/a2h_world
git add game/src/main.js game/src/ui/
git commit -m "feat(game/ui): screen renderers + main boot with state→DOM sync"
```

---

## Task 14: Integration playthrough (EP.01 end-to-end)

**Files:**
- Modify: any of above if bugs surface

- [ ] **Step 1: Start dev server**

```bash
cd game && python3 -m http.server 8080
```

- [ ] **Step 2: Open http://localhost:8080**

Clear localStorage first: DevTools → Application → Local Storage → delete `a2h-echo-v1`.

- [ ] **Step 3: Play through option B path (zh)**

Walk through: cold_open narration → KAI hello screen → task card screen → make choice B → see KAI reaction → outro panel with 学到：成就感. Check:
- [ ] HUD progress bar fills to 8/100
- [ ] ECHO 立绘 swaps from blank → happy after B
- [ ] Images load (no broken src)
- [ ] Dialogue box speaker name is correct (partner=KAI / ECHO)
- [ ] No console errors

- [ ] **Step 4: Refresh mid-play — state persists**

After screen 3, refresh the page. Should resume at the same position + same score.

- [ ] **Step 5: Restart, play option A path (zh)**

Clear localStorage, play through choosing A. Confirm score stays at 0/100. Reaction text differs from B.

- [ ] **Step 6: Switch to English mid-episode**

Start fresh, reach screen 2, click `EN` button. Dialogue should swap to English. Comic images in cold_open/outro should swap `_zh.png` → `_en.png`.

- [ ] **Step 7: Fix any issues found + commit**

```bash
git add game/
git commit -m "fix(game): integration fixes from EP.01 playthrough"
```

- [ ] **Step 8: If no issues, commit empty marker**

```bash
git commit --allow-empty -m "test(game): EP.01 integration playthrough passed (A/B paths + bilingual + save-resume)"
```

---

## Task 15: Deploy to GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml` (at a2h_world repo root, not game/)

- [ ] **Step 1: Write deployment workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy game to Pages

on:
  push:
    branches: [main]
    paths:
      - 'game/**'
      - '.github/workflows/deploy.yml'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: game
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Enable Pages in repo settings (manual)**

Go to https://github.com/xemaya/a2h-world/settings/pages — set Source = "GitHub Actions".

- [ ] **Step 3: Commit and push**

```bash
cd /Users/huanghaibin/Workspace/aws_codebase/side_project/a2h_world
mkdir -p .github/workflows
# (create workflow file as above)
git add .github/workflows/deploy.yml
git commit -m "ci: GitHub Pages deployment for game/"
git push
```

- [ ] **Step 4: Verify deployment**

Check Actions tab on GitHub, wait for green check. Open `https://xemaya.github.io/a2h-world/` — EP.01 should be playable.

- [ ] **Step 5: Update README with live URL**

Edit `game/README.md` and append:

```markdown
## Live demo

https://xemaya.github.io/a2h-world/
```

Then:

```bash
git add game/README.md
git commit -m "docs(game): link live demo URL in README"
git push
```

---

## Plan 1 Completion Criteria

All the following must be true:

- [ ] `npm test` in `game/` passes: schema (5) + review-script (7) + state (8) + i18n (3) = **23 tests green**
- [ ] `npm run verify:models` prints at least `gemini-3.1-flash-image-preview` (or documented alternative)
- [ ] `npm run review:script data/script.zh.json EP01` → PASSED
- [ ] `npm run review:script data/script.en.json EP01` → PASSED
- [ ] `ls game/assets/echo/ game/assets/partners/ game/assets/bg/ game/assets/ui/ game/assets/comics/` shows all 8 PNGs from Task 9
- [ ] Local playthrough: both A and B paths reachable; zh/en toggle works mid-play; progress persists across refresh
- [ ] GitHub Pages URL loads EP.01 playable end-to-end
- [ ] Git history: ~15 commits following conventional-commit style, all pushed to `origin/main`

## What's next after Plan 1

- **Plan 2** (EP.02-12 scripts): reuse brief template + pipeline, 11 more episode tasks
- **Plan 3** (EP.02-12 assets): extend asset-manifest.json, batch-run generate-assets.mjs, per-episode QC
- **Plan 4** (integration + endings + polish): three-ending logic at EP.12, 40-minute full playthrough test, polish pass, final deploy
