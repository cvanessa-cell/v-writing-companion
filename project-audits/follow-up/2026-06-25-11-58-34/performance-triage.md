# Performance Triage

PROJECT WORKING FOLDER:

[C:\Users\cvane\V](C:\Users\cvane\V)

PROJECT GOAL:

Make V reliably shippable from root commands, close the exclusion-management trust gap, reduce extension idle overhead, and improve the product value surface without disturbing the existing in-progress desktop-main changes.

LATEST PERFORMANCE AUDIT:

[C:\Users\cvane\V\docs\performance-audit-2026-06-25.md](C:\Users\cvane\V\docs\performance-audit-2026-06-25.md)

| Issue | Affected Area | Severity | Business Impact | Consumer Impact | Evidence Available | Missing Evidence | Likely Cause | Highest-Leverage Fix | Implementation Risk | Expected Improvement | Files Likely Affected |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| Root validation missed extension build and lint failures | Reliability/performance | Critical | Release confidence was weak because the root scripts did not validate all shipped surfaces | Broken or stale extension code could ship unnoticed | Root package.json, lint failures, separate extension build requirement | None for the script drift itself | Workspace scripts only covered the desktop surface | Extend root build/lint coverage and fix the current TypeScript blockers | Low | One-command release validation from repo root | package.json, pps/browser-extension/package.json, packages/shared/package.json, pps/browser-extension/tsconfig.json, desktop TS files |
| Extension settings polling ran every 15 seconds on every injected page | Reliability/performance | High | Idle overhead and compatibility/support burden scale with active pages | Users pay overhead on pages where they are not currently writing | Audit trace and code path in contentScript.ts | Injection frequency telemetry by site/tab | Fixed interval polling with no visibility gating | Poll only while the tab is visible and refresh eagerly on focus/visibility change | Low | No repeated settings polling on inactive tabs | pps/browser-extension/src/contentScript.ts |
| Exclusion management was incomplete in the review UI | Admin/trust/privacy | High | Support and privacy debugging were harder than needed | Users could add exclusions but had no clear review/delete loop in Memory Center | Stored exclusions returned by listMemories(), missing Memory Center tabs | None for the UI gap itself | UI inventory drift between settings inputs and memory-management tabs | Surface excluded apps/domains in Memory Center with delete support and guidance | Low | Users can inspect and reverse every saved exclusion | pps/desktop/src/renderer/components/MemoryCenter.tsx |
| README did not clearly explain the product value | Content/marketing | Medium | Harder to position or share the product | First-time users had weak context on what V actually does | Minimal README contents | Activation metrics and landing-page conversion data | Setup-first documentation with little consumer framing | Expand README with value prop, surfaces, and setup links | Low | Better first-contact clarity for users and collaborators | README.md |
| Desktop renderer file contained a structural JSX/build blocker that root build now exposed | Core functionality | High | Release build could fail late in the flow | Broken desktop renderer bundle blocks product use | Reproducible 
pm run build failure in RewritePanel.tsx | None once reproduced | Malformed/non-normalized JSX source | Normalize the file and keep it ASCII-safe | Low | Stable desktop renderer production build | pps/desktop/src/renderer/components/RewritePanel.tsx |

## Priority order used

1. Broken root validation and desktop build blocker.
2. Privacy/trust gap around exclusions.
3. Extension idle overhead.
4. Product-value clarity in docs.
5. Larger deferred items from the audit: hotkey-path PowerShell replacement and local analytics instrumentation.
