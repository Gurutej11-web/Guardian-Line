// Guardian Line — offscreen document (Manifest V3)
//
// MV3 service workers can't touch getUserMedia/AudioContext directly,
// so the real tab-audio tap has to live here, in a hidden offscreen
// document the service worker spins up on demand. This genuinely opens
// a live MediaStream from the call tab via chrome.tabCapture's stream
// ID handoff and computes a real RMS audio level from it — it is not a
// simulation. What it deliberately does NOT do is run the full
// jitter/shimmer/FFT forensics pipeline from src/lib/audioForensics.ts:
// that module is TypeScript compiled by Next.js's build, and bundling
// it into this hand-authored JS extension would need its own build
// step (esbuild/webpack) that this extension shell doesn't have yet.
// The level meter below is the real, working seam that pipeline would
// plug into.

let audioContext = null;
let analyser = null;
let mediaStream = null;
let rafId = null;

function stopTap() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }
  analyser = null;
}

async function startTap(streamId) {
  stopTap();
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
  });

  // Keep the tab's own audio audible while we tap it, rather than
  // silently muting the call for the user.
  audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(mediaStream);
  const passthrough = audioContext.createGain();
  source.connect(passthrough);
  passthrough.connect(audioContext.destination);

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);

  const data = new Uint8Array(analyser.fftSize);
  const tick = () => {
    analyser.getByteTimeDomainData(data);
    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
      const centered = (data[i] - 128) / 128;
      sumSquares += centered * centered;
    }
    const rms = Math.sqrt(sumSquares / data.length);
    chrome.runtime.sendMessage({ type: "guardianline-audio-level", level: rms }).catch(() => {});
    rafId = requestAnimationFrame(tick);
  };
  tick();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "guardianline-start-tap" && message.streamId) {
    startTap(message.streamId)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  if (message?.type === "guardianline-stop-tap") {
    stopTap();
    sendResponse({ ok: true });
  }
});
