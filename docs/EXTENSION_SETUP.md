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
2. Click the extension icon. The popup now shows connection state plus a 3-step first-value path.
3. Focus a normal text field on a webpage
4. Click the floating **V** button near the field
5. Review the inline overlay and click **Accept** to apply the rewrite

## Security

- Extension only talks to `127.0.0.1`
- Password and sensitive fields are ignored
- No auto-replace without user confirmation
- Excluded domains are enforced by desktop app

## Bridge API

- `GET /health` - connection check
- `POST /rewrite-request` - send field text plus page context and receive rewrite options
- `GET /settings` - paused state, realtime settings, and activation scope
- `POST /suggest-request` - pause-triggered proactive suggestion requests
- `POST /event` - privacy-safe local activation and rewrite diagnostics

Enable **Real-time suggestions** in V Settings, reload the extension, then type in a normal text field and pause.

## Validation

- `npm run test -w @v/browser-extension` runs the fast logic suite used by the root workspace test.
- `npm run test:dom -w @v/browser-extension` runs the DOM-dependent overlay and field-detector coverage separately.
