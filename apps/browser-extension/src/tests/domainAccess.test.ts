// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { evaluateDomainAccess, hasExcludedScheme, hostnameMatchesEntry, normalizeDomainEntries } from '../domainAccess';

describe('domainAccess', () => {
  it('matches parent domains against subdomains', () => {
    expect(hostnameMatchesEntry('mail.google.com', 'google.com')).toBe(true);
    expect(hostnameMatchesEntry('google.com', 'google.com')).toBe(true);
    expect(hostnameMatchesEntry('google.com', 'mail.google.com')).toBe(false);
  });

  it('normalizes mixed domain input', () => {
    expect(normalizeDomainEntries([' Mail.Google.com ', '', 'notion.so'])).toEqual(['mail.google.com', 'notion.so']);
  });

  it('blocks excluded domains before allowlist checks', () => {
    expect(evaluateDomainAccess('https://mail.google.com', 'mail.google.com', {
      extensionDomainMode: 'allowlist',
      extensionAllowedDomains: ['google.com'],
      excludedDomains: ['mail.google.com'],
    })).toEqual({ allowed: false, reason: 'excluded_domain' });
  });

  it('blocks non-allowlisted domains when allowlist mode is enabled', () => {
    expect(evaluateDomainAccess('https://example.com', 'example.com', {
      extensionDomainMode: 'allowlist',
      extensionAllowedDomains: ['google.com'],
      excludedDomains: [],
    })).toEqual({ allowed: false, reason: 'not_allowlisted' });
  });

  it('allows domains in all mode', () => {
    expect(evaluateDomainAccess('https://example.com', 'example.com', {
      extensionDomainMode: 'all',
      extensionAllowedDomains: [],
      excludedDomains: [],
    })).toEqual({ allowed: true });
  });

  it('blocks browser-internal schemes before any domain logic', () => {
    expect(hasExcludedScheme('chrome://extensions')).toBe(true);
    expect(evaluateDomainAccess('chrome://extensions', '', null)).toEqual({
      allowed: false,
      reason: 'excluded_scheme',
    });
  });
});
