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
}

init();
