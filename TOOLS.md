# V Tools Reference

This file captures the useful operating guidance imported from the IV by Agent V workspace and adapts it to the current V writing companion repo.

## Current Source

The current product source is this repo:

- Local path: `C:\Users\cvane\V`
- Remote: `https://github.com/cvanessa-cell/v-writing-companion.git`
- Product: V, a Windows desktop and browser writing companion
- Package manager: npm workspaces

`C:\Users\cvane\iv-by-agent-v` is a related but separate repo for IV by Agent V. It has useful project-intelligence and agent-operations patterns, but its product architecture is not a direct replacement for this repo.

## Quick Decision Guide

| You want to | Use this |
| --- | --- |
| Install dependencies | `npm install` |
| Run the desktop app | `npm run dev` |
| Build desktop app and browser extension | `npm run build` |
| Run the fast validation suite | `npm run test` |
| Run the full validation suite | `npm run test:full` |
| Run lint | `npm run lint` |
| Build only the browser extension | `npm run build -w @v/browser-extension` |
| Test only the browser extension | `npm run test -w @v/browser-extension` |
| Run browser overlay DOM tests | `npm run test:dom -w @v/browser-extension` |

## Core Local Surfaces

| Surface | Path | Purpose |
| --- | --- | --- |
| Desktop app | `apps/desktop` | Electron desktop shell, rewrite panel, settings, memory, diagnostics |
| Browser extension | `apps/browser-extension` | Inline field detection, rewrite bridge, suggestions, extension popup |
| Shared package | `packages/shared` | Shared schemas, prompts, types, and rewrite utilities |
| Setup docs | `docs/SETUP.md` | Install, run, build, and first-run notes |
| Extension docs | `docs/EXTENSION_SETUP.md` | Browser extension build/load/verify steps |
| Privacy docs | `docs/PRIVACY.md` | Capture, AI-send, local-storage, and exclusion behavior |
| App rules docs | `docs/APP_RULES.md` | Built-in rewrite rules by context |

## Validation Commands

Run from `C:\Users\cvane\V`.

```powershell
npm run lint
npm run test
npm run build
```

Use `npm run test:full` when a change touches browser overlay behavior or the extension popup.

## First-Value Smoke Test

1. Start the desktop app with `npm run dev`.
2. Complete Settings onboarding if it appears.
3. Select text in a desktop app and trigger V with `Ctrl+Shift+Space`.
4. Build and load `apps/browser-extension/dist` as an unpacked extension.
5. Focus a normal web text field, use the floating V button, and approve one replacement.
6. Confirm diagnostics update in the desktop app.

## Imported Lessons From IV by Agent V

The IV repo adds value to this repo as an operations reference:

- Keep a single tool index near the repo root so scripts, docs, and verification commands are easy to find.
- Make comparison and migration decisions from local git evidence, not folder names.
- Treat project-intelligence docs as useful context, but do not overwrite product-specific code with unrelated architecture.
- Prefer vertical validation after changes: lint, tests, build, then a manual smoke path when UI behavior is affected.
- Preserve user-authored docs and local audit artifacts when importing guidance from a sibling repo.

## Do Not Directly Import Without Review

These IV elements are not direct drop-ins for V:

- Python FastAPI backend and OpenAI Agents SDK orchestration
- IV subscription, billing, and Valence layers
- IV project-intelligence generated JSON files
- Cursor bridge automation that assumes IV env vars and Airtable setup
- IV desktop capture and governed recording controls

They may be useful future references, but each should be evaluated as a product change before implementation.
