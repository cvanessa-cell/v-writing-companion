# V - Universal AI Writing Companion

V helps you rewrite text inside Windows apps and browser fields without forcing you into a separate chat tab. It is designed for people who need faster, cleaner writing in the tools they already use while keeping privacy controls, exclusions, and local diagnostics in their own desktop app.

See [docs/SETUP.md](docs/SETUP.md), [docs/EXTENSION_SETUP.md](docs/EXTENSION_SETUP.md), and [docs/PRIVACY.md](docs/PRIVACY.md) for setup and privacy details.
For the fastest value path, use [docs/FIRST_SUCCESS.md](docs/FIRST_SUCCESS.md).

For repo commands and operating guidance, see [TOOLS.md](TOOLS.md). For the July 7 source comparison against IV by Agent V, see [docs/source-comparison-2026-07-07.md](docs/source-comparison-2026-07-07.md). For the Assistant project merge review, see [docs/assistant-project-merge-2026-07-08.md](docs/assistant-project-merge-2026-07-08.md).

## Who it helps

- People who write across email, docs, forms, and browser text fields all day
- Users who want rewrite help without moving text into a separate website
- Owners who need local controls for privacy, exclusions, and troubleshooting

## What you get immediately

- Desktop hotkey rewrite panel for selected text with app-aware guidance
- Browser extension bridge for inline rewrites and non-blocking suggestions
- Local settings for exclusions, memory, rewrite history, and activation scope
- Local diagnostics for rewrite counts, failures, bridge health, and latency

## How it works

1. Select text in a desktop app or focus a supported browser field.
2. Trigger V with `Ctrl+Shift+Space` or the inline browser action.
3. Review the rewritten text and accept, copy, or replace it in place.
4. Tune privacy and domain controls from the desktop settings window.

## First-minute path

```powershell
cd C:\Users\cvane\V
npm install
copy .env.example .env
npm run dev
```

After launch, connect your provider, run one desktop rewrite with `Ctrl+Shift+Space`, then load the browser extension and accept one in-field rewrite. The settings screen and extension popup now both show the first-success path, while local diagnostics capture bridge, activation, and rewrite proof for each release.

## Validation scripts

- `npm run test`: default fast validation across desktop, shared, and extension logic tests
- `npm run test:full`: includes the slower browser overlay DOM suite
- `npm run lint`
- `npm run build`
