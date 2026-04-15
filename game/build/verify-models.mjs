// build/verify-models.mjs — lists Gemini models matching image+text patterns and verifies expected IDs
import { readFileSync } from 'node:fs';

// Load .env manually (no external dep)
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
