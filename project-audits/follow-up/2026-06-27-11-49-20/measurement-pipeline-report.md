# Measurement Pipeline Report

## Existing event map

- `app_launched`
- `hotkey_triggered`
- `active_window_resolved`
- `capture_selected`
- `rewrite_completed`
- `rewrite_failed`
- `replace_selected_text`
- `replace_succeeded`
- `replace_failed`
- `suggestion_shown`
- `suggestion_accepted`
- `suggestion_dismissed`
- `bridge_unavailable`

## Improvements made this run

- Added `extension_bridge_connected`
- Added `extension_activation_blocked`
- Added summary views for:
  - top failure reasons
  - problem domains
  - bridge reconnect count
  - last bridge connection time

## Key product metrics now easier to answer locally

- Where bridge failures happen
- Which domains are generating blocked activation or error volume
- Whether the extension is reconnecting repeatedly

## Missing measurements

- onboarding completed
- first successful rewrite time
- rewrite success rate
- repeat usage by day/week
- manifest injection volume versus actual supported-field activation
