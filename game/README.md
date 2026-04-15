# A2H ECHO — Game

Single-page text AVG. See `../docs/specs/` for design and `../docs/superpowers/plans/` for implementation plans.

## Live demo

https://xemaya.github.io/a2h-world/ — EP.01 playable (zh/en), 40-min full season lands in Plans 2–4.

## Dev

```bash
cp .env.example .env   # fill in GEMINI_API_KEY
npm install
npm run dev            # serves at http://localhost:8080
npm test
```

## Asset pipeline (build-time only)

Image generation uses Google's Gemini image model (`gemini-3.1-flash-image-preview`, internally nicknamed "nano-banana") via REST. No separate CLI to install — just set `GEMINI_API_KEY` in `.env`.

```bash
npm run verify:models        # list available Gemini models, confirm the expected names
npm run gen:assets           # batch-generate images via Gemini image API
npm run review:script        # validate script JSON against 9 hard constraints from spec §3.3
```
