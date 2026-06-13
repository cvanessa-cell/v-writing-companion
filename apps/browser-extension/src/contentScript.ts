import {
  getFieldMetadata,
  getFieldText,
  getFocusedTextField,
  isSensitiveField,
  isTextField,
  replaceFieldText,
} from './fieldDetector';
import { getBridgeSettings, sendRewriteRequest, sendSuggestRequest } from './bridgeClient';
import { TypingMonitor } from './typingMonitor';
import { hideSuggestionOverlay, positionOverlay, showSuggestionOverlay } from './suggestionOverlay';
import { detectSpeechDictationPatterns } from '@v/shared';

const EXCLUDED_SCHEMES = ['chrome://', 'edge://', 'about:', 'chrome-extension://'];

function isExcludedLocation(): boolean {
  return EXCLUDED_SCHEMES.some((prefix) => location.href.startsWith(prefix));
}

function buildPayload(field: HTMLElement) {
  const meta = getFieldMetadata(field);
  const { fullFieldText, selectedText, selectionStart, selectionEnd } = getFieldText(field);
  return {
    selectedText,
    fullFieldText,
    url: location.href,
    domain: location.hostname,
    pageTitle: document.title,
    fieldMetadata: meta,
    selectionStart,
    selectionEnd,
  };
}

function createButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = 'V';
  btn.title = 'Rewrite with V';
  btn.style.cssText = [
    'position:absolute', 'z-index:2147483646', 'width:28px', 'height:28px', 'border:none',
    'border-radius:999px', 'background:#6366f1', 'color:white', 'font-weight:700', 'cursor:pointer',
    'box-shadow:0 4px 16px rgba(0,0,0,.25)',
  ].join(';');
  return btn;
}

let floatingBtn: HTMLButtonElement | null = null;
let activeField: HTMLElement | null = null;
let bridgeSettings: Awaited<ReturnType<typeof getBridgeSettings>> = null;
let lastSuggestionHash = '';
let suggestInFlight = false;

const typingMonitor = new TypingMonitor({
  pauseMs: 1200,
  minChars: 20,
  onPause: (field, text) => void handlePauseSuggestion(field, text),
});

async function refreshSettings(): Promise<void> {
  bridgeSettings = await getBridgeSettings();
  if (bridgeSettings) {
    typingMonitor.updateOptions({
      pauseMs: bridgeSettings.realtimePauseMs,
      minChars: bridgeSettings.minCharsForSuggestion,
    });
  }
}

void refreshSettings();
setInterval(() => void refreshSettings(), 15000);

function positionButton(field: HTMLElement) {
  if (!floatingBtn) return;
  const rect = field.getBoundingClientRect();
  floatingBtn.style.top = `${window.scrollY + rect.top - 8}px`;
  floatingBtn.style.left = `${window.scrollX + rect.right - 24}px`;
}

function hideButton() {
  floatingBtn?.remove();
  floatingBtn = null;
  activeField = null;
}

function hashText(text: string): string {
  return `${text.length}:${text.slice(0, 64)}`;
}

async function handleRewrite(field: HTMLElement) {
  hideSuggestionOverlay();
  const meta = getFieldMetadata(field);
  if (isSensitiveField(field, meta)) return;
  const payload = buildPayload(field);
  const result = await sendRewriteRequest(payload);
  if (!result?.success || !result?.suggestions?.options?.length) {
    alert(result?.error ?? 'V could not rewrite this field. Is the desktop app running?');
    return;
  }
  const chosen = result.suggestions.options[0];
  const approved = confirm(`Replace field text with:\n\n${chosen.text.slice(0, 500)}`);
  if (approved) replaceFieldText(field, chosen.text);
}

async function handlePauseSuggestion(field: HTMLElement, text: string) {
  if (isExcludedLocation()) return;
  if (bridgeSettings?.paused) return;

  const meta = getFieldMetadata(field);
  if (isSensitiveField(field, meta)) return;

  const speechDetected = detectSpeechDictationPatterns(text);
  const realtimeEnabled = bridgeSettings?.realtimeSuggestions;
  const speechMode = bridgeSettings?.speechCleanupMode ?? 'auto';
  const speechAllowed = speechMode === 'auto' && speechDetected;

  if (!realtimeEnabled && !speechAllowed) return;

  const nextHash = hashText(text);
  if (nextHash === lastSuggestionHash || suggestInFlight) return;

  suggestInFlight = true;
  try {
    const payload = {
      ...buildPayload(field),
      trigger: speechAllowed ? 'speech' : 'pause',
      requestedAction: speechAllowed ? 'speech_cleanup' : undefined,
    };
    const result = await sendSuggestRequest(payload);
    if (!result?.success || !result?.suggestion) return;
    if (result.suggestion.kind === 'good_as_is') return;

    lastSuggestionHash = nextHash;
    showSuggestionOverlay(field, result.suggestion, {
      onAccept: () => {
        const replaceText = result.suggestion.replaceFullField ? result.suggestion.text : result.suggestion.text;
        replaceFieldText(field, replaceText);
      },
      onDismiss: () => hideSuggestionOverlay(),
      onOpenPanel: () => void handleRewrite(field),
    });
  } finally {
    suggestInFlight = false;
  }
}

function showButtonFor(field: HTMLElement) {
  if (isExcludedLocation()) return;
  const meta = getFieldMetadata(field);
  if (isSensitiveField(field, meta)) return;

  activeField = field;
  typingMonitor.handleFocus(field);

  if (!floatingBtn) {
    floatingBtn = createButton();
    document.body.appendChild(floatingBtn);
    floatingBtn.addEventListener('mousedown', (e) => e.preventDefault());
    floatingBtn.addEventListener('click', () => {
      if (activeField) void handleRewrite(activeField);
    });
  }
  positionButton(field);
}

document.addEventListener('focusin', (event) => {
  const target = event.target;
  if (isTextField(target)) showButtonFor(target);
});

document.addEventListener('input', (event) => {
  const target = event.target;
  if (!isTextField(target)) return;
  showButtonFor(target);
  const { fullFieldText } = getFieldText(target);
  typingMonitor.handleInput(target, fullFieldText);
});

document.addEventListener('scroll', () => {
  if (activeField) {
    positionButton(activeField);
    positionOverlay(activeField);
  }
}, true);

document.addEventListener('focusout', () => {
  setTimeout(() => {
    const focused = getFocusedTextField();
    if (!focused) {
      typingMonitor.handleBlur();
      hideButton();
      hideSuggestionOverlay();
    }
  }, 150);
});

export {};
