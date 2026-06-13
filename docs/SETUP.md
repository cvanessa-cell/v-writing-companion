# Setup

## Prerequisites

- Windows 10/11
- Node.js 18+
- npm 9+

## Install

```bash
git clone <repo>
cd V
npm install
copy .env.example .env
```

Add `OPENAI_API_KEY` or `GEMINI_API_KEY` to `.env`.

## Run desktop app

```bash
npm run dev
```

## Build desktop app

```bash
npm run build
```

Output: `apps/desktop/out`

## Build browser extension

```bash
npm run build -w @v/browser-extension
```

Load `apps/browser-extension/dist` as unpacked extension.

## First run

On first launch, V opens Settings onboarding. Complete it, then test with Ctrl+Shift+Space on selected text.

## Troubleshooting

- **Hotkey not working**: Another app may own Ctrl+Shift+Space. Change hotkey in Settings.
- **No text captured**: Select text first, then press hotkey while focus remains in source app.
- **Replace failed**: Click back into source app before pressing Replace.
- **Extension cannot connect**: Ensure desktop app is running (bridge on port 47821).
