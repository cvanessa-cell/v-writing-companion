export type WritingMode =
  | 'email'
  | 'text_message'
  | 'social_post'
  | 'resume'
  | 'legal_form'
  | 'academic'
  | 'project_instructions'
  | 'dev_prompt'
  | 'review_complaint'
  | 'customer_support'
  | 'business'
  | 'personal'
  | 'notes'
  | 'unknown';

export type RewriteAction =
  | 'polish'
  | 'professional'
  | 'warm'
  | 'shorten'
  | 'clarify'
  | 'strengthen'
  | 'grammar'
  | 'speech_cleanup'
  | 'custom';

export type ProactiveSuggestionKind =
  | 'clearer'
  | 'too_harsh'
  | 'shorten'
  | 'more_detail'
  | 'good_as_is'
  | 'speech_cleanup';

export type SuggestionTrigger = 'manual' | 'pause' | 'speech';

export interface AppContext {
  appName: string | null;
  windowTitle: string | null;
  fileName: string | null;
  browserUrl: string | null;
  domain: string | null;
  fieldType: string | null;
  writingMode: WritingMode;
}

export interface RewriteRequest {
  originalText: string;
  selectedText: string | null;
  surroundingText: string | null;
  appContext: AppContext;
  userContext: {
    styleProfile: Record<string, unknown>;
    preferences: Record<string, unknown>;
    savedMemories: Record<string, unknown>[];
  };
  writingGoal: string | null;
  subject: string | null;
  audience: string | null;
  relationship: string | null;
  requestedAction: RewriteAction;
  customInstruction: string | null;
  privacyMode: boolean;
}

export interface RewriteOption {
  label: string;
  text: string;
  whyThisWorks: string;
}

export interface MemorySuggestion {
  type: 'user_style' | 'app_rule' | 'audience_profile' | 'subject_profile';
  suggestedMemory: string;
  requiresUserApproval: true;
}

export interface RewriteResponse {
  analysisSummary: {
    detectedIntent: string;
    detectedAudience: string;
    detectedSubject: string;
    recommendedTone: string;
    appSpecificApproach: string;
    risksOrWarnings: string[];
  };
  options: RewriteOption[];
  memorySuggestions: MemorySuggestion[];
}

export interface BridgeFieldMetadata {
  tagName: string;
  inputType?: string;
  placeholder?: string;
  ariaLabel?: string;
  formLabel?: string;
  isContentEditable?: boolean;
}

export interface BridgeRequest {
  selectedText: string;
  fullFieldText: string;
  url: string;
  domain: string;
  pageTitle: string;
  fieldMetadata: BridgeFieldMetadata;
  selectionStart?: number;
  selectionEnd?: number;
}

export interface BridgeResponse {
  success: boolean;
  suggestions?: RewriteResponse;
  context?: AppContext;
  error?: string;
}

export interface BridgeSettings {
  paused: boolean;
  realtimeSuggestions: boolean;
  realtimePauseMs: number;
  minCharsForSuggestion: number;
  speechCleanupMode: 'off' | 'auto' | 'manual';
  rewriteOnlySelected: boolean;
  extensionDomainMode: 'all' | 'allowlist';
  extensionAllowedDomains: string[];
  excludedDomains: string[];
}

export interface SuggestRequest extends BridgeRequest {
  trigger: SuggestionTrigger;
  requestedAction?: RewriteAction;
}

export interface ProactiveSuggestion {
  kind: ProactiveSuggestionKind;
  headline: string;
  text: string;
  whyThisWorks: string;
  replaceFullField: boolean;
}

export interface SuggestResponse {
  success: boolean;
  suggestion?: ProactiveSuggestion;
  suggestions?: RewriteResponse;
  context?: AppContext;
  error?: string;
}

export interface ActiveWindowInfo {
  title: string;
  appName: string;
  processName: string;
  pid: number;
}

export interface CaptureResult {
  text: string;
  clipboardRestored: boolean;
  error?: string;
}

export interface ReplacementResult {
  success: boolean;
  clipboardRestored: boolean;
  error?: string;
}

export interface DiagnosticEvent {
  eventName: string;
  source: 'desktop' | 'extension' | 'renderer';
  status: 'info' | 'success' | 'error';
  stage?: string;
  latencyMs?: number;
  detail?: Record<string, unknown>;
}
