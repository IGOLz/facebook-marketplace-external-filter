// Marks partner listing cards and hides or dims them according to the settings.
(() => {
  const { classifyAnchor, findCard } = globalThis.MNODetect;
  const ITEM_LINKS = 'a[href*="/marketplace/item/"]';
  const DEFAULTS = { enabled: true, mode: "hide" };
  let settings = { ...DEFAULTS };
  let lastCount = -1;
  let scheduled = false;

  const style = document.createElement("style");
  style.textContent = `
    html.mno-hide [data-mno="partner"] { display: none !important; }
    html.mno-dim [data-mno="partner"] { opacity: 0.25; filter: grayscale(1); transition: opacity .15s; }
    html.mno-dim [data-mno="partner"]:hover { opacity: 0.8; }
  `;
  (document.head || document.documentElement).appendChild(style);

  function applyMode() {
    const root = document.documentElement;
    root.classList.toggle("mno-hide", settings.enabled && settings.mode === "hide");
    root.classList.toggle("mno-dim", settings.enabled && settings.mode === "dim");
  }

  function scan() {
    scheduled = false;
    for (const anchor of document.querySelectorAll(ITEM_LINKS)) {
      const href = anchor.getAttribute("href");
      if (anchor.dataset.mnoHref === href) continue;
      anchor.dataset.mnoHref = href;
      const card = findCard(anchor);
      if (classifyAnchor(anchor) === "partner") card.dataset.fmf = "partner";
      else delete card.dataset.fmf;
    }
    reportCount();
  }

  function countPartners() {
    return settings.enabled ? document.querySelectorAll('[data-mno="partner"]').length : 0;
  }

  function reportCount() {
    const count = countPartners();
    if (count === lastCount) return;
    lastCount = count;
    chrome.runtime.sendMessage({ type: "count", count }).catch(() => {});
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(scan);
  }

  chrome.storage.sync.get(DEFAULTS, (stored) => {
    settings = stored;
    applyMode();
    scan();
    new MutationObserver(schedule).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
    });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const [key, { newValue }] of Object.entries(changes)) settings[key] = newValue;
    applyMode();
    reportCount();
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "getCount") sendResponse({ count: countPartners() });
  });
})();
