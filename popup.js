const STORAGE_KEY = "profile";
const HINTS_STORAGE_KEY = "customFieldHints";
const CUSTOM_FIELDS_STORAGE_KEY = "customFields";

const mainStatus = document.getElementById("mainStatus");
const quickFillBtn = document.getElementById("quickFillBtn");
const openSettingsBtn = document.getElementById("openSettingsBtn");

function setMainStatus(message, isError = false) {
  if (mainStatus) {
    mainStatus.textContent = message;
    mainStatus.classList.toggle("error", isError);
  }
}

async function getAutofillTargetTab() {
  const windows = await chrome.windows.getAll({
    populate: true,
    windowTypes: ["normal"]
  });

  const focusedWindow = windows.find((windowInfo) => windowInfo.focused);
  const orderedWindows = focusedWindow
    ? [focusedWindow, ...windows.filter((windowInfo) => windowInfo.id !== focusedWindow.id)]
    : windows;

  for (const windowInfo of orderedWindows) {
    const activeTab = (windowInfo.tabs || []).find((tab) => tab.active);
    if (!activeTab || activeTab.id == null) {
      continue;
    }

    const url = activeTab.url || "";
    if (/^https?:\/\//.test(url)) {
      return activeTab;
    }
  }

  return null;
}

async function autofillCurrentTab() {
  if (!chrome || !chrome.tabs || !chrome.storage || !chrome.scripting) {
    setMainStatus("Extension APIs are unavailable. Reload the extension.", true);
    return;
  }

  const data = await chrome.storage.local.get([
    STORAGE_KEY,
    HINTS_STORAGE_KEY,
    CUSTOM_FIELDS_STORAGE_KEY
  ]);
  const profile = data[STORAGE_KEY] || {};
  const customHints = data[HINTS_STORAGE_KEY] || {};
  const customFields = data[CUSTOM_FIELDS_STORAGE_KEY] || [];

  const hasMainValues = Object.values(profile).some(Boolean);
  const hasCustomValues = Array.isArray(customFields)
    && customFields.some((field) => String(field && field.value || "").trim());

  if (!hasMainValues && !hasCustomValues) {
    setMainStatus("Please save at least one field value first.", true);
    return;
  }

  const tab = await getAutofillTargetTab();

  if (!tab || tab.id == null) {
    setMainStatus("Open a website tab (http/https) to autofill.", true);
    return;
  }

  const messagePayload = {
    type: "AUTOFILL_FIELDS",
    profile,
    customHints,
    customFields
  };

  try {
    let response;

    try {
      response = await chrome.tabs.sendMessage(tab.id, messagePayload);
    } catch (firstError) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
      response = await chrome.tabs.sendMessage(tab.id, messagePayload);
    }

    const count = response && typeof response.filledCount === "number"
      ? response.filledCount
      : 0;

    if (response && response.watching) {
      setMainStatus("No fields yet.");
      return;
    }

    setMainStatus(`Autofilled ${count} field${count === 1 ? "" : "s"}.`);
    
    setTimeout(() => {
      window.close();
    }, 800);
  } catch (error) {
    setMainStatus("Could not autofill this page.", true);
  }
}

if (quickFillBtn) {
  quickFillBtn.addEventListener("click", () => {
    autofillCurrentTab().catch(() => setMainStatus("Autofill failed.", true));
  });
}

if (openSettingsBtn) {
  openSettingsBtn.addEventListener("click", () => {
    chrome.windows.create({
      url: chrome.runtime.getURL("settings.html"),
      type: "popup",
      width: 700,
      height: 900
    });
  });
}

setMainStatus("");
