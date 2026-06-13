import type { BridgeRequest, RewriteRequest, SuggestRequest } from '@v/shared';
import {
  detectSpeechDictationPatterns,
  inferProactiveSuggestionKind,
  isSensitiveText,
  shouldSuggestRealtime,
} from '@v/shared';
import { buildAppContext, getSavedMemories } from './memoryService';
import { getSetting, isDomainExcluded, isPaused } from './database';
import { getBridgeSettings } from './bridgeSettings';
import { performProactiveSuggest, performRewrite } from './aiProvider';

function pickText(req: BridgeRequest): string {
  const rewriteOnlySelected = getSetting('rewrite_only_selected', 'true') === 'true';
  if (rewriteOnlySelected && req.selectedText.trim()) return req.selectedText.trim();
  return req.selectedText.trim() || req.fullFieldText.trim();
}

function buildRewriteRequest(req: BridgeRequest, text: string, action: RewriteRequest['requestedAction']): RewriteRequest {
  const context = buildAppContext({
    appName: 'Browser',
    windowTitle: req.pageTitle,
    browserUrl: req.url,
    domain: req.domain,
    fieldType: req.fieldMetadata.tagName,
  });
  return {
    originalText: text,
    selectedText: req.selectedText || null,
    surroundingText: req.fullFieldText,
    appContext: context,
    userContext: { styleProfile: {}, preferences: {}, savedMemories: getSavedMemories() as Record<string, unknown>[] },
    writingGoal: null,
    subject: null,
    audience: null,
    relationship: null,
    requestedAction: action,
    customInstruction: null,
    privacyMode: false,
  };
}

export async function handleRewriteRequest(body: unknown) {
  if (isPaused()) return { success: false, error: 'V is paused' };
  const req = body as BridgeRequest;
  if (isDomainExcluded(req.domain)) return { success: false, error: 'Domain is excluded' };
  const text = pickText(req);
  if (!text) return { success: false, error: 'No text in field' };
  if (isSensitiveText(text)) return { success: false, error: 'Sensitive text blocked' };
  const rewriteRequest = buildRewriteRequest(req, text, 'polish');
  const suggestions = await performRewrite(rewriteRequest);
  return { success: true, suggestions, context: rewriteRequest.appContext };
}

export async function handleSuggestRequest(body: unknown) {
  const settings = getBridgeSettings();
  if (settings.paused) return { success: false, error: 'V is paused' };
  const req = body as SuggestRequest;
  if (isDomainExcluded(req.domain)) return { success: false, error: 'Domain is excluded' };
  const text = pickText(req);
  if (!text) return { success: false, error: 'No text in field' };
  if (isSensitiveText(text)) return { success: false, error: 'Sensitive text blocked' };

  const speechAuto = settings.speechCleanupMode === 'auto' && detectSpeechDictationPatterns(text);
  const speechRequested = req.requestedAction === 'speech_cleanup' || req.trigger === 'speech' || speechAuto;

  if (req.trigger === 'pause' && !settings.realtimeSuggestions && !speechRequested) {
    return { success: false, error: 'Real-time suggestions are disabled' };
  }

  if (req.trigger === 'pause' && !shouldSuggestRealtime({
    enabled: settings.realtimeSuggestions || speechAuto,
    paused: settings.paused,
    text,
    minChars: settings.minCharsForSuggestion,
  }) && !speechRequested) {
    return { success: false, error: 'Text too short for suggestion' };
  }

  const rewriteRequest = buildRewriteRequest(
    req,
    text,
    speechRequested ? 'speech_cleanup' : (req.requestedAction ?? 'polish'),
  );

  const kind = speechRequested ? 'speech_cleanup' : inferProactiveSuggestionKind(text);
  if (kind === 'good_as_is' && req.trigger === 'pause' && !speechRequested) {
    return {
      success: true,
      suggestion: {
        kind,
        headline: 'This is good as-is',
        text,
        whyThisWorks: 'No change needed right now.',
        replaceFullField: false,
      },
      context: rewriteRequest.appContext,
    };
  }

  const result = await performProactiveSuggest(rewriteRequest, kind);
  return { success: true, ...result, context: rewriteRequest.appContext };
}

export function handleSettingsRequest() {
  return { success: true, settings: getBridgeSettings() };
}
