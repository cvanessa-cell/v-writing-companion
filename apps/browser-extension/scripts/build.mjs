import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');

mkdirSync(dist, { recursive: true });

async function bundle(entry, outfile) {
  await esbuild.build({
    entryPoints: [join(root, 'src', entry)],
    outfile: join(dist, outfile),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['chrome109'],
    alias: {
      '@v/shared': join(root, '../../packages/shared/src/index.ts'),
    },
  });
}

await bundle('contentScript.ts', 'contentScript.js');
await bundle('background.ts', 'background.js');

cpSync(join(root, 'manifest.json'), join(dist, 'manifest.json'));
writeFileSync(
  join(dist, 'popup.html'),
  '<!doctype html><html><body style="font-family:Segoe UI,sans-serif;padding:12px;min-width:220px"><h3>V Bridge</h3><p id="status">Checking desktop app…</p><script type="module" src="popup.js"></script></body></html>',
);

await esbuild.build({
  stdin: {
    contents: "fetch('http://127.0.0.1:47821/health').then(r=>r.json()).then(()=>{document.getElementById('status').textContent='Desktop app connected on localhost:47821';}).catch(()=>{document.getElementById('status').textContent='Desktop app not detected. Start V first.'});",
    loader: 'js',
  },
  outfile: join(dist, 'popup.js'),
  bundle: false,
  format: 'esm',
});

console.log('Extension built to', dist);
