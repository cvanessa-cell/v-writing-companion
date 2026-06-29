# Performance Triage

## Prioritized Findings

| Issue | Affected Area | Severity | Business Impact | Consumer Impact | Evidence Available | Missing Evidence | Likely Cause | Highest-Leverage Fix | Implementation Risk | Expected Improvement | Files Likely Affected |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| Diagnostics could not segment by release/version | Admin, analytics, reliability | High | Makes regressions and improvements hard to compare after release | Users see slower fixes because operator feedback loops are weaker | June 29 audit plus current diagnostics/event code | Longitudinal post-release trend data | Version metadata was never attached to event payloads | Attach release metadata to each event and summarize current-release health | Low | Faster release validation and cleaner regression detection | `apps/desktop/src/main/diagnostics.ts`, `apps/desktop/src/main/index.ts`, `apps/browser-extension/src/bridgeClient.ts` |
| Extension runtime scope is broad but under-measured | UI/UX, reliability, performance | High | Hard to justify scope changes or compatibility tradeoffs | Users may feel overhead or unclear behavior on pages where V never activates | Audit evidence around `<all_urls>`, `all_frames`, and content script size | Injection-to-activation ratio by page/frame | Content script bootstraps were not tracked | Log bootstrap, supported-field, and full-runtime activation events | Low | Evidence for later scope tightening without guessing | `apps/browser-extension/src/contentScript.ts`, `apps/desktop/src/main/diagnostics.ts`, `DiagnosticsCard.tsx` |
| Default validation path mixed slow DOM tests with routine logic checks | Reliability, developer velocity | Medium | Slower feedback discourages coverage growth | Indirect impact through slower fixes | Audit timing plus green extension tests across only 4 files | Before/after exact wall time in CI | DOM overlay suite was not isolated from normal logic suite | Split logic and DOM test scripts, add root full-test entrypoint | Low | Faster default local validation with preserved opt-in UI coverage | `apps/browser-extension/package.json`, `package.json`, `docs/EXTENSION_SETUP.md`, `README.md` |
| Product value was still mostly explained in developer docs | Content, marketing, onboarding | Medium | Harder to communicate value quickly | New users may not know what to do first | Existing README/docs + lack of popup guidance | Actual onboarding completion data | User-facing surfaces lacked a short first-success path | Upgrade extension popup and settings onboarding copy | Low | Faster first successful rewrite and clearer trust messaging | `apps/browser-extension/scripts/build.mjs`, `SettingsPage.tsx`, `README.md`, `docs/EXTENSION_SETUP.md` |
| Desktop PowerShell hot path remains the largest user-visible latency source | Core product, performance | Critical | Limits product quality and trust | Hotkey flow still feels slow before model latency | Measured audit timings and current code path | End-to-end trace after architectural rewrite | Shell-based active-window and clipboard flow | Replace shell path with native bindings or resident helper | High | Largest direct latency reduction | `apps/desktop/src/main/activeWindow.ts`, `clipboard.ts` |

## Recommended Fix Order

1. Release-aware diagnostics and current-release summary
2. Extension activation telemetry
3. Faster default validation path with separate DOM suite
4. User-facing first-success onboarding surfaces
5. Native desktop hot path replacement in a later deeper pass
