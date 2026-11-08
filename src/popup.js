const DEFAULTS = { enabled: true, mode: "hide" };
const t = (key, subs) => chrome.i18n.getMessage(key, subs);

for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);

const enabled = document.getElementById("enabled");
const mode = document.getElementById("mode");
const status = document.getElementById("status");

function render(settings) {
  enabled.checked = settings.enabled;
  mode.disabled = !settings.enabled;
  mode.querySelector(`input[value="${settings.mode}"]`).checked = true;
}

async function showCount() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const { count } = await chrome.tabs.sendMessage(tab.id, { type: "getCount" });
    status.textContent = enabled.checked ? t("statusCount", [String(count)]) : t("statusOff");
  } catch {
    status.textContent = t("statusOpenMarketplace");
  }
}

chrome.storage.sync.get(DEFAULTS, (settings) => {
  render(settings);
  showCount();
});

enabled.addEventListener("change", async () => {
  mode.disabled = !enabled.checked;
  await chrome.storage.sync.set({ enabled: enabled.checked });
  showCount();
});

mode.addEventListener("change", (event) => {
  chrome.storage.sync.set({ mode: event.target.value });
});
