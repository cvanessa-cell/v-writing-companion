import type { BridgeSettings } from '@v/shared';

const EXCLUDED_SCHEMES = ['chrome://', 'edge://', 'about:', 'chrome-extension://'];

export type DomainAccessDecision =
  | { allowed: true }
  | { allowed: false; reason: 'excluded_scheme' | 'excluded_domain' | 'not_allowlisted' };

export function hasExcludedScheme(url: string): boolean {
  return EXCLUDED_SCHEMES.some((prefix) => url.startsWith(prefix));
}

export function normalizeDomainEntries(entries: string[]): string[] {
  return entries
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function hostnameMatchesEntry(hostname: string, entry: string): boolean {
  const normalizedHost = hostname.trim().toLowerCase();
  const normalizedEntry = entry.trim().toLowerCase();
  return normalizedHost === normalizedEntry || normalizedHost.endsWith(`.${normalizedEntry}`);
}

export function evaluateDomainAccess(
  url: string,
  hostname: string,
  settings: Pick<BridgeSettings, 'extensionDomainMode' | 'extensionAllowedDomains' | 'excludedDomains'> | null,
): DomainAccessDecision {
  if (hasExcludedScheme(url)) return { allowed: false, reason: 'excluded_scheme' };
  if (!settings) return { allowed: true };

  const excludedDomains = normalizeDomainEntries(settings.excludedDomains);
  if (excludedDomains.some((entry) => hostnameMatchesEntry(hostname, entry))) {
    return { allowed: false, reason: 'excluded_domain' };
  }

  if (settings.extensionDomainMode === 'allowlist') {
    const allowedDomains = normalizeDomainEntries(settings.extensionAllowedDomains);
    if (allowedDomains.length === 0 || !allowedDomains.some((entry) => hostnameMatchesEntry(hostname, entry))) {
      return { allowed: false, reason: 'not_allowlisted' };
    }
  }

  return { allowed: true };
}
