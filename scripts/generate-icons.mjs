import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const sizes = [16, 32, 48, 128];
// eslint-disable-next-line no-undef
const root = process.cwd();
const srcSvg = path.resolve(root, 'icons', 'icon.svg');
const outDir = path.resolve(root, 'dist', 'icons');

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function generate() {
  try {
    await ensureDir(outDir);

    // Validate source SVG exists
    await fs.promises.access(srcSvg, fs.constants.R_OK);

    const tasks = sizes.map(async (size) => {
      const outPath = path.join(outDir, `icon-${size}.png`);
      // Use a higher density for crisp rasterization, then resize down
      const density = Math.max(72, size * 4);
      const img = sharp(srcSvg, { density });
      await img
        .resize(size, size, { fit: 'cover' })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toFile(outPath);
      return outPath;
    });

    const results = await Promise.all(tasks);
    // eslint-disable-next-line no-undef
    console.log('[icons] Generated PNGs from SVG:', results.map(p => path.basename(p)).join(', '));
  } catch (err) {
    // eslint-disable-next-line no-undef
    console.error('[icons] Failed to generate icons from SVG:', err.message);
    // eslint-disable-next-line no-undef
    process.exitCode = 1;
  }
}

await generate();
