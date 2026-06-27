# UI Pipeline Report

## Improvements made

- Added extension activation scope controls in settings.
- Added allowlisted-domain editing so owners can constrain extension behavior without code changes.
- Expanded diagnostics UI with bridge reconnects, activation blocks, top failure reasons, and problem domains.

## Why this matters

- Users get less surprise extension behavior.
- Owners can see where the product is failing without reading raw event JSON.

## Remaining UX work

- Manifest scope is still broad even though runtime gating is tighter.
- No DOM-level tests cover the inline overlay flow yet.
- The desktop hotkey path still needs deeper latency work.
