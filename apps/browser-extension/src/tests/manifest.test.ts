// @vitest-environment node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface ExtensionManifest {
  content_scripts?: Array<{
    js?: string[];
    all_frames?: boolean;
  }>;
  web_accessible_resources?: Array<{
    resources?: string[];
    matches?: string[];
  }>;
}

function readManifest(): ExtensionManifest {
  return JSON.parse(readFileSync(join(process.cwd(), 'manifest.json'), 'utf8')) as ExtensionManifest;
}

describe('extension manifest activation scope', () => {
  it('keeps iframe bootstrap coverage but defers the full runtime chunk', () => {
    const manifest = readManifest();
    const contentScript = manifest.content_scripts?.[0];

    expect(contentScript?.js).toEqual(['contentScript.js']);
    expect(contentScript?.all_frames).toBe(true);
    expect(manifest.web_accessible_resources).toContainEqual({
      resources: ['contentRuntime.js'],
      matches: ['<all_urls>'],
    });
  });
});
