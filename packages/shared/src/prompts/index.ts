export const V_SYSTEM_PROMPT = `You are V, an AI writing refinement agent. Your job is to revise, refine, polish, clarify, and improve the user's text while preserving the user's intended meaning.

Before writing, analyze five context pillars:
1. User style/preferences
2. Current app/program/file/browser
3. Intent/goal
4. Subject
5. Audience

Choose the writing structure, tone, length, and communication strategy that best fits the situation. Never invent facts. If the original is unclear, preserve uncertainty or flag what needs clarification. Produce clean, usable text that can be pasted directly into the current app. When requested, provide multiple versions with distinct purposes.

Respond ONLY with valid JSON matching the required schema. No markdown fences.`;

export const ACTION_LABELS: Record<string, string> = {
  polish: 'Polish — clean, natural, ready to send',
  professional: 'Professional — formal and business-appropriate',
  warm: 'Warmer — kinder and more personable',
  shorten: 'Shorter — concise and direct',
  clarify: 'Clearer — easier to understand',
  strengthen: 'Stronger — more persuasive and confident',
  grammar: 'Grammar only — fix errors, preserve voice',
  speech_cleanup: 'Speech cleanup — fix dictation, punctuation, filler words',
  custom: 'Custom — follow user instruction',
};

export function buildRewriteUserPrompt(request: {
  originalText: string;
  appContext: { appName: string | null; windowTitle: string | null; writingMode: string; domain?: string | null };
  writingGoal: string | null;
  subject: string | null;
  audience: string | null;
  relationship: string | null;
  requestedAction: string;
  customInstruction: string | null;
  styleProfile: Record<string, unknown>;
  appRules: string;
  audienceNotes: string;
  subjectNotes: string;
}): string {
  return `Rewrite the following text.

ORIGINAL TEXT:
"""
${request.originalText}
"""

CONTEXT:
- App: ${request.appContext.appName ?? 'Unknown'}
- Window: ${request.appContext.windowTitle ?? 'Unknown'}
- Domain: ${request.appContext.domain ?? 'N/A'}
- Writing mode: ${request.appContext.writingMode}
- Detected/stated goal: ${request.writingGoal ?? 'infer from text'}
- Subject: ${request.subject ?? 'infer from text'}
- Audience: ${request.audience ?? 'infer from text'}
- Relationship: ${request.relationship ?? 'infer from text'}
- Requested action: ${request.requestedAction}
${request.customInstruction ? `- Custom instruction: ${request.customInstruction}` : ''}

USER STYLE PROFILE:
${JSON.stringify(request.styleProfile, null, 2)}

APP-SPECIFIC RULES:
${request.appRules}

AUDIENCE NOTES:
${request.audienceNotes}

SUBJECT NOTES:
${request.subjectNotes}

Return JSON with this exact shape:
{
  "analysisSummary": {
    "detectedIntent": string,
    "detectedAudience": string,
    "detectedSubject": string,
    "recommendedTone": string,
    "appSpecificApproach": string,
    "risksOrWarnings": string[]
  },
  "options": [
    { "label": string, "text": string, "whyThisWorks": string },
    { "label": string, "text": string, "whyThisWorks": string },
    { "label": string, "text": string, "whyThisWorks": string }
  ],
  "memorySuggestions": [
    { "type": "user_style"|"app_rule"|"audience_profile"|"subject_profile", "suggestedMemory": string, "requiresUserApproval": true }
  ]
}

Requirements:
- Provide exactly 3 distinct rewrite options unless grammar-only (then 1 primary + 2 light variants).
- Option 1: best polished version for the context.
- Option 2: shorter version.
- Option 3: more context-aware version using app/audience/subject.
- Never invent facts. Flag risks in risksOrWarnings.
- Preserve user meaning unless action requires tone change only.`;
}

export function buildSpeechCleanupPrompt(request: {
  originalText: string;
  appContext: { appName: string | null; writingMode: string; domain?: string | null };
}): string {
  return `Clean up speech-to-text or dictation output.

ORIGINAL TEXT:
"""
${request.originalText}
"""

CONTEXT:
- App: ${request.appContext.appName ?? 'Unknown'}
- Writing mode: ${request.appContext.writingMode}
- Domain: ${request.appContext.domain ?? 'N/A'}

Tasks:
- Fix dictation errors and homophones
- Add proper punctuation and capitalization
- Remove filler words (um, uh, like, you know) when they add no meaning
- Preserve the speaker's natural meaning and tone
- Format into readable sentences/paragraphs
- Never invent facts

Return JSON with this exact shape:
{
  "analysisSummary": {
    "detectedIntent": string,
    "detectedAudience": string,
    "detectedSubject": string,
    "recommendedTone": string,
    "appSpecificApproach": string,
    "risksOrWarnings": string[]
  },
  "options": [
    { "label": "Speech cleanup", "text": string, "whyThisWorks": string }
  ],
  "memorySuggestions": []
}`;
}

export function buildProactiveSuggestPrompt(request: {
  originalText: string;
  kind: string;
  appContext: { appName: string | null; writingMode: string; domain?: string | null };
}): string {
  return `Provide ONE lightweight proactive writing suggestion. Do NOT rewrite unless the kind requires it.

ORIGINAL TEXT:
"""
${request.originalText}
"""

SUGGESTION KIND: ${request.kind}
CONTEXT: ${request.appContext.writingMode} / ${request.appContext.domain ?? 'unknown'}

Headline rules by kind:
- clearer: "This could be clearer"
- too_harsh: "This sounds too harsh"
- shorten: "This could be shortened"
- more_detail: "This needs more detail"
- good_as_is: "This is good as-is"
- speech_cleanup: "Clean up dictation"

Return JSON:
{
  "analysisSummary": {
    "detectedIntent": string,
    "detectedAudience": string,
    "detectedSubject": string,
    "recommendedTone": string,
    "appSpecificApproach": string,
    "risksOrWarnings": string[]
  },
  "options": [
    { "label": string, "text": string, "whyThisWorks": string }
  ],
  "memorySuggestions": []
}

Rules:
- Provide exactly 1 option in options array.
- For good_as_is, return the original text unchanged in options[0].text.
- For other kinds, provide an improved version that fixes ONLY the identified issue.
- Keep suggestions concise and paste-ready.
- Never invent facts.`;
}
