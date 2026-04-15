// build/review-script.mjs — static compliance check against 9 hard constraints from spec §3.3
import { readFileSync } from 'node:fs';

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
  if ((ep.screens[0].narration || '').length > 30) v('word_budget', `cold_open narration ${ep.screens[0].narration.length} > 30`);
  const mid = countChars(ep.screens, [1, 2]);
  if (mid > 250) v('word_budget', `vn screens 2+3 total ${mid} > 250`);
  const ch = ep.screens[3];
  const choiceLen = (ch.prompt || '').length
    + ch.options.reduce((a, o) => a + o.text.length + o.reaction.text.length, 0);
  if (choiceLen > 200) v('word_budget', `choice screen total ${choiceLen} > 200`);
  if ((ep.screens[4].learned_feeling_display || '').length > 50) v('word_budget', `outro display > 50`);

  // Rule C.6 — forbidden AI-slop phrases
  for (const line of allLines) {
    for (const p of forbidden) {
      const re = new RegExp(p);
      if (re.test(line.text)) v('forbidden_phrase', `"${p}" in ${line.screen} (${line.speaker}): ${line.text}`);
    }
  }

  // Rule A.1 — ECHO voice: each vn screen with ECHO dialogue must contain a mandatory phrase
  for (const s of ep.screens) {
    if (!s.dialogue) continue;
    const screenEchoLines = s.dialogue.filter(d => d.speaker === 'echo');
    if (screenEchoLines.length === 0) continue;
    const hasMandatory = screenEchoLines.some(d => echoMandatory.some(p => d.text.includes(p)));
    if (!hasMandatory) v('echo_voice', `screen ${s.type} has ECHO lines but none contain mandatory phrase ${JSON.stringify(echoMandatory)}`);
  }

  // Rule B.4 — reaction after choice must not be judgmental
  for (const o of ch.options) {
    for (const j of judgmental) {
      if (o.reaction.text.toLowerCase().includes(j.toLowerCase())) {
        v('ambiguous_choice', `option ${o.id} reaction judgmental ("${j}"): ${o.reaction.text}`);
      }
    }
  }

  // Rule C.5 — lesson must not be spelled out
  for (const line of allLines) {
    if (lessonSpelled.test(line.text)) v('feeling_spelled_out', `${line.screen} (${line.speaker}): ${line.text}`);
  }

  // Required locked terms must appear at least once
  for (const term of requireLockedTermsAtLeastOnce) {
    const found = allLines.some(l => l.text.includes(term));
    if (!found) v('locked_term_missing', `required term "${term}" not present in any line`);
  }

  return { passed: violations.length === 0, violations };
}

// CLI: node build/review-script.mjs data/script.zh.json EP01
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
