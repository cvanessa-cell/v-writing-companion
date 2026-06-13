import { createDebouncer } from '@v/shared';

export interface TypingMonitorOptions {
  pauseMs: number;
  minChars: number;
  onPause: (field: HTMLElement, text: string) => void;
}

export class TypingMonitor {
  private field: HTMLElement | null = null;
  private lastText = '';
  private debounced: ReturnType<typeof createDebouncer<[HTMLElement, string]>>;

  constructor(private options: TypingMonitorOptions) {
    this.debounced = createDebouncer((field, text) => {
      if (text.trim().length < this.options.minChars) return;
      if (field !== this.field) return;
      this.options.onPause(field, text);
    }, options.pauseMs);
  }

  updateOptions(options: Partial<TypingMonitorOptions>): void {
    Object.assign(this.options, options);
  }

  handleFocus(field: HTMLElement): void {
    this.field = field;
  }

  handleInput(field: HTMLElement, text: string): void {
    this.field = field;
    this.lastText = text;
    this.debounced.call(field, text);
  }

  handleBlur(): void {
    this.debounced.cancel();
    this.field = null;
    this.lastText = '';
  }

  cancel(): void {
    this.debounced.cancel();
  }

  getLastText(): string {
    return this.lastText;
  }
}
