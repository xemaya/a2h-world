// game/build/build-episode.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv, GAME_ROOT } from './lib/env.mjs';
import { genScript } from './steps/gen-script.mjs';
import { scanAssets } from './steps/scan-assets.mjs';
import { genAssets } from './steps/gen-assets.mjs';
import { validate } from './steps/validate.mjs';

const CACHE_DIR = resolve(GAME_ROOT, 'build/cache');
const CHECKPOINT_PATH = resolve(CACHE_DIR, 'checkpoint.json');

function parseArgs(argv) {
  const args = { outline: null, resume: false, step: null, only: null };
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--outline=')) args.outline = arg.slice('--outline='.length);
    if (arg === '--resume') args.resume = true;
    if (arg.startsWith('--step=')) args.step = arg.slice('--step='.length);
    if (arg.startsWith('--only=')) args.only = arg.slice('--only='.length);
  }
  return args;
}

function inferEpisodeId() {
  const scriptPath = resolve(GAME_ROOT, 'data/script.zh.json');
  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
  const ids = Object.keys(script).map(k => parseInt(k.replace('EP', ''), 10)).filter(n => !isNaN(n));
  const next = ids.length > 0 ? Math.max(...ids) + 1 : 1;
  return `EP${String(next).padStart(2, '0')}`;
}

function readCheckpoint() {
  if (!existsSync(CHECKPOINT_PATH)) return null;
  return JSON.parse(readFileSync(CHECKPOINT_PATH, 'utf8'));
}

function writeCheckpoint(episodeId, completedSteps) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CHECKPOINT_PATH, JSON.stringify({ episodeId, completedSteps, timestamp: new Date().toISOString() }, null, 2));
}

function clearCheckpoint() {
  if (existsSync(CHECKPOINT_PATH)) unlinkSync(CHECKPOINT_PATH);
}

const STEPS = ['gen-script', 'scan-assets', 'gen-assets', 'validate'];

async function main() {
  loadEnv();
  const args = parseArgs(process.argv);

  let episodeId;
  let completedSteps = [];
  let outline = args.outline;

  if (args.resume) {
    const cp = readCheckpoint();
    if (!cp) {
      console.error('No checkpoint found. Run without --resume first.');
      process.exit(1);
    }
    episodeId = cp.episodeId;
    completedSteps = cp.completedSteps;
    console.log(`Resuming ${episodeId} from after: ${completedSteps.join(', ') || 'start'}`);
  }

  if (args.step) {
    if (!STEPS.includes(args.step)) {
      console.error(`Unknown step: ${args.step}. Valid: ${STEPS.join(', ')}`);
      process.exit(1);
    }
  }

  if (!episodeId) {
    if (outline) {
      const text = readFileSync(resolve(GAME_ROOT, outline), 'utf8');
      const match = text.match(/^#\s+(EP\.?\d+)/mi);
      episodeId = match ? match[1].replace('.', '').replace('EP', 'EP') : inferEpisodeId();
      episodeId = episodeId.replace('.', '');
    } else {
      episodeId = inferEpisodeId();
    }
  }

  console.log(`\n🎮 Building episode: ${episodeId}\n`);

  const shouldRun = (step) => {
    if (args.step) return args.step === step;
    return !completedSteps.includes(step);
  };

  if (shouldRun('gen-script')) {
    if (!outline) {
      console.error('--outline is required for gen-script step.');
      process.exit(1);
    }
    const start = Date.now();
    console.log('📝 Step 1/4: Generating script...');
    await genScript(outline, episodeId);
    console.log(`  Done in ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
    completedSteps.push('gen-script');
    writeCheckpoint(episodeId, completedSteps);
  }

  if (shouldRun('scan-assets')) {
    const start = Date.now();
    console.log('🔍 Step 2/4: Scanning assets...');
    const result = await scanAssets();
    console.log(`  Found ${result.missing.length} missing, ${result.existing.length} existing`);
    console.log(`  Done in ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
    completedSteps.push('scan-assets');
    writeCheckpoint(episodeId, completedSteps);
  }

  if (shouldRun('gen-assets')) {
    const needsPath = resolve(GAME_ROOT, 'build/cache/asset-needs.json');
    if (!existsSync(needsPath)) {
      console.log('⏭ No asset-needs.json found, running scan first...');
      await scanAssets();
    }
    const needs = JSON.parse(readFileSync(needsPath, 'utf8'));

    if (needs.missing.length === 0) {
      console.log('✅ Step 3/4: All assets exist, skipping generation.\n');
    } else {
      const start = Date.now();
      console.log(`🎨 Step 3/4: Generating ${needs.missing.length} assets...`);
      const result = await genAssets(undefined, { only: args.only });
      console.log(`  Succeeded: ${result.succeeded}, Failed: ${result.failed}`);
      if (result.failures.length > 0) {
        for (const f of result.failures) console.log(`  ⚠ ${f.path}: ${f.error}`);
      }
      console.log(`  Done in ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
    }
    completedSteps.push('gen-assets');
    writeCheckpoint(episodeId, completedSteps);
  }

  if (shouldRun('validate')) {
    const start = Date.now();
    console.log('✔️  Step 4/4: Validating...');
    const errors = await validate();
    if (errors.length > 0) {
      console.error('❌ Validation failed:');
      for (const e of errors) console.error(`  - ${e}`);
      console.log(`  Done in ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
      process.exit(1);
    }
    console.log(`  ✅ All checks passed`);
    console.log(`  Done in ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
    completedSteps.push('validate');
  }

  if (!args.step && completedSteps.length === STEPS.length) {
    clearCheckpoint();
  }

  console.log(`🎮 Episode ${episodeId} ready!\n`);
}

main().catch(err => {
  console.error(`\n💥 Build failed: ${err.message}`);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
