// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { TypingMonitor } from '../typingMonitor';

describe('TypingMonitor', () => {
  it('fires onPause after debounce when min chars met', () => {
    vi.useFakeTimers();
    const field = {} as HTMLElement;
    const onPause = vi.fn();
    const monitor = new TypingMonitor({ pauseMs: 1000, minChars: 5, onPause });
    monitor.handleFocus(field);
    monitor.handleInput(field, 'hello world');
    expect(onPause).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(onPause).toHaveBeenCalledWith(field, 'hello world');
    vi.useRealTimers();
  });

  it('cancels pending pause on blur', () => {
    vi.useFakeTimers();
    const field = {} as HTMLElement;
    const onPause = vi.fn();
    const monitor = new TypingMonitor({ pauseMs: 1000, minChars: 3, onPause });
    monitor.handleInput(field, 'hey');
    monitor.handleBlur();
    vi.advanceTimersByTime(1000);
    expect(onPause).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
