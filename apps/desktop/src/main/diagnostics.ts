import { getDatabase } from './database';

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

interface CountSummary {
  label: string;
  count: number;
}

interface RateSummary {
  successful: number;
  failed: number;
  rate: number | null;
}

interface DomainOutcomeSummary {
  domain: string;
  successes: number;
  failures: number;
  blocked: number;
  lastEventAt: string;
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

function getDetailField(row: DiagnosticRow, key: string): string | null {
  const detail = parseDetail(row.detail_json);
  const value = detail?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function summarizeLatency(rows: DiagnosticRow[], eventName: string) {
  const values = rows
    .filter((row) => row.event_name === eventName && typeof row.latency_ms === 'number')
    .map((row) => Number(row.latency_ms))
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

function summarizeRate(successful: number, failed: number): RateSummary {
  const total = successful + failed;
  return {
    successful,
    failed,
    rate: total > 0 ? Number(((successful / total) * 100).toFixed(1)) : null,
  };
}

function summarizeDomainOutcomes(rows: DiagnosticRow[]): DomainOutcomeSummary[] {
  const domainMap = new Map<string, DomainOutcomeSummary>();

  for (const row of rows) {
    const domain = getDetailField(row, 'domain');
    if (!domain) continue;

    const current = domainMap.get(domain) ?? {
      domain,
      successes: 0,
      failures: 0,
      blocked: 0,
      lastEventAt: row.created_at,
    };

    if (
      row.event_name === 'extension_rewrite_accepted' ||
      row.event_name === 'suggestion_accepted' ||
      row.event_name === 'extension_rewrite_review_shown' ||
      row.event_name === 'suggestion_shown'
    ) {
      current.successes += 1;
    }

    if (
      row.event_name === 'bridge_unavailable' ||
      row.event_name === 'extension_rewrite_response' ||
      row.event_name === 'extension_suggest_response'
    ) {
      if (row.status === 'error') current.failures += 1;
    }

    if (row.event_name === 'extension_activation_blocked') {
      current.blocked += 1;
    }

    if (row.created_at > current.lastEventAt) current.lastEventAt = row.created_at;
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

function summarizeTimeToFirstSuccess(rows: DiagnosticRow[]): { milliseconds: number; label: string } | null {
  const ordered = [...rows].reverse();
  const firstLaunch = ordered.find((row) => row.event_name === 'app_launched');
  const firstSuccess = ordered.find((row) =>
    ['rewrite_completed', 'extension_rewrite_accepted', 'suggestion_accepted'].includes(row.event_name),
  );

  if (!firstLaunch || !firstSuccess) return null;

  const launchAt = Date.parse(firstLaunch.created_at);
  const successAt = Date.parse(firstSuccess.created_at);
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

export function logDiagnosticEvent(input: DiagnosticEventInput): void {
  const detail = input.detail ? sanitizeValue(input.detail) : null;
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
      detail ? JSON.stringify(detail) : null,
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
  const rows = getDatabase()
    .prepare(
      `SELECT id, event_name, source, status, stage, latency_ms, detail_json, created_at
       FROM diagnostic_events
       WHERE created_at >= datetime('now', '-7 days')
       ORDER BY id DESC
       LIMIT 500`,
    )
    .all() as DiagnosticRow[];

  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.event_name] = (counts[row.event_name] ?? 0) + 1;

  const lastFailure = rows.find((row) => row.status === 'error') ?? null;
  const lastRewriteSuccess = rows.find((row) =>
    ['rewrite_completed', 'extension_rewrite_accepted', 'suggestion_accepted'].includes(row.event_name),
  ) ?? null;
  const lastBridgeConnected = rows.find((row) => row.event_name === 'extension_bridge_connected') ?? null;

  const failureReasons = summarizeCounts(
    rows
      .filter((row) => row.status === 'error')
      .map((row) => getDetailField(row, 'reason') ?? row.event_name),
  );

  const domainHotspots = summarizeCounts(
    rows
      .filter((row) =>
        row.event_name === 'bridge_unavailable' ||
        row.event_name === 'extension_activation_blocked' ||
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
  const timeToFirstSuccess = summarizeTimeToFirstSuccess(rows);
  const topDomainOutcomes = summarizeDomainOutcomes(rows);

  return {
    eventCountLast7Days: rows.length,
    lastEventAt: rows[0]?.created_at ?? null,
    lastSuccessfulRewriteAt: lastRewriteSuccess?.created_at ?? null,
    lastBridgeConnectedAt: lastBridgeConnected?.created_at ?? null,
    lastFailure: lastFailure
      ? {
          eventName: lastFailure.event_name,
          source: lastFailure.source,
          stage: lastFailure.stage,
          createdAt: lastFailure.created_at,
          detail: parseDetail(lastFailure.detail_json),
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
    },
    funnel: {
      activationRate,
      desktopRewriteRate,
      replacementRate,
      extensionEngagementRate,
      timeToFirstSuccess,
    },
    latencyMs: {
      hotkeyToPanel: summarizeLatency(rows, 'hotkey_panel_ready'),
      activeWindow: summarizeLatency(rows, 'active_window_resolved'),
      captureSelected: summarizeLatency(rows, 'capture_selected'),
      replaceText: summarizeLatency(rows, 'replace_selected_text'),
      bridgeRewrite: summarizeLatency(rows, 'extension_rewrite_response'),
      bridgeSuggest: summarizeLatency(rows, 'extension_suggest_response'),
    },
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
