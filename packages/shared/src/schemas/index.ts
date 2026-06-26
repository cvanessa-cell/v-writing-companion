import { z } from 'zod';

export const WritingModeSchema = z.enum([
  'email',
  'text_message',
  'social_post',
  'resume',
  'legal_form',
  'academic',
  'project_instructions',
  'dev_prompt',
  'review_complaint',
  'customer_support',
  'business',
  'personal',
  'notes',
  'unknown',
]);

export const RewriteActionSchema = z.enum([
  'polish',
  'professional',
  'warm',
  'shorten',
  'clarify',
  'strengthen',
  'grammar',
  'speech_cleanup',
  'custom',
]);

export const SuggestionTriggerSchema = z.enum(['manual', 'pause', 'speech']);

export const AppContextSchema = z.object({
  appName: z.string().nullable(),
  windowTitle: z.string().nullable(),
  fileName: z.string().nullable(),
  browserUrl: z.string().nullable(),
  domain: z.string().nullable(),
  fieldType: z.string().nullable(),
  writingMode: WritingModeSchema,
});

export const RewriteRequestSchema = z.object({
  originalText: z.string(),
  selectedText: z.string().nullable(),
  surroundingText: z.string().nullable(),
  appContext: AppContextSchema,
  userContext: z.object({
    styleProfile: z.record(z.unknown()),
    preferences: z.record(z.unknown()),
    savedMemories: z.array(z.record(z.unknown())),
  }),
  writingGoal: z.string().nullable(),
  subject: z.string().nullable(),
  audience: z.string().nullable(),
  relationship: z.string().nullable(),
  requestedAction: RewriteActionSchema,
  customInstruction: z.string().nullable(),
  privacyMode: z.boolean(),
});

export const RewriteOptionSchema = z.object({
  label: z.string(),
  text: z.string(),
  whyThisWorks: z.string(),
});

export const RewriteResponseSchema = z.object({
  analysisSummary: z.object({
    detectedIntent: z.string(),
    detectedAudience: z.string(),
    detectedSubject: z.string(),
    recommendedTone: z.string(),
    appSpecificApproach: z.string(),
    risksOrWarnings: z.array(z.string()),
  }),
  options: z.array(RewriteOptionSchema).min(1),
  memorySuggestions: z.array(
    z.object({
      type: z.enum(['user_style', 'app_rule', 'audience_profile', 'subject_profile']),
      suggestedMemory: z.string(),
      requiresUserApproval: z.literal(true),
    }),
  ),
});

export const BridgeRequestSchema = z.object({
  selectedText: z.string(),
  fullFieldText: z.string(),
  url: z.string(),
  domain: z.string(),
  pageTitle: z.string(),
  fieldMetadata: z.object({
    tagName: z.string(),
    inputType: z.string().optional(),
    placeholder: z.string().optional(),
    ariaLabel: z.string().optional(),
    formLabel: z.string().optional(),
    isContentEditable: z.boolean().optional(),
  }),
  selectionStart: z.number().optional(),
  selectionEnd: z.number().optional(),
});

export const SuggestRequestSchema = BridgeRequestSchema.extend({
  trigger: SuggestionTriggerSchema,
  requestedAction: RewriteActionSchema.optional(),
});

export const DiagnosticsEventSchema = z.object({
  eventName: z.string(),
  source: z.enum(['desktop', 'extension', 'renderer']),
  status: z.enum(['info', 'success', 'error']),
  stage: z.string().optional(),
  latencyMs: z.number().optional(),
  detail: z.record(z.unknown()).optional(),
});
