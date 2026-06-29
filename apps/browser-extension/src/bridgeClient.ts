import type { BridgeSettings } from '@v/shared';

const DEFAULT_BRIDGE = 'http://127.0.0.1:47821';

export interface BridgeSettingsResponse {
  success: boolean;
  settings?: BridgeSettings;
}

export interface DiagnosticsEventPayload {
  eventName: string;
  source: 'extension';
  status: 'info' | 'success' | 'error';
  stage?: string;
  latencyMs?: number;
  detail?: Record<string, unknown>;
}

export async function getBridgeUrl(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['bridgeUrl'], (result) => {
      resolve(String(result.bridgeUrl ?? DEFAULT_BRIDGE));
    });
  });
}

export async function pingBridge(): Promise<boolean> {
  try {
    const base = await getBridgeUrl();
    const res = await fetch(`${base}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function getBridgeSettings(): Promise<BridgeSettingsResponse['settings'] | null> {
  try {
    const base = await getBridgeUrl();
    const res = await fetch(`${base}/settings`);
    if (!res.ok) return null;
    const data = (await res.json()) as BridgeSettingsResponse;
    return data.settings ?? null;
  } catch {
    return null;
  }
}

export async function sendRewriteRequest(payload: Record<string, unknown>) {
  const base = await getBridgeUrl();
  const res = await fetch(`${base}/rewrite-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function sendSuggestRequest(payload: Record<string, unknown>) {
  const base = await getBridgeUrl();
  const res = await fetch(`${base}/suggest-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function sendDiagnosticEvent(payload: DiagnosticsEventPayload) {
  try {
    const base = await getBridgeUrl();
    await fetch(`${base}/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        detail: {
          ...payload.detail,
          extensionVersion: chrome.runtime.getManifest().version,
        },
      }),
    });
  } catch {
    // Best-effort local diagnostics only.
  }
}
