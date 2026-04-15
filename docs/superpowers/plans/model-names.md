# Confirmed Gemini Model Names (as of 2026-04-15)

Captured by `game/build/verify-models.mjs` run. Refresh if generation tasks fail with "model not found".

## Image generation

- **Primary**: `gemini-3.1-flash-image-preview`
- **Fallback candidates** (if primary 404s): `gemini-3-pro-image-preview`, `gemini-2.5-flash-image`, `imagen-4.0-generate-001`, `imagen-4.0-ultra-generate-001`, `imagen-4.0-fast-generate-001`

## Text generation (for EP.01+ script Gemini draft leg)

- **Primary**: `gemini-3.1-pro-preview`
- **Rationale**: Newest non-experimental pro model in the 3.x line; higher capability ceiling than 2.5-pro for creative script drafting

## Full raw output (appendix, for reference)

```
=== IMAGE MODELS ===
  gemini-2.5-flash-image
  gemini-3-pro-image-preview
  gemini-3.1-flash-image-preview
  imagen-4.0-generate-001
  imagen-4.0-ultra-generate-001
  imagen-4.0-fast-generate-001

=== TEXT MODELS (gemini-2.x / 3.x) ===
  gemini-2.5-flash
  gemini-2.5-pro
  gemini-2.0-flash
  gemini-2.0-flash-001
  gemini-2.0-flash-lite-001
  gemini-2.0-flash-lite
  gemini-2.5-flash-lite
  gemini-3-pro-preview
  gemini-3-flash-preview
  gemini-3.1-pro-preview
  gemini-3.1-pro-preview-customtools
  gemini-3.1-flash-lite-preview
  gemini-2.5-computer-use-preview-10-2025
  gemini-2.5-flash-native-audio-latest
  gemini-2.5-flash-native-audio-preview-09-2025
  gemini-2.5-flash-native-audio-preview-12-2025

Expected image model "gemini-3.1-flash-image-preview": FOUND
```
