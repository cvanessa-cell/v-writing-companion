import { config } from 'dotenv';

import { resolve } from 'path';

import { existsSync } from 'fs';

import type { ProactiveSuggestionKind, RewriteRequest, RewriteResponse } from '@v/shared';

import { RewriteResponseSchema } from '@v/shared';

import {

  V_SYSTEM_PROMPT,

  buildProactiveSuggestPrompt,

  buildRewriteUserPrompt,

  buildSpeechCleanupPrompt,

} from '@v/shared';

import { PROACTIVE_HEADLINES } from '@v/shared';

import { getSetting } from './database';

import { getAppRules, getAudienceNotes, getStyleProfile, getSubjectNotes } from './memoryService';



function loadEnvFiles(): void {

  for (const p of [

    resolve(process.cwd(), '.env'),

    resolve(process.cwd(), '../../.env'),

    resolve(__dirname, '../../.env'),

    resolve(__dirname, '../../../.env'),

    'C:/Users/cvane/V/.env',

  ]) {

    if (existsSync(p)) config({ path: p });

  }

}

loadEnvFiles();



export interface AIProvider {

  rewriteText(input: RewriteRequest): Promise<RewriteResponse>;

  analyzeText(input: RewriteRequest): Promise<RewriteResponse['analysisSummary']>;

  generateSuggestions(input: RewriteRequest, kind: ProactiveSuggestionKind): Promise<RewriteResponse>;

}



function parseJsonResponse(raw: string): RewriteResponse {

  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

  return RewriteResponseSchema.parse(JSON.parse(cleaned));

}



function buildPromptPayload(request: RewriteRequest) {

  if (request.requestedAction === 'speech_cleanup') {

    return buildSpeechCleanupPrompt({

      originalText: request.originalText,

      appContext: {

        appName: request.appContext.appName,

        writingMode: request.appContext.writingMode,

        domain: request.appContext.domain,

      },

    });

  }

  return buildRewriteUserPrompt({

    originalText: request.originalText,

    appContext: {

      appName: request.appContext.appName,

      windowTitle: request.appContext.windowTitle,

      writingMode: request.appContext.writingMode,

      domain: request.appContext.domain,

    },

    writingGoal: request.writingGoal,

    subject: request.subject,

    audience: request.audience,

    relationship: request.relationship,

    requestedAction: request.requestedAction,

    customInstruction: request.customInstruction,

    styleProfile: request.userContext.styleProfile,

    appRules: getAppRules(request.appContext.appName, request.appContext.domain),

    audienceNotes: getAudienceNotes(request.audience),

    subjectNotes: getSubjectNotes(request.subject),

  });

}



function buildSuggestPrompt(request: RewriteRequest, kind: ProactiveSuggestionKind) {

  if (kind === 'speech_cleanup') {

    return buildSpeechCleanupPrompt({

      originalText: request.originalText,

      appContext: {

        appName: request.appContext.appName,

        writingMode: request.appContext.writingMode,

        domain: request.appContext.domain,

      },

    });

  }

  return buildProactiveSuggestPrompt({

    originalText: request.originalText,

    kind,

    appContext: {

      appName: request.appContext.appName,

      writingMode: request.appContext.writingMode,

      domain: request.appContext.domain,

    },

  });

}



async function callOpenAI(prompt: string, model?: string): Promise<RewriteResponse> {

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured. Add it to .env and restart V.');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {

    method: 'POST',

    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },

    body: JSON.stringify({

      model: model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini',

      temperature: 0.35,

      response_format: { type: 'json_object' },

      messages: [{ role: 'system', content: V_SYSTEM_PROMPT }, { role: 'user', content: prompt }],

    }),

  });

  if (!response.ok) throw new Error(`OpenAI error: ${response.status} ${await response.text()}`);

  const data = (await response.json()) as { choices: { message: { content: string } }[] };

  return parseJsonResponse(data.choices[0]?.message?.content ?? '{}');

}



async function callGemini(prompt: string, model?: string): Promise<RewriteResponse> {

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured. Add it to .env and restart V.');

  const geminiModel = model ?? process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {

    method: 'POST',

    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify({

      contents: [{ role: 'user', parts: [{ text: `${V_SYSTEM_PROMPT}\n\n${prompt}` }] }],

      generationConfig: { temperature: 0.35, responseMimeType: 'application/json' },

    }),

  });

  if (!response.ok) throw new Error(`Gemini error: ${response.status} ${await response.text()}`);

  const data = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };

  return parseJsonResponse(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}');

}



class OpenAIProvider implements AIProvider {

  rewriteText(input: RewriteRequest) { return callOpenAI(buildPromptPayload(input)); }

  async analyzeText(input: RewriteRequest) { return (await this.rewriteText({ ...input, requestedAction: 'polish' })).analysisSummary; }

  generateSuggestions(input: RewriteRequest, kind: ProactiveSuggestionKind): Promise<RewriteResponse> {
    return callOpenAI(buildSuggestPrompt(input, kind));
  }

}



class GeminiProvider implements AIProvider {

  rewriteText(input: RewriteRequest) { return callGemini(buildPromptPayload(input)); }

  async analyzeText(input: RewriteRequest) { return (await this.rewriteText({ ...input, requestedAction: 'polish' })).analysisSummary; }

  generateSuggestions(input: RewriteRequest, kind: ProactiveSuggestionKind): Promise<RewriteResponse> {
    return callGemini(buildSuggestPrompt(input, kind));
  }

}



class MockProvider implements AIProvider {

  async rewriteText(input: RewriteRequest): Promise<RewriteResponse> {

    const base = input.originalText.trim();

    const polished = base.charAt(0).toUpperCase() + base.slice(1).replace(/\s+/g, ' ');

    if (input.requestedAction === 'speech_cleanup') {

      return {

        analysisSummary: {

          detectedIntent: 'Speech cleanup', detectedAudience: 'General', detectedSubject: 'Dictation',

          recommendedTone: 'Natural', appSpecificApproach: input.appContext.writingMode, risksOrWarnings: [],

        },

        options: [{ label: 'Speech cleanup', text: polished.replace(/\b(um|uh|you know)\b/gi, '').replace(/\s+/g, ' ').trim(), whyThisWorks: 'Removes filler and fixes flow.' }],

        memorySuggestions: [],

      };

    }

    return {

      analysisSummary: {

        detectedIntent: 'General communication', detectedAudience: 'General reader', detectedSubject: 'Unspecified',

        recommendedTone: 'Clear and natural', appSpecificApproach: `Optimized for ${input.appContext.writingMode}`, risksOrWarnings: [],

      },

      options: [

        { label: 'Best polished version', text: polished, whyThisWorks: 'Improves clarity while preserving meaning.' },

        { label: 'Shorter version', text: base.split(/\s+/).slice(0, Math.max(3, Math.ceil(base.split(/\s+/).length * 0.7))).join(' '), whyThisWorks: 'Removes filler.' },

        { label: 'More context-aware version', text: `[${input.appContext.writingMode}] ${base}`, whyThisWorks: 'Aligns with app context.' },

      ],

      memorySuggestions: [],

    };

  }

  async analyzeText(input: RewriteRequest) { return (await this.rewriteText(input)).analysisSummary; }

  async generateSuggestions(input: RewriteRequest, kind: ProactiveSuggestionKind): Promise<RewriteResponse> {

    if (kind === 'good_as_is') {

      return {

        analysisSummary: {

          detectedIntent: 'No change', detectedAudience: 'General', detectedSubject: 'Unspecified',

          recommendedTone: 'Keep as-is', appSpecificApproach: input.appContext.writingMode, risksOrWarnings: [],

        },

        options: [{ label: PROACTIVE_HEADLINES.good_as_is, text: input.originalText, whyThisWorks: 'Looks good already.' }],

        memorySuggestions: [],

      };

    }

    const result = await this.rewriteText({ ...input, requestedAction: kind === 'speech_cleanup' ? 'speech_cleanup' : 'polish' });

    return { ...result, options: result.options.slice(0, 1) };

  }

}



export function getAIProvider(): AIProvider {

  const provider = getSetting('ai_provider', 'openai');

  if (provider === 'gemini' && process.env.GEMINI_API_KEY) return new GeminiProvider();

  if (provider === 'openai' && process.env.OPENAI_API_KEY) return new OpenAIProvider();

  if (process.env.OPENAI_API_KEY) return new OpenAIProvider();

  if (process.env.GEMINI_API_KEY) return new GeminiProvider();

  return new MockProvider();

}



export function getProviderStatus(): { configured: boolean; provider: string; message: string } {

  const provider = getSetting('ai_provider', 'openai');

  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

  const hasGemini = Boolean(process.env.GEMINI_API_KEY);

  if (provider === 'openai' && hasOpenAI) return { configured: true, provider: 'openai', message: 'OpenAI configured' };

  if (provider === 'gemini' && hasGemini) return { configured: true, provider: 'gemini', message: 'Gemini configured' };

  if (hasOpenAI) return { configured: true, provider: 'openai', message: 'OpenAI configured (fallback)' };

  if (hasGemini) return { configured: true, provider: 'gemini', message: 'Gemini configured (fallback)' };

  return { configured: false, provider: 'mock', message: 'No API key found. Using offline mock rewrites.' };

}



function enrichRequest(request: RewriteRequest): RewriteRequest {

  return {

    ...request,

    userContext: { ...request.userContext, styleProfile: getStyleProfile(), savedMemories: request.userContext.savedMemories },

  };

}



export async function performRewrite(request: RewriteRequest): Promise<RewriteResponse> {

  return getAIProvider().rewriteText(enrichRequest(request));

}



export async function performProactiveSuggest(request: RewriteRequest, kind: ProactiveSuggestionKind) {

  const response = await getAIProvider().generateSuggestions(enrichRequest(request), kind);

  const option = response.options[0];

  return {

    suggestion: {

      kind,

      headline: PROACTIVE_HEADLINES[kind] ?? option.label,

      text: option.text,

      whyThisWorks: option.whyThisWorks,

      replaceFullField: kind === 'speech_cleanup' || request.requestedAction === 'speech_cleanup',

    },

    suggestions: response,

  };

}

