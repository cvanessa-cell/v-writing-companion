# V - Universal AI Writing Companion

V is a Windows desktop writing companion that rewrites selected text across desktop apps and browser text fields while keeping rules, privacy controls, and optional local history under your control.

See [docs/SETUP.md](docs/SETUP.md), [docs/EXTENSION_SETUP.md](docs/EXTENSION_SETUP.md), and [docs/PRIVACY.md](docs/PRIVACY.md) for setup and privacy details.

## What you get

- Desktop rewrite panel for selected text with app-aware guidance
- Browser extension bridge for in-field rewrites and suggestions
- Local memory, exclusions, and history controls in the desktop settings UI

## Quick start

```powershell
cd C:\Users\cvane\V
npm install
copy .env.example .env
npm run dev
```

Select text, press `Ctrl+Shift+Space`, review the rewrite, then copy or replace.
