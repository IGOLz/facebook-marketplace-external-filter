// Shows the number of filtered partner listings on the toolbar badge.
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "count" || !sender.tab) return;
  const tabId = sender.tab.id;
  chrome.action.setBadgeText({ tabId, text: message.count ? String(message.count) : "" });
  chrome.action.setBadgeBackgroundColor({ tabId, color: "#1F8F5F" });
});
