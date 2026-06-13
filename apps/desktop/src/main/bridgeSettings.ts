import { getSetting, isPaused } from './database';
import type { BridgeSettings } from '@v/shared';

export function getBridgeSettings(): BridgeSettings {
  const speechMode = getSetting('speech_cleanup_mode', 'auto');
  return {
    paused: isPaused(),
    realtimeSuggestions: getSetting('realtime_suggestions', 'false') === 'true',
    realtimePauseMs: Number(getSetting('realtime_pause_ms', '1200')),
    minCharsForSuggestion: Number(getSetting('min_chars_for_suggestion', '20')),
    speechCleanupMode: speechMode === 'off' || speechMode === 'manual' ? speechMode : 'auto',
    rewriteOnlySelected: getSetting('rewrite_only_selected', 'true') === 'true',
  };
}
