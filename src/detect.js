// Tells Facebook Marketplace partner listings (imported from external sites
// such as Gul&Gratis, eBay or Catawiki) apart from listings published on Facebook.
//
// Signals observed in the Marketplace grid (November 2026):
// - The card link carries a `tracking` query parameter whose nested
//   `commerce_rank_obj` has `upsell_type: 212` for partner listings
//   (129 for native ones), and maps the item ID to retrieval source 5021.
// - Partner cards show an icon plus a localized "Partner listing" label;
//   native cards have no icon inside the link.
// The link signal is used first because it does not depend on the UI language.

(function (root) {
  const PARTNER_UPSELL_TYPE = 212;
  const PARTNER_RETRIEVAL_SOURCE = 5021;

  // Localized "Partner listing" labels; the icon check covers other languages.
  const PARTNER_LABELS = [
    "annuncio del partner",
    "partner listing",
    "anuncio de socio",
    "anúncio de parceiro",
    "annonce partenaire",
    "partnerangebot",
    "partnerannonce",
  ];

  function itemIdFromHref(href) {
    const match = /\/marketplace\/item\/(\d+)/.exec(href);
    return match ? match[1] : null;
  }

  // Returns "partner", "native" or null (no ranking data in the link).
  function classifyHref(href) {
    let url;
    try {
      url = new URL(href, "https://www.facebook.com");
    } catch {
      return null;
    }
    const tracking = url.searchParams.get("tracking");
    if (!tracking) return null;

    // commerce_rank_obj is JSON nested as a string, so its quotes may be escaped.
    const upsell = /upsell_type\\*"\s*:\s*(\d+)/.exec(tracking);
    if (upsell && Number(upsell[1]) === PARTNER_UPSELL_TYPE) return "partner";

    const id = itemIdFromHref(url.pathname);
    if (id) {
      const source = new RegExp(`"${id}\\\\*"\\s*:\\s*(\\d+)`).exec(tracking);
      if (source && Number(source[1]) === PARTNER_RETRIEVAL_SOURCE) return "partner";
    }

    return upsell ? "native" : null;
  }

  function classifyAnchor(anchor) {
    const byHref = classifyHref(anchor.getAttribute("href") || "");
    if (byHref) return byHref;
    const text = (anchor.textContent || "").toLowerCase();
    if (PARTNER_LABELS.some((label) => text.includes(label))) return "partner";
    return anchor.querySelector("svg") ? "partner" : "native";
  }

  // The grid cell: the highest ancestor whose item links all point to this listing
  // (some cards link the same item twice, from the image and from the text).
  function findCard(anchor) {
    const id = itemIdFromHref(anchor.getAttribute("href") || "");
    const onlyThisItem = (el) =>
      [...el.querySelectorAll('a[href*="/marketplace/item/"]')].every(
        (a) => itemIdFromHref(a.getAttribute("href") || "") === id
      );
    let card = anchor;
    while (card.parentElement && card.parentElement !== document.body && onlyThisItem(card.parentElement)) {
      card = card.parentElement;
    }
    return card;
  }

  const api = { classifyHref, classifyAnchor, findCard, itemIdFromHref };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MNODetect = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
