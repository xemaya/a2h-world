#!/usr/bin/env node
// remove-bg-canvas.mjs - Automated Canvas-based background removal

import { createCanvas, loadImage } from 'canvas';
import { readdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const gameRoot = join(__dirname, '..');

// Configuration
const TARGET_COLOR = { r: 0, g: 0, b: 0 }; // Black background
const DEFAULT_TOLERANCE = 30;
const KAI_TOLERANCE = 20; // Lower for KAI (black hoodie issue)

const INPUT_DIR = join(gameRoot, 'assets/temp_raw');
const OUTPUT_CONFIG = {
  'echo_blank_raw.png': { path: join(gameRoot, 'assets/echo/echo_blank.png'), tolerance: DEFAULT_TOLERANCE },
  'echo_concern_raw.png': { path: join(gameRoot, 'assets/echo/echo_concern.png'), tolerance: DEFAULT_TOLERANCE },
  'echo_happy_raw.png': { path: join(gameRoot, 'assets/echo/echo_happy.png'), tolerance: DEFAULT_TOLERANCE },
  'kai_raw.png': { path: join(gameRoot, 'assets/partners/kai.png'), tolerance: KAI_TOLERANCE }
};

/**
 * Remove solid color background from image
 * @param {Image} img - Loaded image
 * @param {number} tolerance - Color tolerance (0-255)
 * @returns {Buffer} PNG buffer with transparent background
 */
function removeBackground(img, tolerance) {
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');

  // Draw image
  ctx.drawImage(img, 0, 0);

  // Get pixel data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data; // Uint8ClampedArray [R,G,B,A, R,G,B,A, ...]

  let removedPixels = 0;

  // Process each pixel
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Check if color is within tolerance of target
    if (
      Math.abs(r - TARGET_COLOR.r) <= tolerance &&
      Math.abs(g - TARGET_COLOR.g) <= tolerance &&
      Math.abs(b - TARGET_COLOR.b) <= tolerance
    ) {
      data[i + 3] = 0; // Set alpha to transparent
      removedPixels++;
    }
  }

  // Put processed data back
  ctx.putImageData(imageData, 0, 0);

  const totalPixels = data.length / 4;
  const percentage = ((removedPixels / totalPixels) * 100).toFixed(1);
  console.log(`  Removed ${removedPixels} pixels (${percentage}%)`);

  // Return PNG buffer
  return canvas.toBuffer('image/png');
}

async function processSprites() {
  console.log('Starting automated background removal...\n');

  const files = await readdir(INPUT_DIR);
  const rawFiles = files.filter(f => f.endsWith('_raw.png'));

  if (rawFiles.length === 0) {
    console.error('❌ No raw files found in assets/temp_raw/');
    process.exit(1);
  }

  console.log(`Found ${rawFiles.length} raw sprites:\n`);

  for (const filename of rawFiles) {
    const config = OUTPUT_CONFIG[filename];
    if (!config) {
      console.log(`⚠️  ${filename} - No output config, skipping`);
      continue;
    }

    const inputPath = join(INPUT_DIR, filename);
    const { path: outputPath, tolerance } = config;

    console.log(`Processing ${filename}...`);
    console.log(`  Tolerance: ${tolerance}`);

    try {
      // Load image
      const img = await loadImage(inputPath);
      console.log(`  Size: ${img.width}x${img.height}`);

      // Remove background
      const pngBuffer = removeBackground(img, tolerance);

      // Write output
      await writeFile(outputPath, pngBuffer);
      console.log(`  ✓ Saved to ${outputPath.replace(gameRoot, '.')}\n`);

    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}\n`);
    }
  }

  console.log('✅ Done! Sprites saved to assets/echo/ and assets/partners/');
  console.log('\nNext steps:');
  console.log('1. Verify sprites: file assets/echo/*.png assets/partners/kai.png');
  console.log('2. Test in game: npm run dev');
  console.log('3. Clean up: rm -rf assets/temp_raw/');
}

processSprites().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
