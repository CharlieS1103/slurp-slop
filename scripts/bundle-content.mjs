import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const entry = resolve(root, 'src/content/index.js');
const outfile = resolve(root, 'dist/content-script.js');

(async () => {
  try {
    await build({
      entryPoints: [entry],
      outfile,
      bundle: true,
      format: 'iife',
      target: ['es2020'],
      platform: 'browser',
      sourcemap: false,
      legalComments: 'none',
      logLevel: 'info',
      banner: {
        js: '// this is bundled, dont edit this file directly man\n',
      },
    });
    console.log(`Bundled -> ${outfile}`);
    process.exit(0);
  } catch (err) {
    console.error('Bundle failed:', err);
    process.exit(1);
  }
})();
