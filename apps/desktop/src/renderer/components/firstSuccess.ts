type DiagnosticsPayload = Awaited<ReturnType<typeof window.v.getSettings>>['diagnostics'];

export interface FirstSuccessStep {
  title: string;
  description: string;
  done: boolean;
  proof: string;
}

export interface FirstSuccessPlan {
  headline: string;
  summary: string;
  nextActionTitle: string;
  nextActionDetail: string;
  steps: FirstSuccessStep[];
  proofItems: string[];
  checklistText: string;
}

export function buildFirstSuccessPlan({
  providerConfigured,
  bridgeUrl,
  diagnostics,
}: {
  providerConfigured: boolean;
  bridgeUrl: string;
  diagnostics: DiagnosticsPayload;
}): FirstSuccessPlan {
  const desktopReady = diagnostics.counts.rewriteCompleted > 0;
  const browserReady =
    diagnostics.counts.extensionRewriteAccepted > 0 || diagnostics.counts.suggestionAccepted > 0;
  const bridgeReady = diagnostics.counts.bridgeConnected > 0;
  const packagingReady = diagnostics.packagingReadiness.status === 'ready';

  const steps: FirstSuccessStep[] = [
    {
      title: 'Connect an AI provider',
      description: 'Add an API key so desktop and browser rewrites use a real model instead of the mock fallback.',
      done: providerConfigured,
      proof: providerConfigured ? 'Provider is ready in Settings.' : 'Provider is still missing an API key.',
    },
    {
      title: 'Complete one desktop hotkey rewrite',
      description: 'Select text in a Windows app and press Ctrl+Shift+Space to prove the core capture and rewrite path.',
      done: desktopReady,
      proof: desktopReady
        ? `Diagnostics recorded ${diagnostics.counts.rewriteCompleted} desktop rewrites.`
        : 'No desktop rewrite has been recorded yet.',
    },
    {
      title: 'Accept one browser rewrite or suggestion',
      description: 'Load the extension on a normal text field and accept one in-place change to validate the browser path.',
      done: browserReady,
      proof: browserReady
        ? `Diagnostics recorded ${diagnostics.counts.extensionRewriteAccepted + diagnostics.counts.suggestionAccepted} accepted browser changes.`
        : 'No accepted browser rewrite or suggestion is recorded yet.',
    },
  ];

  let nextActionTitle = 'Run the full first-success path';
  let nextActionDetail = 'Complete the provider, desktop, and browser steps so this release has usable first-value proof.';

  if (!providerConfigured) {
    nextActionTitle = 'Connect a real provider first';
    nextActionDetail = 'Add an OpenAI or Gemini key in Settings before validating desktop or browser rewrites.';
  } else if (!desktopReady) {
    nextActionTitle = 'Prove the desktop rewrite path';
    nextActionDetail = 'Select text in a normal Windows app, press Ctrl+Shift+Space, and accept one rewrite.';
  } else if (!browserReady) {
    nextActionTitle = 'Prove the browser rewrite path';
    nextActionDetail = 'Keep the desktop bridge running, focus a supported text field, and accept one browser rewrite or suggestion.';
  } else if (!packagingReady) {
    nextActionTitle = 'Refresh release proof for this build';
    nextActionDetail = 'User value is proven. Refresh the local packaging snapshot before treating this build as release-ready.';
  } else {
    nextActionTitle = 'Share and compare this release';
    nextActionDetail = 'This release has first-success proof across desktop and browser plus a verified packaging snapshot.';
  }

  const headline = browserReady && desktopReady
    ? 'V is proving value in both desktop and browser flows.'
    : 'Use this checklist to prove V works before you change anything bigger.';

  const summary = [
    `Bridge endpoint: ${bridgeUrl}`,
    bridgeReady ? 'Bridge has connected recently.' : 'No recent bridge connection is recorded yet.',
    packagingReady
      ? `Packaging is ready: ${diagnostics.packagingReadiness.summary}`
      : `Packaging still needs follow-through: ${diagnostics.packagingReadiness.summary}`,
  ].join(' ');

  const proofItems = [
    `Desktop rewrites: ${diagnostics.counts.rewriteCompleted}`,
    `Browser accepts: ${diagnostics.counts.extensionRewriteAccepted + diagnostics.counts.suggestionAccepted}`,
    `Bridge reconnects: ${diagnostics.counts.bridgeConnected}`,
    `Time to first success: ${diagnostics.funnel.timeToFirstSuccess?.label ?? 'Not recorded yet'}`,
  ];

  const checklistLines = [
    'V first-success checklist',
    '',
    `Headline: ${headline}`,
    `Next action: ${nextActionTitle} - ${nextActionDetail}`,
    '',
    ...steps.map((step, index) => `${index + 1}. [${step.done ? 'x' : ' '}] ${step.title} - ${step.description}`),
    '',
    'Proof snapshot:',
    ...proofItems.map((item) => `- ${item}`),
    `- Packaging: ${diagnostics.packagingReadiness.summary}`,
    `- Release verdict: ${diagnostics.releaseVerdict.title}`,
  ];

  return {
    headline,
    summary,
    nextActionTitle,
    nextActionDetail,
    steps,
    proofItems,
    checklistText: checklistLines.join('\n'),
  };
}
