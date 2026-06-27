import { getSetting, isPaused } from './database';
import { listExcludedDomains } from './memoryService';
import type { BridgeSettings } from '@v/shared';

function parseDomainList(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function getBridgeSettings(): BridgeSettings {
  const speechMode = getSetting('speech_cleanup_mode', 'auto');
  const domainMode = getSetting('extension_domain_mode', 'all');
  return {
    paused: isPaused(),
    realtimeSuggestions: getSetting('realtime_suggestions', 'false') === 'true',
    realtimePauseMs: Number(getSetting('realtime_pause_ms', '1200')),
    minCharsForSuggestion: Number(getSetting('min_chars_for_suggestion', '20')),
    speechCleanupMode: speechMode === 'off' || speechMode === 'manual' ? speechMode : 'auto',
    rewriteOnlySelected: getSetting('rewrite_only_selected', 'true') === 'true',
    extensionDomainMode: domainMode === 'allowlist' ? 'allowlist' : 'all',
    extensionAllowedDomains: parseDomainList(getSetting('extension_allowed_domains', '')),
    excludedDomains: listExcludedDomains(),
  };
}
