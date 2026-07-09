# V First-Success Guide

V should prove its value in one short session, not after a long setup detour.

## Who this is for

- A new user deciding whether V is worth keeping on
- The project owner validating whether a release is ready to show other people

## The promise

V should help a user rewrite text inside the apps they already use while keeping privacy controls and local diagnostics in the desktop app.

## Three-step first-success path

1. Connect an AI provider in the desktop Settings screen.
2. Complete one desktop hotkey rewrite with `Ctrl+Shift+Space`.
3. Accept one browser rewrite or suggestion from the extension on a supported text field.

## What counts as proof

- Desktop proof: a `rewrite_completed` event in local diagnostics
- Browser proof: an `extension_rewrite_accepted` or `suggestion_accepted` event in local diagnostics
- Bridge proof: an `extension_bridge_connected` event showing the desktop bridge was reachable
- Release proof: a packaging readiness snapshot plus a healthy release verdict in Settings

## What users get immediately

- Rewrite help without moving text into a separate website
- Browser suggestions that stay in the page they are already using
- Local exclusions and privacy-safe diagnostics

## Quick troubleshooting

- No desktop rewrite: select text first, then press `Ctrl+Shift+Space`
- No browser rewrite: keep the desktop app running and test on a normal text field
- No provider: add an OpenAI or Gemini key in `.env` and reopen Settings
- No bridge connection: confirm the desktop app is running and the extension popup shows a healthy connection

## Owner review checklist

- Provider is configured
- One desktop rewrite is captured
- One browser rewrite or suggestion is accepted
- Packaging readiness is current for the active build
- Release verdict has real success evidence for the current version
