import { describe, expect, it, vi } from 'vitest';
import {
  createDebouncer,
  detectSpeechDictationPatterns,
  inferProactiveSuggestionKind,
  shouldSuggestRealtime,
} from '../utils';

describe('phase 4 utils', () => {
  it('detects dictation patterns', () => {
    expect(detectSpeechDictationPatterns('um hello world new line this is a test period')).toBe(true);
    expect(detectSpeechDictationPatterns('Hello there.')).toBe(false);
  });

  it('infers proactive kinds', () => {
    expect(inferProactiveSuggestionKind('You are the worst and never help')).toBe('too_harsh');
    expect(inferProactiveSuggestionKind('ok')).toBe('more_detail');
  });

  it('gates realtime suggestions', () => {
    expect(shouldSuggestRealtime({ enabled: false, paused: false, text: 'hello world', minChars: 5 })).toBe(false);
    expect(shouldSuggestRealtime({ enabled: true, paused: false, text: 'hello world', minChars: 5 })).toBe(true);
    expect(shouldSuggestRealtime({ enabled: true, paused: true, text: 'hello world', minChars: 5 })).toBe(false);
  });

  it('debounces calls', async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = createDebouncer(fn, 500);
    debounced.call('a');
    debounced.call('b');
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
