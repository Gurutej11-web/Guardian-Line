# Guardian Line — browser extension shell

A minimal Manifest V3 extension that complements the web app: it watches
the active tab for known browser-based calling surfaces (Google Voice,
WhatsApp Web, Zoom, Google Meet, Microsoft Teams) and gives you one click
into the Guardian Line Trust Meter.

## What it actually does

- Background service worker checks the active tab's **hostname only**
  (no page content, no audio) against a short list of known VoIP hosts.
- Shows a green badge dot on the toolbar icon when one is detected.
- Popup opens the Guardian Line dashboard in a new tab, with the
  dashboard URL configurable (defaults to `http://localhost:3010/dashboard`
  for local development).

## What it deliberately does not do (yet)

Tapping a third-party tab's call audio directly requires Chrome's
`tabCapture` API plus an explicit per-tab user grant, and piping that
into the same on-device forensics engine used by the dashboard. That's a
real, buildable next step (see the main README's roadmap) but is out of
scope for this shell — the honest, working version here is a fast way to
jump from "I'm on a call" to "here's my Trust Meter," which is what's
demoable today.

## Load it locally

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Start the Guardian Line dev server (`npm run dev` in the project
   root), then click the extension icon and hit **Open Trust Meter**.
