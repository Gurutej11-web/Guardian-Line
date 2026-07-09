const DEFAULT_DASHBOARD_URL = "http://localhost:3010/dashboard";

async function getDashboardUrl() {
  const { dashboardUrl } = await chrome.storage.sync.get("dashboardUrl");
  return dashboardUrl || DEFAULT_DASHBOARD_URL;
}

async function init() {
  const { activeCallApp } = await chrome.storage.local.get("activeCallApp");
  const statusEl = document.getElementById("status");
  const statusText = document.getElementById("statusText");

  if (activeCallApp) {
    statusEl.classList.add("status--active");
    statusEl.classList.remove("status--idle");
    statusText.textContent = `${activeCallApp} detected on this tab`;
  } else {
    statusText.textContent = "No known call app detected on this tab";
  }

  const urlInput = document.getElementById("dashboardUrl");
  urlInput.value = await getDashboardUrl();

  document.getElementById("openDashboard").addEventListener("click", async () => {
    const url = await getDashboardUrl();
    chrome.tabs.create({ url });
  });

  document.getElementById("saveUrl").addEventListener("click", async () => {
    const value = urlInput.value.trim() || DEFAULT_DASHBOARD_URL;
    await chrome.storage.sync.set({ dashboardUrl: value });
    urlInput.value = value;
  });

  initAudioTap();
}

function initAudioTap() {
  const toggleBtn = document.getElementById("toggleTap");
  const meterFill = document.getElementById("meterFill");
  const note = document.getElementById("tapNote");
  let tapping = false;

  const supported = typeof chrome !== "undefined" && !!chrome.tabCapture;
  if (!supported) {
    toggleBtn.disabled = true;
    note.textContent = "Audio tap isn't available in this browser (needs Chrome or Edge).";
    return;
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "guardianline-audio-level") {
      const pct = Math.min(100, Math.round(message.level * 220));
      meterFill.style.width = `${pct}%`;
    }
  });

  toggleBtn.addEventListener("click", async () => {
    if (tapping) {
      await chrome.runtime.sendMessage({ type: "guardianline-request-stop-tap" });
      tapping = false;
      toggleBtn.textContent = "Start audio tap (beta)";
      meterFill.style.width = "0%";
      return;
    }
    toggleBtn.disabled = true;
    const res = await chrome.runtime.sendMessage({ type: "guardianline-request-tap" });
    toggleBtn.disabled = false;
    if (res?.ok) {
      tapping = true;
      toggleBtn.textContent = "Stop audio tap";
      note.textContent = "Tapping this tab's audio — the level bar reflects real volume.";
    } else {
      note.textContent = `Couldn't start audio tap: ${res?.error || "permission denied"}.`;
    }
  });
}

init();
