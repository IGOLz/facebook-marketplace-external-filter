// Marks partner listing cards and hides or dims them according to the settings.
(() => {
  const { classifyAnchor, findCard } = globalThis.FMFDetect;
  const ITEM_LINKS = 'a[href*="/marketplace/item/"]';
  const DEFAULTS = { enabled: true, mode: "hide" };
  let settings = { ...DEFAULTS };
  let lastCount = -1;
  let scheduled = false;

  // Until a card is checked by script, CSS alone catches partner cells as soon as
  // Facebook inserts them: a grid cell (sibling of Facebook's <style>) whose item link
  // contains the partner badge icon. This avoids a flash of partner listings on load.
  const UNCHECKED_PARTNER =
    'div:has(> style + div) > div:not([data-fmf-seen]):has(a[href*="/marketplace/item/"] svg)';

  const style = document.createElement("style");
  style.textContent = `
    html[data-fmf-mode="hide"] [data-fmf="partner"],
    html[data-fmf-mode="hide"] ${UNCHECKED_PARTNER} { display: none !important; }
    html[data-fmf-mode="dim"] [data-fmf="partner"],
    html[data-fmf-mode="dim"] ${UNCHECKED_PARTNER} { opacity: 0.25; filter: grayscale(1); transition: opacity .15s; }
    html[data-fmf-mode="dim"] [data-fmf="partner"]:hover { opacity: 0.8; }
  `;
  document.documentElement.appendChild(style);

  // A data attribute rather than a class: Facebook rewrites <html>'s className.
  function applyMode() {
    const root = document.documentElement;
    if (settings.enabled) root.dataset.fmfMode = settings.mode;
    else delete root.dataset.fmfMode;
  }

  function scan() {
    scheduled = false;
    for (const anchor of document.querySelectorAll(ITEM_LINKS)) {
      const href = anchor.getAttribute("href");
      if (anchor.dataset.fmfHref === href) continue;
      anchor.dataset.fmfHref = href;
      const card = findCard(anchor);
      card.dataset.fmfSeen = "";
      if (classifyAnchor(anchor) === "partner") card.dataset.fmf = "partner";
      else delete card.dataset.fmf;
    }
    globalThis.FMFLayout.merge(findCard);
    reportCount();
  }

  function countPartners() {
    return settings.enabled ? document.querySelectorAll('[data-fmf="partner"]').length : 0;
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

  // Runs at document_start: filter with the defaults right away, then apply the
  // stored settings, which arrive long before Facebook renders the grid.
  applyMode();
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["href"],
  });
  chrome.storage.sync.get(DEFAULTS, (stored) => {
    settings = stored;
    applyMode();
    schedule();
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
