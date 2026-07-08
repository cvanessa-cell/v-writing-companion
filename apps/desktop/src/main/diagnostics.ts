import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getDatabase } from './database';
import { getReleaseMetadata } from './releaseMetadata';
import {
  buildReleaseComparison,
  getReleaseIdentity,
  rowMatchesRelease,
  summarizeLatency,
  summarizeRate,
  summarizeReleaseHealth,
  summarizeTimeToFirstSuccess,
  type CountSummary,
  type DetailedDiagnosticRow,
} from './diagnosticSummary';

export type DiagnosticSource = 'desktop' | 'extension' | 'renderer';
export type DiagnosticStatus = 'info' | 'success' | 'error';

export interface DiagnosticEventInput {
  eventName: string;
  source: DiagnosticSource;
  status: DiagnosticStatus;
  stage?: string;
  latencyMs?: number;
  detail?: Record<string, unknown> | null;
}

interface DiagnosticRow {
  id: number;
  event_name: string;
  source: DiagnosticSource;
  status: DiagnosticStatus;
  stage: string | null;
  latency_ms: number | null;
  detail_json: string | null;
  created_at: string;
}

interface DomainOutcomeSummary {
  domain: string;
  successes: number;
  failures: number;
  blocked: number;
  lastEventAt: string;
}

interface PackagingReadinessSummary {
  status: 'ready' | 'needs_verification' | 'blocked';
  summary: string;
  verifiedAt: string | null;
  verifiedNodeVersion: string | null;
  verifiedElectronVersion: string | null;
  recommendedNodeRange: string;
  packagingCommand: string;
  artifactPath: string | null;
  knownBlocker: string | null;
}

interface PackagingStatusFile {
  status?: PackagingReadinessSummary['status'];
  summary?: string;
  verifiedAt?: string;
  verifiedNodeVersion?: string;
  verifiedElectronVersion?: string;
  recommendedNodeRange?: string;
  packagingCommand?: string;
  artifactPath?: string;
  knownBlocker?: string | null;
}

function sanitizeValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string') {
    return value.length > 180 ? `${value.slice(0, 177)}...` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 10).map((item) => sanitizeValue(item));
  if (typeof value === 'object') {
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (/text|prompt|content|original|rewritten/i.test(key)) {
        next[key] = '[redacted]';
      } else {
        next[key] = sanitizeValue(entry);
      }
    }
    return next;
  }
  return String(value);
}

function parseDetail(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function rowMatchesCurrentRelease(
  row: DetailedDiagnosticRow,
  release: ReturnType<typeof getReleaseMetadata>,
): boolean {
  return rowMatchesRelease(row, release);
}

function getDetailField(row: DetailedDiagnosticRow, key: string): string | null {
  const value = row.detail?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function summarizeDomainOutcomes(rows: DetailedDiagnosticRow[]): DomainOutcomeSummary[] {
  const domainMap = new Map<string, DomainOutcomeSummary>();

  for (const row of rows) {
    const domain = getDetailField(row, 'domain');
    if (!domain) continue;

    const current = domainMap.get(domain) ?? {
      domain,
      successes: 0,
      failures: 0,
      blocked: 0,
      lastEventAt: row.createdAt,
    };

    if (
      row.eventName === 'extension_rewrite_accepted' ||
      row.eventName === 'suggestion_accepted' ||
      row.eventName === 'extension_rewrite_review_shown' ||
      row.eventName === 'suggestion_shown'
    ) {
      current.successes += 1;
    }

    if (
      row.eventName === 'bridge_unavailable' ||
      row.eventName === 'extension_rewrite_response' ||
      row.eventName === 'extension_suggest_response'
    ) {
      if (row.status === 'error') current.failures += 1;
    }

    if (row.eventName === 'extension_activation_blocked') {
      current.blocked += 1;
    }

    if (row.createdAt > current.lastEventAt) current.lastEventAt = row.createdAt;
    domainMap.set(domain, current);
  }

  return [...domainMap.values()]
    .filter((entry) => entry.successes > 0 || entry.failures > 0 || entry.blocked > 0)
    .sort((a, b) =>
      b.failures - a.failures ||
      b.blocked - a.blocked ||
      b.successes - a.successes ||
      a.domain.localeCompare(b.domain),
    )
    .slice(0, 5);
}

function getPackagingReadiness(): PackagingReadinessSummary {
  const statusFileCandidates = [
    resolve(process.cwd(), 'apps/desktop/packaging-status.json'),
    resolve(__dirname, '../../packaging-status.json'),
  ];

  for (const candidate of statusFileCandidates) {
    try {
      const parsed = JSON.parse(readFileSync(candidate, 'utf8')) as PackagingStatusFile;
      if (!parsed.status || !parsed.summary || !parsed.packagingCommand) continue;
      return {
        status: parsed.status,
        summary: parsed.summary,
        verifiedAt: parsed.verifiedAt ?? null,
        verifiedNodeVersion: parsed.verifiedNodeVersion ?? null,
        verifiedElectronVersion: parsed.verifiedElectronVersion ?? null,
        recommendedNodeRange: parsed.recommendedNodeRange ?? 'Node 18+ with the checked-in desktop packaging command',
        packagingCommand: parsed.packagingCommand,
        artifactPath: parsed.artifactPath ?? null,
        knownBlocker: parsed.knownBlocker ?? null,
      };
    } catch {
      // Ignore missing or invalid status snapshots and fall back to a conservative summary.
    }
  }

  return {
    status: 'needs_verification',
    summary: 'Packaging uses the checked-in desktop packaging command, but this machine has not recorded a verified packaging snapshot yet.',
    verifiedAt: null,
    verifiedNodeVersion: null,
    verifiedElectronVersion: null,
    recommendedNodeRange: 'Node 18+ with the checked-in desktop packaging command',
    packagingCommand: 'npm run package:dir -w @v/desktop',
    artifactPath: null,
    knownBlocker: null,
  };
}

export function logDiagnosticEvent(input: DiagnosticEventInput): void {
  const release = getReleaseMetadata();
  const detail = sanitizeValue({
    ...(input.detail ?? {}),
    appVersion: release.appVersion,
    extensionVersion: input.source === 'extension'
      ? (input.detail?.extensionVersion as string | undefined) ?? release.extensionVersion
      : release.extensionVersion,
    releaseChannel: release.releaseChannel,
  }) as Record<string, unknown>;
  getDatabase()
    .prepare(
      `INSERT INTO diagnostic_events (event_name, source, status, stage, latency_ms, detail_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.eventName,
      input.source,
      input.status,
      input.stage ?? null,
      input.latencyMs ?? null,
      JSON.stringify(detail),
    );
}

export function getDiagnosticEvents(limit = 50) {
  const rows = getDatabase()
    .prepare(
      `SELECT id, event_name, source, status, stage, latency_ms, detail_json, created_at
       FROM diagnostic_events
       ORDER BY id DESC
       LIMIT ?`,
    )
    .all(limit) as DiagnosticRow[];

  return rows.map((row) => ({
    id: row.id,
    eventName: row.event_name,
    source: row.source,
    status: row.status,
    stage: row.stage,
    latencyMs: row.latency_ms,
    detail: parseDetail(row.detail_json),
    createdAt: row.created_at,
  }));
}

export function getDiagnosticsSummary() {
  const release = getReleaseMetadata();
  const rows = getDatabase()
    .prepare(
      `SELECT id, event_name, source, status, stage, latency_ms, detail_json, created_at
       FROM diagnostic_events
       WHERE created_at >= datetime('now', '-7 days')
       ORDER BY id DESC
       LIMIT 500`,
    )
    .all() as DiagnosticRow[];

  const parsedRows: DetailedDiagnosticRow[] = rows.map((row) => ({
    eventName: row.event_name,
    source: row.source,
    status: row.status,
    stage: row.stage,
    latencyMs: row.latency_ms,
    detail: parseDetail(row.detail_json),
    createdAt: row.created_at,
  }));

  const currentVersionRows = parsedRows.filter((row) => rowMatchesCurrentRelease(row, release));
  const releaseComparison = buildReleaseComparison(parsedRows, getReleaseIdentity({
    appVersion: release.appVersion,
    extensionVersion: release.extensionVersion,
    releaseChannel: release.releaseChannel,
  }));

  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.event_name] = (counts[row.event_name] ?? 0) + 1;

  const lastFailure = parsedRows.find((row) => row.status === 'error') ?? null;
  const lastRewriteSuccess = parsedRows.find((row) =>
    ['rewrite_completed', 'extension_rewrite_accepted', 'suggestion_accepted'].includes(row.eventName),
  ) ?? null;
  const lastBridgeConnected = parsedRows.find((row) => row.eventName === 'extension_bridge_connected') ?? null;

  const failureReasons = summarizeCounts(
    parsedRows
      .filter((row) => row.status === 'error')
      .map((row) => getDetailField(row, 'reason') ?? row.eventName),
  );

  const domainHotspots = summarizeCounts(
    parsedRows
      .filter((row) =>
        row.eventName === 'bridge_unavailable' ||
        row.eventName === 'extension_activation_blocked' ||
        row.status === 'error',
      )
      .map((row) => getDetailField(row, 'domain'))
      .filter((value): value is string => Boolean(value)),
  );

  const desktopRewriteRate = summarizeRate(counts.rewrite_completed ?? 0, counts.rewrite_failed ?? 0);
  const replacementRate = summarizeRate(counts.replace_succeeded ?? 0, counts.replace_failed ?? 0);
  const extensionEngagementRate = summarizeRate(
    (counts.extension_rewrite_accepted ?? 0) + (counts.suggestion_accepted ?? 0),
    (counts.bridge_unavailable ?? 0) + (counts.extension_activation_blocked ?? 0),
  );
  const activationRate = summarizeRate(
    counts.rewrite_completed ?? 0,
    Math.max((counts.app_launched ?? 0) - (counts.rewrite_completed ?? 0), 0),
  );
  const timeToFirstSuccess = summarizeTimeToFirstSuccess(parsedRows);
  const topDomainOutcomes = summarizeDomainOutcomes(parsedRows);

  return {
    eventCountLast7Days: rows.length,
    lastEventAt: rows[0]?.created_at ?? null,
    lastSuccessfulRewriteAt: lastRewriteSuccess?.createdAt ?? null,
    lastBridgeConnectedAt: lastBridgeConnected?.createdAt ?? null,
    lastFailure: lastFailure
      ? {
          eventName: lastFailure.eventName,
          source: lastFailure.source,
          stage: lastFailure.stage,
          createdAt: lastFailure.createdAt,
          detail: lastFailure.detail,
        }
      : null,
    counts: {
      appLaunched: counts.app_launched ?? 0,
      hotkeyTriggered: counts.hotkey_triggered ?? 0,
      rewriteCompleted: counts.rewrite_completed ?? 0,
      rewriteFailed: counts.rewrite_failed ?? 0,
      replaceSucceeded: counts.replace_succeeded ?? 0,
      replaceFailed: counts.replace_failed ?? 0,
      extensionRewriteAccepted: counts.extension_rewrite_accepted ?? 0,
      extensionRewriteDismissed: counts.extension_rewrite_dismissed ?? 0,
      suggestionShown: counts.suggestion_shown ?? 0,
      suggestionAccepted: counts.suggestion_accepted ?? 0,
      bridgeUnavailable: counts.bridge_unavailable ?? 0,
      bridgeConnected: counts.extension_bridge_connected ?? 0,
      activationBlocked: counts.extension_activation_blocked ?? 0,
      contentScriptBootstrapped: counts.content_script_bootstrapped ?? 0,
      supportedFieldSeen: counts.supported_field_seen ?? 0,
      fullRuntimeActivated: counts.full_runtime_activated ?? 0,
    },
    release,
    currentVersion: summarizeReleaseHealth(currentVersionRows, release),
    previousVersion: releaseComparison.previous,
    releaseVerdict: releaseComparison.verdict,
    releaseComparison: {
      note: releaseComparison.comparisonNote,
      deltas: releaseComparison.deltas,
    },
    funnel: {
      activationRate,
      desktopRewriteRate,
      replacementRate,
      extensionEngagementRate,
      timeToFirstSuccess,
      extensionFieldActivationRate: summarizeRate(
        counts.supported_field_seen ?? 0,
        Math.max((counts.content_script_bootstrapped ?? 0) - (counts.supported_field_seen ?? 0), 0),
      ),
      extensionRuntimeActivationRate: summarizeRate(
        counts.full_runtime_activated ?? 0,
        Math.max((counts.supported_field_seen ?? 0) - (counts.full_runtime_activated ?? 0), 0),
      ),
    },
    latencyMs: {
      hotkeyToPanel: summarizeLatency(parsedRows, 'hotkey_panel_ready'),
      panelRendererLoaded: summarizeLatency(parsedRows, 'panel_renderer_loaded'),
      firstOptionRendered: summarizeLatency(parsedRows, 'first_option_rendered'),
      activeWindow: summarizeLatency(parsedRows, 'active_window_resolved'),
      captureSelected: summarizeLatency(parsedRows, 'capture_selected'),
      replaceText: summarizeLatency(parsedRows, 'replace_selected_text'),
      bridgeRewrite: summarizeLatency(parsedRows, 'extension_rewrite_response'),
      bridgeSuggest: summarizeLatency(parsedRows, 'extension_suggest_response'),
    },
    packagingReadiness: getPackagingReadiness(),
    topFailureReasons: failureReasons,
    topProblemDomains: domainHotspots,
    topDomainOutcomes,
    recentEvents: getDiagnosticEvents(12),
  };
}

function summarizeCounts(values: string[]): CountSummary[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));
}
