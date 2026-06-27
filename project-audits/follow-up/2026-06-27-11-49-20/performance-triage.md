# Performance Triage

PROJECT WORKING FOLDER:

[C:\Users\cvane\V](/C:/Users/cvane/V)

PROJECT GOAL:

Apply the safest highest-leverage follow-up fixes from the June 27 audit while preserving the active checkout and improving owner control over extension behavior.

LATEST PERFORMANCE AUDIT:

[C:\Users\cvane\V\docs\performance-audit-2026-06-27.md](/C:/Users/cvane/V/docs/performance-audit-2026-06-27.md)

| Issue | Affected Area | Severity | Business Impact | Consumer Impact | Evidence Available | Missing Evidence | Likely Cause | Highest-Leverage Fix | Implementation Risk | Expected Improvement | Files Likely Affected |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| Desktop hotkey path still shells out through PowerShell | Core functionality, reliability | High | Slower first-value path and harder support | Rewrites can feel delayed before AI work starts | Audit timing, `activeWindow.ts`, `clipboard.ts` | No p50/p95 production sample set yet | OS automation implemented with per-interaction PowerShell | Defer structural helper-process/native rewrite to later run; keep diagnostics collecting evidence | High | Better prioritization only in this run; no structural latency removal yet | `apps/desktop/src/main/activeWindow.ts`, `apps/desktop/src/main/clipboard.ts` |
| Extension still activates too broadly | UI/UX, reliability | High | Larger support surface and compatibility risk | Users can see V on domains they do not want | Audit manifest review plus global content script design | Per-domain blocked/allowed counts | Broad default content-script model | Add domain-scope controls and early content-script gating | Low | Lower compatibility surface with owner-controlled allowlist mode | `apps/browser-extension/src/contentScript.ts`, `apps/browser-extension/src/domainAccess.ts`, `apps/desktop/src/main/bridgeSettings.ts`, `apps/desktop/src/renderer/components/SettingsPage.tsx` |
| Diagnostics do not yet answer domain and bridge questions clearly | Admin, data | High | Slower troubleshooting and weaker product decisions | Failures are harder to explain | Existing diagnostics summary and settings card | Trend views and first-success metrics | Summary stopped at raw counts and recent events | Add bridge connectivity and hotspot summaries | Low | Faster owner diagnosis without reading raw logs | `apps/desktop/src/main/diagnostics.ts`, `apps/desktop/src/renderer/components/DiagnosticsCard.tsx` |
| Browser-extension DOM coverage is still thin | Reliability | Medium | Regressions can slip through | Inline review states could break unnoticed | Current test inventory | DOM-level overlay tests | Test focus stayed on pure logic | Add at least one new logic test in this run; leave DOM overlay tests as next step | Low | Slightly better extension confidence with minimal runtime cost | `apps/browser-extension/src/tests/domainAccess.test.ts` |
| Product explanation is still too developer-oriented | Content, marketing | Medium | Slower install conversion | Value may be unclear to non-technical users | README review | Real landing-page conversion data | Setup-first documentation | Rewrite README toward who/what/how/first-minute value | Low | Clearer first-screen product positioning | `README.md` |
| Monetization remains absent | Monetization | Low | No current revenue path | No paid upgrade path | Code review | Activation/retention evidence | Product is still validating core value | Document as intentionally deferred; do not add premature checkout | Low | Avoids wasting time on ungrounded billing work | report only |
