// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { hideSuggestionOverlay, showStatusOverlay, showSuggestionOverlay } from '../suggestionOverlay';

function mockRect(partial: Partial<DOMRect> = {}): DOMRect {
  return {
    x: 0,
    y: 0,
    top: 10,
    left: 10,
    bottom: 30,
    right: 210,
    width: 200,
    height: 20,
    toJSON: () => ({}),
    ...partial,
  } as DOMRect;
}

describe('suggestionOverlay', () => {
  it('renders suggestion actions and escapes the preview text', () => {
    document.body.innerHTML = '<textarea id="field"></textarea>';
    const field = document.getElementById('field') as HTMLElement;
    vi.spyOn(field, 'getBoundingClientRect').mockReturnValue(mockRect());

    const onAccept = vi.fn();
    showSuggestionOverlay(
      field,
      {
        kind: 'clearer',
        headline: 'Try this',
        text: '<b>clean me</b>',
        whyThisWorks: 'Shorter',
        replaceFullField: true,
      },
      { onAccept, onDismiss: vi.fn(), onOpenPanel: vi.fn() },
    );

    const overlay = document.querySelector('.v-suggestion-overlay');
    expect(overlay?.textContent).toContain('Try this');
    expect(overlay?.innerHTML).toContain('&lt;b&gt;clean me&lt;/b&gt;');

    const buttons = Array.from(document.querySelectorAll('.v-suggestion-overlay button')) as HTMLButtonElement[];
    expect(buttons.map((button) => button.textContent)).toEqual(['Accept', 'Dismiss', 'Open V']);

    buttons[0].click();
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.v-suggestion-overlay')).toBeNull();
  });

  it('shows an error status overlay with a dismiss fallback', () => {
    document.body.innerHTML = '<textarea id="field"></textarea>';
    const field = document.getElementById('field') as HTMLElement;
    vi.spyOn(field, 'getBoundingClientRect').mockReturnValue(mockRect({ bottom: 24, right: 180, width: 170 }));

    showStatusOverlay(field, {
      tone: 'error',
      headline: 'Desktop bridge unavailable',
      message: 'Open V and try again.',
    });

    const overlay = document.querySelector('.v-suggestion-overlay[data-tone="error"]');
    expect(overlay?.textContent).toContain('Desktop bridge unavailable');
    expect(overlay?.textContent).toContain('Dismiss');

    hideSuggestionOverlay();
    expect(document.querySelector('.v-suggestion-overlay')).toBeNull();
  });
});
