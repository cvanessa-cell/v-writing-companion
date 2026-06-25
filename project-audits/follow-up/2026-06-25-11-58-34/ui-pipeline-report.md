# UI Pipeline Report

- Fixed the desktop rewrite panel source so production renderer builds succeed again.
- Extended Memory Center with excludedApps and excludedDomains tabs plus explanatory copy and delete support.
- The extension still uses the existing rewrite interaction model, but idle settings refresh is now visibility-aware instead of always polling every injected page.
- Remaining UI work from the audit: inline extension approval UX, clearer provider/latency status in the rewrite panel, and richer empty/error states.
