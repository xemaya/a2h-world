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
