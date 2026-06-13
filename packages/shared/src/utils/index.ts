import type { WritingMode } from '../types';

const SENSITIVE_INPUT_TYPES = new Set([
  'password',
  'credit-card',
  'creditcard',
  'cc-number',
  'cc-csc',
  'cc-exp',
]);

const SENSITIVE_NAME_PATTERNS = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /otp/i,
  /2fa/i,
  /cvv/i,
  /cvc/i,
  /ssn/i,
  /social.?security/i,
  /private.?key/i,
  /seed.?phrase/i,
  /mnemonic/i,
  /auth.?code/i,
];

export function isSensitiveField(meta: {
  inputType?: string;
  ariaLabel?: string;
  placeholder?: string;
  formLabel?: string;
  name?: string;
  id?: string;
  autocomplete?: string;
}): boolean {
  if (meta.inputType && SENSITIVE_INPUT_TYPES.has(meta.inputType.toLowerCase())) {
    return true;
  }
  if (meta.autocomplete?.toLowerCase().includes('password')) {
    return true;
  }
  const haystack = [meta.ariaLabel, meta.placeholder, meta.formLabel, meta.name, meta.id]
    .filter(Boolean)
    .join(' ');
  return SENSITIVE_NAME_PATTERNS.some((pattern) => pattern.test(haystack));
}

export function isSensitiveText(text: string): boolean {
  const trimmed = text.trim();
  if (/^\d{13,19}$/.test(trimmed.replace(/\s/g, ''))) return true;
  if (/^(sk-|pk_live|pk_test|rk_live|-----BEGIN)/i.test(trimmed)) return true;
  if (/^\d{3}-\d{2}-\d{4}$/.test(trimmed)) return true;
  return false;
}

export function classifyWritingMode(input: {
  appName?: string | null;
  windowTitle?: string | null;
  domain?: string | null;
  fieldType?: string | null;
}): WritingMode {
  const title = (input.windowTitle ?? '').toLowerCase();
  const app = (input.appName ?? '').toLowerCase();
  const domain = (input.domain ?? '').toLowerCase();

  if (domain.includes('mail.google') || title.includes('gmail') || title.includes('outlook')) {
    return 'email';
  }
  if (domain.includes('docs.google') || title.includes('word') || title.includes('document')) {
    return domain.includes('docs.google') ? 'notes' : 'business';
  }
  if (domain.includes('facebook') || domain.includes('instagram') || domain.includes('tiktok') || domain.includes('twitter') || domain.includes('x.com')) {
    return 'social_post';
  }
  if (domain.includes('cursor') || app.includes('cursor') || title.includes('cursor')) {
    return 'dev_prompt';
  }
  if (domain.includes('chatgpt') || domain.includes('claude') || domain.includes('gemini.google')) {
    return 'dev_prompt';
  }
  if (domain.includes('slack') || domain.includes('discord') || domain.includes('teams')) {
    return 'text_message';
  }
  if (title.includes('review') || domain.includes('yelp') || domain.includes('google.com/maps')) {
    return 'review_complaint';
  }
  if (title.includes('support') || domain.includes('zendesk') || domain.includes('freshdesk')) {
    return 'customer_support';
  }
  if (title.includes('notion')) {
    return 'notes';
  }
  if (title.includes('resume') || title.includes('application')) {
    return 'resume';
  }
  if (title.includes('form') || input.fieldType === 'form') {
    return 'legal_form';
  }
  return 'unknown';
}

export const DEFAULT_APP_RULES: Record<string, { summary: string; format: string; tone: string; length: string }> = {
  email: {
    summary: 'Clear subject/body, professional warmth, actionable close',
    format: 'Short paragraphs, greeting + body + sign-off when appropriate',
    tone: 'Professional, respectful, concise',
    length: 'Medium; cut filler',
  },
  gmail: {
    summary: 'Email-optimized rewrites with scannable structure',
    format: 'Greeting, purpose, details, next step, sign-off',
    tone: 'Professional and warm',
    length: 'Concise unless detail is required',
  },
  'google docs': {
    summary: 'Preserve paragraph structure and document flow',
    format: 'Paragraph-based; maintain headings if present',
    tone: 'Match document purpose',
    length: 'Context-dependent',
  },
  facebook: {
    summary: 'Conversational social comment/post tone',
    format: 'Short, natural, emotionally aware',
    tone: 'Friendly, authentic, not corporate',
    length: 'Short to medium',
  },
  forms: {
    summary: 'Direct, complete answers without fluff',
    format: 'Answer the question directly',
    tone: 'Neutral and factual',
    length: 'As short as completeness allows',
  },
  reviews: {
    summary: 'Specific, fair, useful to future readers',
    format: 'What happened, impact, recommendation',
    tone: 'Balanced, factual, emotionally controlled',
    length: 'Medium',
  },
  cursor: {
    summary: 'Prompt engineering for implementation tasks',
    format: 'Goal, context, steps, acceptance criteria',
    tone: 'Precise, technical, actionable',
    length: 'Structured and complete',
  },
  chatgpt: {
    summary: 'Structured prompts with clear constraints',
    format: 'Role, task, context, output format',
    tone: 'Direct and specific',
    length: 'Complete but not verbose',
  },
};

const DICTATION_PATTERNS = [
  /\bperiod\b/i,
  /\bcomma\b/i,
  /\bnew line\b/i,
  /\bnext paragraph\b/i,
  /\bquestion mark\b/i,
  /\bexclamation point\b/i,
  /\bum+\b/i,
  /\buh+\b/i,
  /\byou know\b/i,
  /\bi mean\b/i,
  /\blike\b.{0,20}\blike\b/i,
];

const HARSH_PATTERNS = [
  /\b(stupid|idiot|worst|terrible|useless|incompetent|pathetic)\b/i,
  /\b(you always|you never|never again)\b/i,
  /!{2,}/,
];

export function detectSpeechDictationPatterns(text: string): boolean {
  const t = text.trim();
  if (t.length < 8) return false;
  let hits = 0;
  for (const p of DICTATION_PATTERNS) if (p.test(t)) hits += 1;
  if (hits >= 2) return true;
  if (/\bperiod\b/i.test(t) || /\bnew line\b/i.test(t)) return true;
  if (!/[.!?]/.test(t) && t.split(/\s+/).length >= 12) return true;
  return false;
}

export function inferProactiveSuggestionKind(text: string): import('../types').ProactiveSuggestionKind {
  const t = text.trim();
  if (!t) return 'good_as_is';
  if (detectSpeechDictationPatterns(t)) return 'speech_cleanup';
  if (HARSH_PATTERNS.some((p) => p.test(t))) return 'too_harsh';
  if (t.split(/\s+/).length > 80) return 'shorten';
  if (t.split(/\s+/).length < 8 && /[?]/.test(t) === false) return 'more_detail';
  if (t.split(/[.!?]/).filter(Boolean).length > 1 && t.length > 40 && !/[,:;]/.test(t)) return 'clearer';
  if (t.length >= 20 && t.length <= 280) return 'good_as_is';
  return 'clearer';
}

export function shouldSuggestRealtime(input: {
  enabled: boolean;
  paused: boolean;
  text: string;
  minChars: number;
}): boolean {
  if (!input.enabled || input.paused) return false;
  return input.text.trim().length >= input.minChars;
}

export function createDebouncer<T extends unknown[]>(
  fn: (...args: T) => void,
  waitMs: number,
): { call: (...args: T) => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    call: (...args: T) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn(...args);
      }, waitMs);
    },
    cancel: () => {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}

export const PROACTIVE_HEADLINES: Record<string, string> = {
  clearer: 'This could be clearer',
  too_harsh: 'This sounds too harsh',
  shorten: 'This could be shortened',
  more_detail: 'This needs more detail',
  good_as_is: 'This is good as-is',
  speech_cleanup: 'Clean up dictation',
};
