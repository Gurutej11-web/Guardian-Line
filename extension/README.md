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
- **Audio tap (beta, Chrome/Edge only):** the popup's "Start audio tap"
  button uses `chrome.tabCapture.getMediaStreamId` plus an MV3 offscreen
  document (`offscreen.html`/`offscreen.js`) to open a real
  `MediaStream` from the active tab and show a live volume meter. This
  is a genuine audio tap, not a simulation — you'll see the meter move
  with real sound from the tab, and the tab's own audio keeps playing
  normally through a pass-through gain node.

## What it deliberately does not do (yet)

The audio tap above only computes a simple RMS volume level. Feeding
that stream into the same jitter/shimmer/spectral-flatness forensics
engine the web dashboard uses (`src/lib/audioForensics.ts`) would mean
bundling that TypeScript module for a plain-JS extension — its own
build step (esbuild/webpack), which this hand-authored shell doesn't
have yet. The level meter is the real, working seam that pipeline would
plug into.

**Firefox:** `chrome.offscreen` and MV3 tab capture are Chromium-only
APIs, so on Firefox only the hostname-detection badge feature works —
the audio tap button disables itself there. The manifest's
`browser_specific_settings.gecko.id` is a placeholder
(`guardian-line@example.com`); replace it with your own extension ID
before publishing to addons.mozilla.org.

## Load it locally

1. Open `chrome://extensions` (or `about:debugging#/runtime/this-firefox`
   on Firefox, where only the badge-detection feature is available).
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Start the Guardian Line dev server (`npm run dev` in the project
   root), then click the extension icon and hit **Open Trust Meter**.
5. On a Chromium browser, click **Start audio tap (beta)** on any tab
   playing audio to see the live level meter.
