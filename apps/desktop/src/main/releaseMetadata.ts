import { app } from 'electron';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

interface ExtensionManifestShape {
  version?: string;
}

export interface ReleaseMetadata {
  appVersion: string;
  extensionVersion: string | null;
  releaseChannel: 'development' | 'stable';
}

let cachedMetadata: ReleaseMetadata | null = null;

function readExtensionVersion(): string | null {
  const candidates = [
    resolve(process.cwd(), 'apps/browser-extension/manifest.json'),
    resolve(process.cwd(), 'apps/browser-extension/dist/manifest.json'),
    resolve(__dirname, '../../../../browser-extension/manifest.json'),
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      const parsed = JSON.parse(readFileSync(candidate, 'utf8')) as ExtensionManifestShape;
      if (typeof parsed.version === 'string' && parsed.version.trim()) {
        return parsed.version.trim();
      }
    } catch {
      // Ignore malformed local manifests and try the next candidate.
    }
  }

  return null;
}

export function getReleaseMetadata(): ReleaseMetadata {
  if (cachedMetadata) return cachedMetadata;

  cachedMetadata = {
    appVersion: app.getVersion(),
    extensionVersion: readExtensionVersion(),
    releaseChannel: app.isPackaged ? 'stable' : 'development',
  };

  return cachedMetadata;
}
