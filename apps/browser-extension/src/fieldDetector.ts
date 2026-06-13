export interface FieldMetadata {
  tagName: string;
  inputType?: string;
  placeholder?: string;
  ariaLabel?: string;
  formLabel?: string;
  isContentEditable?: boolean;
  name?: string;
  id?: string;
  autocomplete?: string;
}

const SENSITIVE_TYPES = new Set(['password', 'credit-card', 'cc-number', 'cc-csc', 'cc-exp']);

export function isSensitiveField(el: HTMLElement, meta: FieldMetadata): boolean {
  if (meta.inputType && SENSITIVE_TYPES.has(meta.inputType.toLowerCase())) return true;
  if (meta.autocomplete?.toLowerCase().includes('password')) return true;
  const haystack = [meta.ariaLabel, meta.placeholder, meta.formLabel, meta.name, meta.id].filter(Boolean).join(' ');
  return /password|passwd|secret|token|otp|cvv|cvc|ssn|private.?key|seed.?phrase|auth.?code/i.test(haystack);
}

export function getFieldMetadata(el: HTMLElement): FieldMetadata {
  const input = el as HTMLInputElement;
  const tagName = el.tagName.toLowerCase();
  let formLabel: string | undefined;
  if (input.id) {
    const label = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
    formLabel = label?.textContent?.trim() || undefined;
  }
  return {
    tagName,
    inputType: input.type,
    placeholder: input.placeholder || el.getAttribute('placeholder') || undefined,
    ariaLabel: el.getAttribute('aria-label') || undefined,
    formLabel,
    isContentEditable: el.isContentEditable,
    name: input.name || undefined,
    id: input.id || undefined,
    autocomplete: input.autocomplete || undefined,
  };
}

export function isTextField(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'textarea') return true;
  if (tag === 'input') {
    const type = (el as HTMLInputElement).type?.toLowerCase() ?? 'text';
    return ['text', 'search', 'email', 'url', 'tel', 'number', ''].includes(type);
  }
  return el.isContentEditable;
}

export function getFieldText(el: HTMLElement): { fullFieldText: string; selectedText: string; selectionStart?: number; selectionEnd?: number } {
  if (el.isContentEditable) {
    const selection = window.getSelection();
    return {
      fullFieldText: el.innerText,
      selectedText: selection?.toString() ?? '',
    };
  }
  const input = el as HTMLInputElement | HTMLTextAreaElement;
  return {
    fullFieldText: input.value ?? '',
    selectedText: input.value.substring(input.selectionStart ?? 0, input.selectionEnd ?? 0),
    selectionStart: input.selectionStart ?? undefined,
    selectionEnd: input.selectionEnd ?? undefined,
  };
}

export function replaceFieldText(el: HTMLElement, text: string): void {
  if (el.isContentEditable) {
    el.focus();
    document.execCommand('selectAll', false);
    document.execCommand('insertText', false, text);
    return;
  }
  const input = el as HTMLInputElement | HTMLTextAreaElement;
  input.focus();
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export function getFocusedTextField(): HTMLElement | null {
  const active = document.activeElement;
  if (isTextField(active)) return active;
  const selection = window.getSelection()?.anchorNode;
  if (!selection) return null;
  let node: Node | null = selection;
  while (node) {
    if (node instanceof HTMLElement && node.isContentEditable) return node;
    node = node.parentNode;
  }
  return null;
}
