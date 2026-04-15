# Writing Pipeline

Jin_Cocoon-inspired multi-agent pipeline for A2H ECHO episode scripts.

## Structure

```
writing/
├── state/
│   ├── experience.json         ← accumulated rules (update after each episode)
│   ├── outline-ep0X.md         ← per-episode outline (Planner output)
│   └── episode_summaries/      ← per-episode summaries (for next-ep context)
├── pipeline/prompts/
│   ├── planner.md              ← role prompt for Planner (Opus, orchestrator)
│   ├── generator.md            ← role prompt for Generator A (Sonnet) + B (Gemini)
│   ├── literary-reviewer.md    ← role prompt for Literary Reviewer (Opus)
│   └── reader.md               ← role prompt for Reader (Opus, plays as target audience)
├── drafts/                     ← generator outputs land here (ep0X-sonnet.zh.json, ep0X-gemini.zh.json)
└── reviews/                    ← literary + reader reports land here
```

## Pipeline (per episode)

```
0. [Opus] Read World Bible + previous ep summaries + experience.json
1. [Opus Planner] Write outline-ep0X.md — 3-act with explicit causal chain
2. [parallel] Sonnet draft + Gemini-3 draft → drafts/ep0X-{sonnet,gemini}.zh.json
3. [auto] Mechanical review (build/review-script.mjs)
4. [Opus Literary Reviewer] 6-point check per draft → PASS or FAIL with feedback
   - FAIL → feedback back to Generator (same model), max 2 rounds
5. [Opus] Merge best-of into data/script.zh.json EP0X (whole-segment rewrite for conflicts, no Frankenstein stitching)
6. [Opus Reader] Playthrough zh, score ≥ 4.5 → proceed, else → back to Planner step 1
7. [Gemini] Independent en localization based on final zh → drafts/ep0X-gemini.en.json → merge
8. [Opus Experience Manager] Extract rules learned → experience.json
```

## Dispatch commands

Each role is invoked as a prompt to the appropriate model. Paths are relative to this README.

### Planner (manual, by Opus orchestrator)
Read the 5 listed files, then produce `state/outline-ep0X.md` following the template in `pipeline/prompts/planner.md`.

### Generator (Agent tool or direct API)
- Sonnet: `Agent(subagent_type=general-purpose, model=sonnet, prompt=pipeline/prompts/generator.md + outline + output path)`
- Gemini: `node build/gen-gemini-script.mjs EP0X zh` (script to be added in P4)

### Literary Reviewer (Opus in main session)
Read both drafts + outline + experience.json. For each draft, write `reviews/ep0X-review-{A|B}-round{N}.md`.

### Reader (Opus in main session)
Play the merged zh script via browser (or dry-read). Write `reviews/ep0X-reader-round{N}.md`.

### Experience Manager (Opus)
At end of episode, propose rule additions to `state/experience.json` with `source: "EP0X"`.
