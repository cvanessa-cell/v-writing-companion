export type DiagnosticSource = 'desktop' | 'extension' | 'renderer';
export type DiagnosticStatus = 'info' | 'success' | 'error';

export interface DetailedDiagnosticRow {
  eventName: string;
  source: DiagnosticSource;
  status: DiagnosticStatus;
  stage: string | null;
  latencyMs: number | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

export interface ReleaseIdentity {
  appVersion: string | null;
  extensionVersion: string | null;
  releaseChannel: string | null;
}

export interface CountSummary {
  label: string;
  count: number;
}

export interface RateSummary {
  successful: number;
  failed: number;
  rate: number | null;
}

export interface LatencySummary {
  count: number;
  avg: number;
  p50: number;
  p95: number;
}

export interface TimeToFirstSuccessSummary {
  milliseconds: number;
  label: string;
}

export interface ReleaseHealthSummary {
  release: ReleaseIdentity;
  releaseLabel: string;
  eventCount: number;
  lastEventAt: string | null;
  successfulRewrites: number;
  failedEvents: number;
  bridgeReconnects: number;
  activationBlocks: number;
  activationRate: RateSummary;
  desktopRewriteRate: RateSummary;
  extensionFieldActivationRate: RateSummary;
  extensionRuntimeActivationRate: RateSummary;
  hotkeyToPanel: LatencySummary | null;
  timeToFirstSuccess: TimeToFirstSuccessSummary | null;
}

export interface ReleaseDelta {
  label: string;
  current: string;
  previous: string;
}

export interface ReleaseVerdict {
  status: 'healthy' | 'watch' | 'needs_attention';
  title: string;
  summary: string;
  reasons: string[];
}

export interface ReleaseComparisonSummary {
  current: ReleaseHealthSummary;
  previous: ReleaseHealthSummary | null;
  verdict: ReleaseVerdict;
  deltas: ReleaseDelta[];
  comparisonNote: string;
}

function summarizeCounts(rows: DetailedDiagnosticRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.eventName] = (counts[row.eventName] ?? 0) + 1;
  }
  return counts;
}

export function summarizeRate(successful: number, failed: number): RateSummary {
  const total = successful + failed;
  return {
    successful,
    failed,
    rate: total > 0 ? Number(((successful / total) * 100).toFixed(1)) : null,
  };
}

export function summarizeLatency(rows: DetailedDiagnosticRow[], eventName: string): LatencySummary | null {
  const values = rows
    .filter((row) => row.eventName === eventName && typeof row.latencyMs === 'number')
    .map((row) => Number(row.latencyMs))
    .sort((a, b) => a - b);
  if (values.length === 0) return null;

  const p50Index = Math.floor((values.length - 1) * 0.5);
  const p95Index = Math.floor((values.length - 1) * 0.95);

  return {
    count: values.length,
    avg: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)),
    p50: Number(values[p50Index].toFixed(2)),
    p95: Number(values[p95Index].toFixed(2)),
  };
}

export function summarizeTimeToFirstSuccess(
  rows: DetailedDiagnosticRow[],
): TimeToFirstSuccessSummary | null {
  const ordered = [...rows].reverse();
  const firstLaunch = ordered.find((row) => row.eventName === 'app_launched');
  const firstSuccess = ordered.find((row) =>
    ['rewrite_completed', 'extension_rewrite_accepted', 'suggestion_accepted'].includes(row.eventName),
  );

  if (!firstLaunch || !firstSuccess) return null;

  const launchAt = Date.parse(firstLaunch.createdAt);
  const successAt = Date.parse(firstSuccess.createdAt);
  if (Number.isNaN(launchAt) || Number.isNaN(successAt) || successAt < launchAt) return null;

  const milliseconds = successAt - launchAt;
  const totalSeconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return {
    milliseconds,
    label: minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`,
  };
}

export function getReleaseIdentity(detail: Record<string, unknown> | null): ReleaseIdentity {
  return {
    appVersion: typeof detail?.appVersion === 'string' ? detail.appVersion : null,
    extensionVersion: typeof detail?.extensionVersion === 'string' ? detail.extensionVersion : null,
    releaseChannel: typeof detail?.releaseChannel === 'string' ? detail.releaseChannel : null,
  };
}

export function formatReleaseLabel(release: ReleaseIdentity): string {
  return [
    release.appVersion ? `Desktop ${release.appVersion}` : null,
    release.extensionVersion ? `Extension ${release.extensionVersion}` : null,
    release.releaseChannel,
  ]
    .filter(Boolean)
    .join(' | ') || 'Unversioned diagnostics';
}

function releaseKey(release: ReleaseIdentity): string | null {
  if (!release.appVersion && !release.extensionVersion && !release.releaseChannel) return null;
  return [release.appVersion ?? 'na', release.extensionVersion ?? 'na', release.releaseChannel ?? 'na'].join('|');
}

export function rowMatchesRelease(row: DetailedDiagnosticRow, release: ReleaseIdentity): boolean {
  return releaseKey(getReleaseIdentity(row.detail)) === releaseKey(release);
}

export function summarizeReleaseHealth(
  rows: DetailedDiagnosticRow[],
  release: ReleaseIdentity,
): ReleaseHealthSummary {
  const counts = summarizeCounts(rows);
  return {
    release,
    releaseLabel: formatReleaseLabel(release),
    eventCount: rows.length,
    lastEventAt: rows[0]?.createdAt ?? null,
    successfulRewrites:
      (counts.rewrite_completed ?? 0) +
      (counts.extension_rewrite_accepted ?? 0) +
      (counts.suggestion_accepted ?? 0),
    failedEvents: rows.filter((row) => row.status === 'error').length,
    bridgeReconnects: counts.extension_bridge_connected ?? 0,
    activationBlocks: counts.extension_activation_blocked ?? 0,
    activationRate: summarizeRate(
      counts.rewrite_completed ?? 0,
      Math.max((counts.app_launched ?? 0) - (counts.rewrite_completed ?? 0), 0),
    ),
    desktopRewriteRate: summarizeRate(counts.rewrite_completed ?? 0, counts.rewrite_failed ?? 0),
    extensionFieldActivationRate: summarizeRate(
      counts.supported_field_seen ?? 0,
      Math.max((counts.content_script_bootstrapped ?? 0) - (counts.supported_field_seen ?? 0), 0),
    ),
    extensionRuntimeActivationRate: summarizeRate(
      counts.full_runtime_activated ?? 0,
      Math.max((counts.supported_field_seen ?? 0) - (counts.full_runtime_activated ?? 0), 0),
    ),
    hotkeyToPanel: summarizeLatency(rows, 'hotkey_panel_ready'),
    timeToFirstSuccess: summarizeTimeToFirstSuccess(rows),
  };
}

function formatRateValue(rate: RateSummary): string {
  return rate.rate == null ? 'No samples' : `${rate.rate}%`;
}

function pushDelta(
  deltas: ReleaseDelta[],
  label: string,
  currentValue: string | null,
  previousValue: string | null,
): void {
  if (!currentValue || !previousValue) return;
  deltas.push({ label, current: currentValue, previous: previousValue });
}

export function buildReleaseComparison(
  rows: DetailedDiagnosticRow[],
  currentRelease: ReleaseIdentity,
): ReleaseComparisonSummary {
  const currentRows = rows.filter((row) => rowMatchesRelease(row, currentRelease));
  const current = summarizeReleaseHealth(currentRows, currentRelease);

  const currentKey = releaseKey(currentRelease);
  const previousKey = rows
    .map((row) => releaseKey(getReleaseIdentity(row.detail)))
    .find((key) => key && key !== currentKey) ?? null;

  const previousRows = previousKey
    ? rows.filter((row) => releaseKey(getReleaseIdentity(row.detail)) === previousKey)
    : [];
  const previous = previousRows.length > 0
    ? summarizeReleaseHealth(previousRows, getReleaseIdentity(previousRows[0].detail))
    : null;

  const reasons: string[] = [];
  let status: ReleaseVerdict['status'] = 'healthy';
  let title = 'Release looks healthy';
  let summary = 'Current release has success evidence and no clear regression signal in local diagnostics.';

  if (current.eventCount === 0) {
    status = 'needs_attention';
    title = 'No release evidence yet';
    summary = 'Run the first-success path once so this release has comparable diagnostics.';
    reasons.push('No current-release diagnostics are tagged yet.');
  } else {
    if (current.successfulRewrites === 0) {
      status = 'needs_attention';
      title = 'No successful rewrite recorded';
      summary = 'Current release activity exists, but first-value success has not been proven yet.';
      reasons.push('Current release has zero successful rewrites or accepted suggestions.');
    }

    if (current.failedEvents > current.successfulRewrites && status !== 'needs_attention') {
      status = 'watch';
      title = 'Errors are outweighing wins';
      summary = 'Current release is active, but error volume is higher than success volume.';
      reasons.push(
        `Failed events (${current.failedEvents}) exceed successful rewrites (${current.successfulRewrites}).`,
      );
    }

    if ((current.hotkeyToPanel?.p50 ?? 0) >= 1000) {
      if (status === 'healthy') {
        status = 'watch';
        title = 'Desktop latency needs attention';
        summary = 'The core desktop path is functioning, but hotkey latency is still materially high.';
      }
      reasons.push(`Hotkey-to-panel p50 is ${current.hotkeyToPanel?.p50} ms.`);
    }

    if (
      current.activationBlocks > 0 &&
      current.activationBlocks >= Math.max(current.bridgeReconnects, 1) &&
      status === 'healthy'
    ) {
      status = 'watch';
      title = 'Extension activation has friction';
      summary = 'Extension activation is recording blocks often enough to warrant review.';
      reasons.push(
        `Activation blocks (${current.activationBlocks}) are high relative to bridge reconnects (${current.bridgeReconnects}).`,
      );
    }
  }

  const deltas: ReleaseDelta[] = [];
  let comparisonNote = 'No previous version-tagged diagnostics found yet.';

  if (previous) {
    comparisonNote = `Comparing against ${previous.releaseLabel}.`;
    pushDelta(deltas, 'Successful rewrites', String(current.successfulRewrites), String(previous.successfulRewrites));
    pushDelta(deltas, 'Failed events', String(current.failedEvents), String(previous.failedEvents));
    pushDelta(deltas, 'Activation rate', formatRateValue(current.activationRate), formatRateValue(previous.activationRate));
    pushDelta(
      deltas,
      'Field activation rate',
      formatRateValue(current.extensionFieldActivationRate),
      formatRateValue(previous.extensionFieldActivationRate),
    );
    pushDelta(
      deltas,
      'Runtime activation rate',
      formatRateValue(current.extensionRuntimeActivationRate),
      formatRateValue(previous.extensionRuntimeActivationRate),
    );
    pushDelta(
      deltas,
      'Hotkey p50',
      current.hotkeyToPanel ? `${current.hotkeyToPanel.p50} ms` : null,
      previous.hotkeyToPanel ? `${previous.hotkeyToPanel.p50} ms` : null,
    );

    if (
      current.desktopRewriteRate.rate != null &&
      previous.desktopRewriteRate.rate != null &&
      current.desktopRewriteRate.rate + 5 < previous.desktopRewriteRate.rate
    ) {
      if (status === 'healthy') {
        status = 'watch';
        title = 'Desktop success rate slipped';
        summary = 'Current release is working, but desktop rewrite success rate is lower than the previous tagged release.';
      }
      reasons.push(
        `Desktop rewrite success moved from ${previous.desktopRewriteRate.rate}% to ${current.desktopRewriteRate.rate}%.`,
      );
    }

    if (
      current.extensionFieldActivationRate.rate != null &&
      previous.extensionFieldActivationRate.rate != null &&
      current.extensionFieldActivationRate.rate + 5 < previous.extensionFieldActivationRate.rate
    ) {
      if (status === 'healthy') {
        status = 'watch';
        title = 'Extension activation efficiency slipped';
        summary = 'Supported-field activation is lower than the previous tagged release.';
      }
      reasons.push(
        `Field activation moved from ${previous.extensionFieldActivationRate.rate}% to ${current.extensionFieldActivationRate.rate}%.`,
      );
    }
  } else {
    reasons.push('No prior version-tagged diagnostics are stored locally for direct release-over-release comparison yet.');
  }

  return {
    current,
    previous,
    verdict: {
      status,
      title,
      summary,
      reasons,
    },
    deltas,
    comparisonNote,
  };
}
