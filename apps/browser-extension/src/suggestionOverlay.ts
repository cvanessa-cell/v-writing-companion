import type { ProactiveSuggestion } from '@v/shared';

export interface SuggestionOverlayHandlers {
  onAccept: () => void;
  onDismiss: () => void;
  onOpenPanel: () => void;
}

export interface StatusOverlayAction {
  label: string;
  variant?: 'primary' | 'secondary';
  onClick: () => void;
}

let overlayEl: HTMLDivElement | null = null;

function ensureStyles(): void {
  if (document.getElementById('v-suggestion-styles')) return;
  const style = document.createElement('style');
  style.id = 'v-suggestion-styles';
  style.textContent = `
    .v-suggestion-overlay {
      position: absolute;
      z-index: 2147483647;
      max-width: 320px;
      background: #171a22;
      color: #eef2ff;
      border: 1px solid #2a3140;
      border-radius: 12px;
      box-shadow: 0 12px 40px rgba(0,0,0,.35);
      padding: 10px 12px;
      font: 13px/1.4 Segoe UI, system-ui, sans-serif;
    }
    .v-suggestion-overlay[data-tone="error"] {
      border-color: rgba(239,68,68,.45);
      box-shadow: 0 12px 40px rgba(0,0,0,.35), 0 0 0 1px rgba(239,68,68,.12);
    }
    .v-suggestion-overlay .v-headline { font-weight: 600; margin-bottom: 6px; color: #c7d2fe; }
    .v-suggestion-overlay .v-preview { color: #94a3b8; margin-bottom: 10px; white-space: pre-wrap; max-height: 96px; overflow: auto; }
    .v-suggestion-overlay .v-actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .v-suggestion-overlay button {
      border: none; border-radius: 8px; padding: 6px 10px; cursor: pointer; font: inherit;
    }
    .v-suggestion-overlay .v-accept { background: #6366f1; color: white; }
    .v-suggestion-overlay .v-dismiss { background: #1f2430; color: #eef2ff; border: 1px solid #2a3140; }
  `;
  document.head.appendChild(style);
}

export function hideSuggestionOverlay(): void {
  overlayEl?.remove();
  overlayEl = null;
}

export function showSuggestionOverlay(
  field: HTMLElement,
  suggestion: ProactiveSuggestion,
  handlers: SuggestionOverlayHandlers,
): void {
  showOverlay(field, {
    tone: 'default',
    headline: suggestion.headline,
    preview: `${escapeHtml(suggestion.text.slice(0, 240))}${suggestion.text.length > 240 ? '...' : ''}`,
    actions: [
      { label: 'Accept', variant: 'primary', onClick: handlers.onAccept },
      { label: 'Dismiss', variant: 'secondary', onClick: handlers.onDismiss },
      { label: 'Open V', variant: 'secondary', onClick: handlers.onOpenPanel },
    ],
  });
}

export function showStatusOverlay(
  field: HTMLElement,
  input: {
    tone?: 'default' | 'error';
    headline: string;
    message: string;
    actions?: StatusOverlayAction[];
  },
): void {
  showOverlay(field, {
    tone: input.tone ?? 'default',
    headline: input.headline,
    preview: escapeHtml(input.message),
    actions: input.actions ?? [{ label: 'Dismiss', variant: 'secondary', onClick: () => {} }],
  });
}

function showOverlay(
  field: HTMLElement,
  input: {
    tone: 'default' | 'error';
    headline: string;
    preview: string;
    actions: StatusOverlayAction[];
  },
): void {
  ensureStyles();
  hideSuggestionOverlay();

  overlayEl = document.createElement('div');
  overlayEl.className = 'v-suggestion-overlay';
  overlayEl.dataset.tone = input.tone;
  overlayEl.innerHTML = `
    <div class="v-headline">${escapeHtml(input.headline)}</div>
    <div class="v-preview">${input.preview}</div>
    <div class="v-actions"></div>
  `;

  const actionsEl = overlayEl.querySelector('.v-actions');
  for (const action of input.actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = action.variant === 'primary' ? 'v-accept' : 'v-dismiss';
    button.textContent = action.label;
    button.addEventListener('click', () => {
      hideSuggestionOverlay();
      action.onClick();
    });
    actionsEl?.appendChild(button);
  }

  document.body.appendChild(overlayEl);
  positionOverlay(field);
}

export function positionOverlay(field: HTMLElement): void {
  if (!overlayEl) return;
  const rect = field.getBoundingClientRect();
  overlayEl.style.top = `${window.scrollY + rect.bottom + 8}px`;
  overlayEl.style.left = `${window.scrollX + Math.max(8, rect.left)}px`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
