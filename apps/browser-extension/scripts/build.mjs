import { mkdirSync, cpSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
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
await bundle('contentRuntime.ts', 'contentRuntime.js');
await bundle('background.ts', 'background.js');

cpSync(join(root, 'manifest.json'), join(dist, 'manifest.json'));
writeFileSync(
  join(dist, 'popup.html'),
  `<!doctype html>
<html>
  <body style="font-family:Segoe UI,sans-serif;padding:12px;min-width:280px;background:#0f172a;color:#e2e8f0">
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
      <div>
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8">V Writing Bridge</div>
        <h3 style="margin:4px 0 0;font-size:18px">Rewrite in place</h3>
      </div>
      <span id="badge" style="font-size:11px;padding:4px 8px;border-radius:999px;background:#334155;color:#cbd5e1">Checking</span>
    </div>
    <p id="status" style="margin:12px 0 0;font-size:13px;line-height:1.4;color:#cbd5e1">Checking desktop app connection...</p>
    <div style="margin-top:12px;padding:12px;border:1px solid #334155;border-radius:12px;background:#111827">
      <strong style="font-size:13px">First value path</strong>
      <ol style="margin:8px 0 0 18px;padding:0;font-size:12px;line-height:1.5;color:#cbd5e1">
        <li>Keep the V desktop app running.</li>
        <li>Focus a normal text field on a supported page.</li>
        <li>Click the floating V button and accept a rewrite.</li>
      </ol>
    </div>
    <div style="margin-top:12px;padding:12px;border:1px solid #334155;border-radius:12px;background:#111827">
      <strong style="font-size:13px">Why users keep it on</strong>
      <div style="margin-top:8px;font-size:12px;line-height:1.5;color:#cbd5e1">Desktop and browser rewrites stay in the tools you already use, with local exclusions and privacy-safe diagnostics.</div>
    </div>
    <div style="margin-top:12px;font-size:11px;line-height:1.5;color:#94a3b8">
      V ignores password and obviously sensitive fields. It only talks to the local desktop bridge on <code>127.0.0.1</code>.
    </div>
    <script type="module" src="popup.js"></script>
  </body>
</html>`,
);

await esbuild.build({
  stdin: {
    contents: `
fetch('http://127.0.0.1:47821/health')
  .then((r) => r.json())
  .then(() => {
    const status = document.getElementById('status');
    const badge = document.getElementById('badge');
    if (status) {
      status.textContent = 'Desktop app connected. Focus a text field and use the floating V button to review your first rewrite.';
    }
    if (badge) {
      badge.textContent = 'Connected';
      badge.style.background = '#14532d';
      badge.style.color = '#bbf7d0';
    }
  })
  .catch(() => {
    const status = document.getElementById('status');
    const badge = document.getElementById('badge');
    if (status) {
      status.textContent = 'Desktop app not detected. Start V first, then reload this popup and try again on a normal text field.';
    }
    if (badge) {
      badge.textContent = 'Desktop app offline';
      badge.style.background = '#7f1d1d';
      badge.style.color = '#fecaca';
    }
  });
`,
    loader: 'js',
  },
  outfile: join(dist, 'popup.js'),
  bundle: false,
  format: 'esm',
});

console.log('Extension built to', dist);
