# Privacy

V is designed for user control and safe defaults.

## What V reads

- **Manual mode (default)**: Only text you select and trigger with the hotkey.
- **Browser extension**: Only when you click the floating V button on a non-sensitive field.
- **Real-time mode (optional, off by default)**: Would offer suggestions after pauses when enabled.

## What V never reads automatically

- Password fields
- Payment / CVV / credit card fields
- OTP / 2FA fields
- Fields matching sensitive name patterns (secret, token, private key, seed phrase)
- Apps/domains you exclude
- Content when V is paused

## What gets sent to AI

Text is sent to your configured provider **only when you trigger a rewrite** (or extension rewrite click). Manual mode shows the exact text in the panel before sending.

## Local storage

SQLite database at `%APPDATA%/v-writing-companion/data/v-memory.db` (Electron userData path).

Stored only when enabled and user-approved:

- Style preferences you save
- "Remember this style" examples
- Audience/subject profiles you approve
- Rewrite history (off by default)

## Controls

- **Pause V** — stops all capture/bridge processing
- **Never read this app/site** — exclusion lists
- **Rewrite only selected text** — preference toggle
- **Privacy indicator** — visible when text is being read
- **Reset style learning** — clears learned preferences

## Sensitive text heuristics

V blocks obvious patterns (credit card numbers, API key prefixes, SSN-like patterns) from being sent to AI.
