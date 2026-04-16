# Episode Build Pipeline — Design Spec

**Date:** 2026-04-16
**Status:** Approved
**Goal:** One command to go from story outline to playable episode.

---

## Overview

A single orchestrator (`build-episode.mjs`) drives a 4-step pipeline:

```
outline.md → gen-script → scan-assets → gen-assets → validate → done
```

All content is data-driven. Creators write a markdown outline; the pipeline generates script JSON, identifies missing assets, generates them via Gemini API, and validates the result.

## CLI Interface

```bash
# Full build
npm run build:episode -- --outline=build/briefs/ep02-brief.md

# Resume from failure
npm run build:episode -- --resume

# Single step
npm run build:episode -- --step=gen-script --outline=build/briefs/ep02-brief.md
npm run build:episode -- --step=scan-assets
npm run build:episode -- --step=gen-assets
npm run build:episode -- --step=validate

# Regenerate specific assets
npm run build:episode -- --step=gen-assets --only=echo_surprise,ep02_silver_shop
```

## File Structure (new/modified files)

```
game/
├── build/
│   ├── build-episode.mjs          ← orchestrator (new)
│   ├── steps/
│   │   ├── gen-script.mjs         ← step 1: outline → script JSON (new)
│   │   ├── scan-assets.mjs        ← step 2: find missing assets (new)
│   │   ├── gen-assets.mjs         ← step 3: generate missing assets (refactor existing)
│   │   └── validate.mjs           ← step 4: full validation (new)
│   ├── briefs/                    ← outline directory (exists, has ep01-brief.md)
│   └── cache/                     ← build intermediates
│       ├── checkpoint.json        ← resume state
│       └── asset-needs.json       ← missing asset manifest
├── data/
│   ├── characters.json            ← character registry (new)
│   ├── script.zh.json             ← episodes (existing, appended to)
│   └── script.en.json
└── assets/
    ├── echo/                      ← ECHO emotion sprites
    ├── partners/                  ← partner character sprites
    └── bg/                        ← scene backgrounds
```

## 1. Outline Format (`briefs/epXX-brief.md`)

Creators write markdown. No technical fields (sprite paths, emotion tags, etc.).

```markdown
# EP.02 ECHO 学会：团队分工

## 设定
- 场景：A2H Market 交易大厅，一个银饰店的线上任务
- 任务：60分钟内为银饰店写出小红书关键词方案
- 搭档：KAI

## 剧情大纲
1. 【开场旁白】2050年的画面：Agent 独自完成所有工作，人类被边缘化
2. 【VN场景1】KAI 接到银饰店任务，ECHO 提议帮忙
3. 【VN场景2】协作过程：KAI 负责审美，ECHO 负责数据分析
4. 【选择】任务快完成时，客户临时加需求
   - A: 直接按数据最优方案执行（效率优先）
   - B: 问 KAI 的意见，一起调整方案（协作优先）
5. 【结尾】任务完成，ECHO 学到新感受——「默契」

## ECHO 学到的感受
默契 / Synergy
```

## 2. Character Registry (`data/characters.json`)

Single source of truth for all characters: visual description, available emotions, sprite paths.

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

Adding a new character = adding one entry here with a `character_lock` prompt. The pipeline handles the rest.

## 3. Step 1: gen-script

**Input:** `briefs/epXX-brief.md` + `characters.json` + World Bible constraints
**Output:** New episode appended to `script.zh.json` and `script.en.json`

### LLM calls (Gemini API — text model, e.g. `gemini-2.5-flash`)

**Call 1 — Generate Chinese script JSON:**

System prompt contains:
- World Bible 5 inviolable rules
- Relevant character info from `characters.json`
- Script JSON schema (screen type definitions, field requirements)
- EP.01 as few-shot example

User prompt: outline markdown content.

Output: A valid episode JSON with:
- `speaker` + `emotion` tags per dialogue line (LLM infers from context)
- `bg` field as text description (not a path yet)
- `learned_feeling` and `learned_feeling_display`

**Call 2 — Translate to English:**

Input: the Chinese episode JSON. Translate all `text`, `narration`, `prompt` fields. Keep structure and non-text fields unchanged.

### Background path resolution

After generation, gen-script resolves `bg` descriptions to file paths:
1. Check existing backgrounds in `assets/bg/` against their descriptions in `asset-manifest.json`
2. Match found → fill existing path (e.g., `assets/bg/market_hall.png`)
3. No match → fill a conventional path (e.g., `assets/bg/ep02_silver_shop.png`), mark as pending generation

### Emotion handling

Compare each `emotion` tag against the character's `emotions` list in `characters.json`:
- Known emotion → use as-is
- New emotion → keep the tag; scan-assets will flag the missing sprite

### Output validation

After generation:
- JSON schema validity
- Screen type order follows convention (story_intro → cold_open → vn... → choice → outro)
- Choice has exactly 2 options
- zh/en dialogue line counts match

Validation failure → retry once with lower temperature. Second failure → stop, output intermediate file for manual correction.

## 4. Step 2: scan-assets

**Input:** `script.zh.json` + `characters.json` + `assets/` directory
**Output:** `build/cache/asset-needs.json`

Scans all episodes, collects three asset types:
- **Backgrounds:** `screen.bg`, `screen.image`
- **Character sprites:** inferred from `speaker` + `emotion` via `characters.json` patterns
- **Comic covers:** `assets/comics/epXX_{zh,en}.png`

Compares against filesystem. Output:

```json
{
  "missing": [
    {
      "type": "sprite",
      "character": "echo",
      "emotion": "surprise",
      "output": "assets/echo/echo_surprise.png",
      "prompt_context": "ECHO expression: surprised, eyes wide, antennae raised"
    },
    {
      "type": "background",
      "scene": "Silver jewelry workshop close-up",
      "output": "assets/bg/ep02_silver_shop.png",
      "prompt_context": "Cyberpunk silver jewelry workbench, neon-lit fine silverware"
    }
  ],
  "existing": ["assets/bg/market_hall.png", "assets/echo/echo_blank.png"]
}
```

## 5. Step 3: gen-assets

**Input:** `build/cache/asset-needs.json` + `characters.json`
**Output:** `assets/**/*.png`

### Generation strategy by type

**Sprites:**
- Take `character_lock` from `characters.json`
- Compose prompt: `"{character_lock}. Expression: {emotion}. {prompt_context}. Transparent background."`
- Call Gemini `generateContent`, decode base64, save PNG
- After success: update `characters.json` emotions list (append new emotion)

**Backgrounds:**
- Compose prompt: `"{prompt_context}. {common cyberpunk style}. 16:9 aspect ratio, no transparency."`
- No character_lock used

**Comic covers:**
- Skip with warning (require more precise control, manual creation recommended)

### Error handling

- Max 2 retries per image
- Single image failure does not block others
- Final report: N succeeded, M failed, with paths and reasons
- All failed → stop pipeline; partial failure → continue to validate

## 6. Step 4: validate

**Input:** `script.*.json` + `characters.json` + `assets/` directory
**Output:** Exit code 0 (pass) or exit code 1 + error report (fail)

| Check | Description |
|-------|-------------|
| Asset completeness | Every sprite/bg referenced in scripts exists on disk |
| Schema validity | Every episode conforms to screen type conventions |
| zh/en consistency | Episode count, screen count, dialogue line counts match |
| Emotion coverage | `characters.json` emotions list matches actual sprite files |
| Choice completeness | Choice screens have exactly 2 options, each with a reaction |
| Slogan present | Outro screen has `learned_feeling_display` |

## 7. Orchestrator (`build-episode.mjs`)

Runs steps 1-4 sequentially. Features:

**Checkpointing:**
- After each step, writes `cache/checkpoint.json` with `{ episodeId, completedSteps: [...] }`
- `--resume` reads checkpoint and skips completed steps

**Episode ID inference:**
- Reads existing `script.zh.json`, finds highest EP number, increments by 1
- Or reads from outline `# EP.XX` heading if explicitly set

**Logging:**
- Each step prefixed with step number and emoji
- Timing per step
- Final summary: success or failure with actionable error messages

## 8. Runtime engine changes

One change needed in the game engine to support the new data model:

**`screens.js` — dynamic sprite resolution:**

Current (hardcoded):
```javascript
src: `assets/echo/echo_${echoEmotion || 'blank'}.png`
```

New (from characters.json, loaded at boot):
```javascript
src: resolveSpritePath(characters, speaker, emotion)
```

`resolveSpritePath` reads `sprite_dir` + `sprite_pattern` from `characters.json` and substitutes the emotion. Falls back to `blank`/`default` if the emotion sprite doesn't exist.

This is the only engine code change required. Everything else is build tooling.

## 9. package.json additions

```json
{
  "scripts": {
    "build:episode": "node build/build-episode.mjs",
    "validate": "node build/steps/validate.mjs"
  }
}
```

Existing scripts (`dev`, `test`, `gen:assets`, `review:script`) remain unchanged.
