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
