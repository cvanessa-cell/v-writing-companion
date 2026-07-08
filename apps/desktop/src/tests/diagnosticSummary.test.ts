import { describe, expect, it } from 'vitest';
import {
  buildReleaseComparison,
  type DetailedDiagnosticRow,
  type ReleaseIdentity,
} from '../main/diagnosticSummary';

function makeRow(
  eventName: string,
  createdAt: string,
  detail: Record<string, unknown>,
  overrides: Partial<DetailedDiagnosticRow> = {},
): DetailedDiagnosticRow {
  return {
    eventName,
    createdAt,
    detail,
    source: 'desktop',
    status: 'success',
    stage: null,
    latencyMs: null,
    ...overrides,
  };
}

describe('buildReleaseComparison', () => {
  it('marks a current release with no successful rewrites as needing attention', () => {
    const release: ReleaseIdentity & Record<string, unknown> = {
      appVersion: '0.2.0',
      extensionVersion: '0.2.0',
      releaseChannel: 'development',
    };
    const rows: DetailedDiagnosticRow[] = [
      makeRow('app_launched', '2026-07-07T18:00:00.000Z', release),
      makeRow('rewrite_failed', '2026-07-07T18:00:01.000Z', release, { status: 'error' }),
    ];

    const summary = buildReleaseComparison(rows, release);

    expect(summary.verdict.status).toBe('needs_attention');
    expect(summary.verdict.title).toContain('No successful rewrite');
    expect(summary.current.successfulRewrites).toBe(0);
  });

  it('finds the previous tagged release and exposes comparable deltas', () => {
    const current: ReleaseIdentity & Record<string, unknown> = {
      appVersion: '0.2.0',
      extensionVersion: '0.2.0',
      releaseChannel: 'development',
    };
    const previous: ReleaseIdentity & Record<string, unknown> = {
      appVersion: '0.1.0',
      extensionVersion: '0.1.0',
      releaseChannel: 'development',
    };
    const rows: DetailedDiagnosticRow[] = [
      makeRow('rewrite_completed', '2026-07-07T18:02:00.000Z', current),
      makeRow('hotkey_panel_ready', '2026-07-07T18:01:00.000Z', current, { latencyMs: 820 }),
      makeRow('panel_renderer_loaded', '2026-07-07T18:01:01.000Z', current, { latencyMs: 120 }),
      makeRow('first_option_rendered', '2026-07-07T18:01:02.000Z', current, { latencyMs: 760 }),
      makeRow('app_launched', '2026-07-07T18:00:00.000Z', current),
      makeRow('rewrite_completed', '2026-07-06T18:02:00.000Z', previous),
      makeRow('rewrite_completed', '2026-07-06T18:01:30.000Z', previous),
      makeRow('hotkey_panel_ready', '2026-07-06T18:01:00.000Z', previous, { latencyMs: 540 }),
      makeRow('panel_renderer_loaded', '2026-07-06T18:01:01.000Z', previous, { latencyMs: 95 }),
      makeRow('first_option_rendered', '2026-07-06T18:01:02.000Z', previous, { latencyMs: 610 }),
      makeRow('app_launched', '2026-07-06T18:00:00.000Z', previous),
    ];

    const summary = buildReleaseComparison(rows, current);

    expect(summary.previous?.release.appVersion).toBe('0.1.0');
    expect(summary.deltas.some((delta) => delta.label === 'Successful rewrites')).toBe(true);
    expect(summary.deltas.some((delta) => delta.label === 'Renderer loaded p50')).toBe(true);
    expect(summary.deltas.some((delta) => delta.label === 'First option p50')).toBe(true);
    expect(summary.comparisonNote).toContain('Desktop 0.1.0');
  });
});
