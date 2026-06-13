# Browser Extension Setup

## Build

```bash
npm run build -w @v/browser-extension
```

## Load in Chrome/Edge

1. Open `chrome://extensions` or `edge://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `apps/browser-extension/dist`

## Verify connection

1. Start the V desktop app
2. Click the extension icon — should show "Desktop app connected on localhost:47821"
3. Focus a normal text field on a webpage
4. Click the floating **V** button near the field
5. Approve replacement in the confirm dialog

## Security

- Extension only talks to `127.0.0.1`
- Password and sensitive fields are ignored
- No auto-replace without user confirmation
- Excluded domains are enforced by desktop app

## Bridge API

- `GET /health` — connection check
- `POST /rewrite-request` — send field text + page context, receive rewrite options


## Phase 4 bridge endpoints

- GET /settings — paused, realtime, pause ms, min chars, speech cleanup mode
- POST /suggest-request — pause-triggered proactive suggestion (1 option + overlay)

Enable **Real-time suggestions** in V Settings, reload the extension, then type in a normal text field and pause.
