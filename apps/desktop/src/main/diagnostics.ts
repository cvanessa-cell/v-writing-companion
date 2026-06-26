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

  return {
    eventCountLast7Days: rows.length,
    lastEventAt: rows[0]?.created_at ?? null,
    lastSuccessfulRewriteAt: lastRewriteSuccess?.created_at ?? null,
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
      suggestionShown: counts.suggestion_shown ?? 0,
      suggestionAccepted: counts.suggestion_accepted ?? 0,
      bridgeUnavailable: counts.bridge_unavailable ?? 0,
    },
    latencyMs: {
      hotkeyToPanel: summarizeLatency(rows, 'hotkey_panel_ready'),
      activeWindow: summarizeLatency(rows, 'active_window_resolved'),
      captureSelected: summarizeLatency(rows, 'capture_selected'),
      replaceText: summarizeLatency(rows, 'replace_selected_text'),
      bridgeRewrite: summarizeLatency(rows, 'extension_rewrite_response'),
      bridgeSuggest: summarizeLatency(rows, 'extension_suggest_response'),
    },
    recentEvents: getDiagnosticEvents(12),
  };
}
