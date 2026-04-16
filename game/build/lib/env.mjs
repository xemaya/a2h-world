// game/build/lib/env.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GAME_ROOT = resolve(__dirname, '../..');

export function loadEnv() {
  try {
    const env = readFileSync(resolve(GAME_ROOT, '.env'), 'utf8');
    for (const line of env.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
}

export function requireKey(name) {
  if (!process.env[name]) {
    console.error(`ERROR: ${name} not set. Add it to game/.env`);
    process.exit(1);
  }
  return process.env[name];
}

export { GAME_ROOT };
