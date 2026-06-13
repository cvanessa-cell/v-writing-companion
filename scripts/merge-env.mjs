const fs = require('fs');
const path = require('path');

const candidates = [
  'C:/Users/cvane/ID/.env.local',
  'C:/Users/cvane/ID/backend/.env.local',
  'C:/Users/cvane/PSA_AI_GRADING_APP/.env.local',
  'C:/Users/cvane/OneDrive/storybook-mvp2/.env.local',
  'C:/Users/cvane/OneDrive/Desktop/Assistant/production-optimization-assistant/.env.local',
  'C:/Users/cvane/OneDrive/Desktop/CVK CREATED/SaveByDate/.env',
  'C:/Users/cvane/OneDrive/Desktop/sacramento-family-event-finder/.env',
];

const wanted = new Set([
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'OPENAI_MODEL',
  'GEMINI_MODEL',
]);

const found = {};

for (const file of candidates) {
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (wanted.has(key) && val && !found[key]) {
      found[key] = { val, file };
    }
  }
}

const outPath = 'C:/Users/cvane/V/.env';
const defaults = {
  OPENAI_API_KEY: '',
  GEMINI_API_KEY: '',
  OPENAI_MODEL: 'gpt-4o-mini',
  GEMINI_MODEL: 'gemini-2.0-flash',
};

for (const key of Object.keys(defaults)) {
  if (found[key]) defaults[key] = found[key].val;
}

const content = [
  '# Auto-merged from existing project env files',
  ...Object.entries(found).map(([k, v]) => `# ${k} from ${v.file}`),
  '',
  `OPENAI_API_KEY=${defaults.OPENAI_API_KEY}`,
  `GEMINI_API_KEY=${defaults.GEMINI_API_KEY}`,
  `OPENAI_MODEL=${defaults.OPENAI_MODEL}`,
  `GEMINI_MODEL=${defaults.GEMINI_MODEL}`,
  '',
].join('\n');

fs.writeFileSync(outPath, content, 'utf8');

console.log('Wrote', outPath);
for (const [k, v] of Object.entries(found)) {
  console.log(`${k}: copied from ${path.basename(path.dirname(v.file))}/${path.basename(v.file)} (${v.val.length} chars)`);
}
for (const k of wanted) {
  if (!found[k]) console.log(`${k}: not found in scanned projects`);
}
