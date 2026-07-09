// Guardian Line — background service worker (Manifest V3)
//
// This shell doesn't tap call audio directly from third-party VoIP tabs
// (that requires the tabCapture API plus an explicit per-tab user grant,
// out of scope for this build). What it does do, for real: watch which
// tab is active/updated, recognize known VoIP surfaces by hostname, and
// surface that as a badge — so the "open Guardian Line" action always
// knows whether you're plausibly on a call right now.

const VOIP_HOST_PATTERNS = [
  { match: /voice\.google\.com/, label: "Google Voice" },
  { match: /web\.whatsapp\.com/, label: "WhatsApp Web" },
  { match: /(^|\.)zoom\.us/, label: "Zoom" },
  { match: /meet\.google\.com/, label: "Google Meet" },
  { match: /teams\.(microsoft|live)\.com/, label: "Microsoft Teams" },
];

function detectCallApp(url) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const hit = VOIP_HOST_PATTERNS.find((p) => p.match.test(host));
    return hit ? hit.label : null;
  } catch {
    return null;
  }
}

async function refreshBadgeForTab(tab) {
  const label = tab && detectCallApp(tab.url);
  if (label) {
    await chrome.action.setBadgeText({ text: "●" });
    await chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
    await chrome.storage.local.set({ activeCallApp: label });
  } else {
    await chrome.action.setBadgeText({ text: "" });
    await chrome.storage.local.set({ activeCallApp: null });
  }
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  refreshBadgeForTab(tab);
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") refreshBadgeForTab(tab);
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  const [tab] = await chrome.tabs.query({ active: true, windowId });
  refreshBadgeForTab(tab);
});

// ---- Real tab-audio tap (Chrome/Edge only — offscreen documents are a
// Chromium-only API, so Firefox falls back to the badge-detection
// feature above only; see extension/README.md). ----

const OFFSCREEN_URL = "offscreen.html";

async function ensureOffscreenDocument() {
  const existing = await chrome.runtime.getContexts?.({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)],
  });
  if (existing && existing.length > 0) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ["USER_MEDIA"],
    justification: "Reads a live audio level from the active call tab for the popup's meter.",
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "guardianline-request-tap") {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return sendResponse({ ok: false, error: "No active tab" });
        const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
        await ensureOffscreenDocument();
        const res = await chrome.runtime.sendMessage({ type: "guardianline-start-tap", streamId });
        sendResponse(res);
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }
  if (message?.type === "guardianline-request-stop-tap") {
    chrome.runtime.sendMessage({ type: "guardianline-stop-tap" }).catch(() => {});
    chrome.offscreen.hasDocument?.().then((has) => {
      if (has) chrome.offscreen.closeDocument();
    });
    sendResponse({ ok: true });
  }
});
