chrome.action.onClicked.addListener((tab) => {
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: "toggle_widget" }).catch(() => {
      // Ignore if tab not ready or cannot receive message
    });
  }
});
