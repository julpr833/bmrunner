// I handle open-url requests from the content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "open-url") {
    let url = msg.url;
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) url = "https://" + url;
    chrome.tabs.create({ url });
  }
});

// I check if the content script is already in the page; if not, I inject it
async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { action: "ping" });
    return true;
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ["styles.css"],
    });
    return false;
  }
}

// I inject + open the dialog, retrying a few times in case of race
async function openRunner(tab) {
  if (!tab) return;
  await ensureContentScript(tab.id);
  for (let i = 0; i < 5; i++) {
    try {
      await chrome.tabs.sendMessage(tab.id, { action: "toggle-dialog" });
      return;
    } catch {
      if (i === 4) return;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}

// I listen for the Ctrl+Shift+K keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-runner") {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    openRunner(tab);
  }
});

// I listen for clicks on the extension toolbar icon
chrome.action.onClicked.addListener((tab) => {
  openRunner(tab);
});
