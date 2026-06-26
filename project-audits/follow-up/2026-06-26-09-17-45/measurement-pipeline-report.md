# Measurement Pipeline Report

Implemented event layer:

- `app_launched`
- `hotkey_triggered`
- `active_window_resolved`
- `capture_selected`
- `capture_blocked`
- `hotkey_panel_ready`
- `rewrite_completed`
- `rewrite_failed`
- `replace_selected_text`
- `replace_succeeded`
- `replace_failed`
- `extension_rewrite_requested`
- `extension_rewrite_response`
- `extension_rewrite_review_shown`
- `extension_rewrite_accepted`
- `extension_rewrite_dismissed`
- `suggestion_shown`
- `suggestion_accepted`
- `suggestion_dismissed`
- `bridge_unavailable`

Where they fire:

- Desktop main process: capture, rewrite, replace, and startup events
- Extension bridge handlers: rewrite/suggest response timing
- Extension content script: button shown, manual-review, suggestion, and bridge-error outcomes

Metrics now visible locally:

- Event count over 7 days
- Last successful rewrite time
- Last failure summary
- Hotkey-to-panel, active-window, capture, replace, bridge rewrite, and bridge suggest latency snapshots

Missing evidence still worth adding next:

- Domain-level acceptance rate over time
- Hotkey-to-replace end-to-end p50/p95 from real user sessions
- First successful rewrite after install/onboarding
