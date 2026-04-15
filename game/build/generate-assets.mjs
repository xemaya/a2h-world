// build/generate-assets.mjs — batch-generate images via Google's Gemini image model
// Supports --only=<id1,id2> to regenerate specific assets, --overwrite, --dry-run.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
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
const argv = process.argv.slice(2);
const only = (argv.find(a => a.startsWith('--only=')) || '').replace('--only=', '').split(',').filter(Boolean);
const overwrite = argv.includes('--overwrite');
const dryRun = argv.includes('--dry-run');

if (!KEY && !dryRun) { console.error('GEMINI_API_KEY not set'); process.exit(1); }

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
    const refPath = pathResolve(root, a.reference_image);
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
