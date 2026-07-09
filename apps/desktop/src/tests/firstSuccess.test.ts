import { describe, expect, it } from 'vitest';
import { buildFirstSuccessPlan } from '../renderer/components/firstSuccess';

function makeDiagnostics(overrides?: Partial<Awaited<ReturnType<typeof window.v.getSettings>>['diagnostics']>) {
  return {
    counts: {
      rewriteCompleted: 0,
      extensionRewriteAccepted: 0,
      suggestionAccepted: 0,
      bridgeConnected: 0,
    },
    packagingReadiness: {
      status: 'needs_verification' as const,
      summary: 'Packaging has not been verified yet.',
    },
    funnel: {
      timeToFirstSuccess: null,
    },
    releaseVerdict: {
      title: 'No release evidence yet',
    },
    ...overrides,
  } as Awaited<ReturnType<typeof window.v.getSettings>>['diagnostics'];
}

describe('buildFirstSuccessPlan', () => {
  it('prioritizes provider setup before rewrite proof', () => {
    const plan = buildFirstSuccessPlan({
      providerConfigured: false,
      bridgeUrl: 'http://127.0.0.1:47821',
      diagnostics: makeDiagnostics(),
    });

    expect(plan.nextActionTitle).toBe('Connect a real provider first');
    expect(plan.steps[0].done).toBe(false);
  });

  it('asks for desktop proof after provider setup', () => {
    const plan = buildFirstSuccessPlan({
      providerConfigured: true,
      bridgeUrl: 'http://127.0.0.1:47821',
      diagnostics: makeDiagnostics(),
    });

    expect(plan.nextActionTitle).toBe('Prove the desktop rewrite path');
    expect(plan.steps[0].done).toBe(true);
    expect(plan.steps[1].done).toBe(false);
  });

  it('asks for browser proof after desktop proof exists', () => {
    const plan = buildFirstSuccessPlan({
      providerConfigured: true,
      bridgeUrl: 'http://127.0.0.1:47821',
      diagnostics: makeDiagnostics({
        counts: {
          rewriteCompleted: 1,
          extensionRewriteAccepted: 0,
          suggestionAccepted: 0,
          bridgeConnected: 1,
        },
      }),
    });

    expect(plan.nextActionTitle).toBe('Prove the browser rewrite path');
    expect(plan.steps[1].done).toBe(true);
    expect(plan.steps[2].done).toBe(false);
  });

  it('moves to release proof after desktop and browser value are proven', () => {
    const plan = buildFirstSuccessPlan({
      providerConfigured: true,
      bridgeUrl: 'http://127.0.0.1:47821',
      diagnostics: makeDiagnostics({
        counts: {
          rewriteCompleted: 2,
          extensionRewriteAccepted: 1,
          suggestionAccepted: 0,
          bridgeConnected: 2,
        },
        packagingReadiness: {
          status: 'ready',
          summary: 'Packaging was verified on this machine.',
        },
      }),
    });

    expect(plan.nextActionTitle).toBe('Share and compare this release');
    expect(plan.steps.every((step) => step.done)).toBe(true);
  });
});
