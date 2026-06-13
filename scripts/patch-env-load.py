from pathlib import Path
snippet = '''
import { existsSync } from 'fs';
function loadEnvFiles(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
    resolve(__dirname, '../../.env'),
    resolve(__dirname, '../../../.env'),
    'C:/Users/cvane/V/.env',
  ];
  for (const p of candidates) {
    if (existsSync(p)) config({ path: p });
  }
}
loadEnvFiles();
'''
for rel in [
    Path(r"C:/Users/cvane/V/apps/desktop/src/main/aiProvider.ts"),
    Path(r"C:/Users/cvane/V/apps/desktop/src/main/index.ts"),
]:
    text = rel.read_text(encoding='utf-8')
    text = text.replace("config({ path: resolve(process.cwd(), '.env') });\nconfig({ path: resolve(process.cwd(), '../../.env') });", snippet.strip())
    if 'loadEnvFiles' not in text:
        text = text.replace('import { resolve } from \'path\';', "import { resolve } from 'path';\nimport { existsSync } from 'fs';")
        text = text.replace('config({ path: resolve(process.cwd(), \'.env\') });\nconfig({ path: resolve(process.cwd(), \'../../.env\') });', snippet.strip())
    rel.write_text(text, encoding='utf-8')
print('patched env loading')
