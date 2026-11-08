// Merges the Marketplace grid into one continuous flow, so hidden cards leave no gaps.
//
// Facebook renders the feed as one flex-wrap container per loaded batch (5-20 cells,
// each preceded by a <style>), every batch wrapped in its own chain of single-child
// divs; the chains are siblings under a common root. Hiding cards leaves short rows
// at the end of each batch. Here the root becomes a CSS grid and every element
// between it and the cells gets `display: contents`, so all cells share one grid.
// Only data-* attributes are used: React keeps them, while it rewrites className.
// The rules apply only in hide mode (html[data-fmf-mode="hide"]), so dim mode and "off" restore
// Facebook's own layout.

(function (root) {
  const ITEM_LINKS = 'a[href*="/marketplace/item/"]';
  const BATCH = "div:has(> style + div)";
  const DEFAULT_MIN_WIDTH = 242;

  let gridRoot = null;
  const css = document.createElement("style");

  function rules(minWidth) {
    return `
      html[data-fmf-mode="hide"] [data-fmf-r] {
        display: grid !important;
        grid-template-columns: repeat(auto-fill, minmax(${minWidth}px, 1fr)) !important;
        margin: 0 -4px !important;
        align-items: start;
      }
      html[data-fmf-mode="hide"] [data-fmf-m="c"] { display: contents !important; }
      html[data-fmf-mode="hide"] [data-fmf-m="full"] { grid-column: 1 / -1 !important; padding-inline: 4px; }
      html[data-fmf-mode="hide"] [data-fmf-m="gone"] { display: none !important; }
      html[data-fmf-mode="hide"] [data-fmf-r] [data-fmf-batch] > div {
        max-width: none !important; min-width: 0 !important; width: auto !important;
      }
      /* Sponsored cells wrap a second copy of the cell markup: avoid doubled padding. */
      html[data-fmf-mode="hide"] [data-fmf-r] [data-fmf-batch] > div:has(> style) { padding: 0 !important; }
      /* Empty filler cells that keep Facebook's last row left-aligned. */
      html[data-fmf-mode="hide"] [data-fmf-r] [data-fmf-batch] > div:has(> div:only-child:empty) { display: none !important; }
    `;
  }

  function commonAncestor(nodes) {
    let ancestor = nodes[0];
    while (ancestor && !nodes.every((n) => ancestor.contains(n))) ancestor = ancestor.parentElement;
    return ancestor;
  }

  // The batches are the parents of the cards that sit next to Facebook's <style> tags.
  function findGridRoot(findCard) {
    const batches = new Set();
    for (const anchor of document.querySelectorAll(ITEM_LINKS)) {
      const batch = findCard(anchor).parentElement;
      if (batch?.querySelector(":scope > style")) batches.add(batch);
    }
    if (batches.size < 2) return null;
    const ancestor = commonAncestor([...batches]);
    return ancestor && ancestor !== document.body && ancestor !== document.documentElement ? ancestor : null;
  }

  // Facebook sizes cells with a rule like `.g381_242{max-inline-size:381px;min-inline-size:242px}`.
  // Read it before merging: once merged, Facebook re-measures and emits distorted values.
  function readMinWidth(rootEl) {
    for (const style of rootEl.querySelectorAll(`${BATCH} > style`)) {
      const match = /min-inline-size:\s*([\d.]+)px/.exec(style.textContent);
      if (match) return Number(match[1]);
    }
    return DEFAULT_MIN_WIDTH;
  }

  function mergeBatch(batch) {
    batch.dataset.fmfBatch = "";
    for (let el = batch; el && el !== gridRoot; el = el.parentElement) {
      el.dataset.fmfM = "c";
      if (el.parentElement === gridRoot) break;
      for (const sibling of el.parentElement.children) {
        if (sibling === el || sibling.tagName === "STYLE" || sibling.dataset.fmfM) continue;
        // Section headings keep a full row; the empty per-batch header divs go away.
        sibling.dataset.fmfM = sibling.textContent.trim() ? "full" : "gone";
      }
    }
  }

  function merge(findCard) {
    if (!gridRoot || !gridRoot.isConnected) {
      gridRoot = findGridRoot(findCard);
      if (!gridRoot) return;
      css.textContent = rules(readMinWidth(gridRoot));
      if (!css.isConnected) document.documentElement.appendChild(css);
      gridRoot.dataset.fmfR = "";
    }

    for (const batch of gridRoot.querySelectorAll(`${BATCH}:not([data-fmf-batch])`)) {
      // Skip batch-like divs nested inside a batch that is already merged.
      if (batch.parentElement.closest("[data-fmf-batch]")) continue;
      mergeBatch(batch);
    }

    // Everything else under the root (loading row, infinite-scroll sentinels) gets
    // a full row, so it keeps a box and stays after the cards.
    for (const child of gridRoot.children) {
      if (!child.dataset.fmfM) child.dataset.fmfM = "full";
    }
  }

  root.FMFLayout = { merge };
})(globalThis);
