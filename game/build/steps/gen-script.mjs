// game/build/steps/gen-script.mjs
import { readFileSync, writeFileSync } from 'node:fs';
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

  const existingScript = JSON.parse(readFileSync(resolve(root, 'data/script.zh.json'), 'utf8'));
  const existingEpisode = existingScript.EP01 || null;

  console.log('  Generating Chinese script...');
  const systemPrompt = buildSystemPrompt(characters, existingEpisode);
  const userPrompt = `Generate episode ${episodeId} from this outline:\n\n${outline}`;

  let zhText = await geminiText(TEXT_MODEL, systemPrompt, userPrompt, key, { temperature: 0.7 });
  zhText = zhText.replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim();

  let zhEpisode;
  try {
    zhEpisode = JSON.parse(zhText);
  } catch (err) {
    console.log('  First attempt failed to parse, retrying...');
    zhText = await geminiText(TEXT_MODEL, systemPrompt, userPrompt, key, { temperature: 0.3 });
    zhText = zhText.replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim();
    zhEpisode = JSON.parse(zhText);
  }

  zhEpisode.id = episodeId;
  existingScript[episodeId] = zhEpisode;
  writeFileSync(resolve(root, 'data/script.zh.json'), JSON.stringify(existingScript, null, 2));
  console.log(`  ✓ Chinese script saved (${episodeId})`);

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
