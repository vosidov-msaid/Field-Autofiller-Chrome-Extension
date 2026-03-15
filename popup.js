const FIELDS = ["name", "email", "phone", "company", "address"];
const STORAGE_KEY = "profile";

const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("saveBtn");
const fillBtn = document.getElementById("fillBtn");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function readProfileFromForm() {
  const profile = {};

  for (const field of FIELDS) {
    const input = document.getElementById(field);
    profile[field] = input ? input.value.trim() : "";
  }

  return profile;
}

function writeProfileToForm(profile) {
  for (const field of FIELDS) {
    const input = document.getElementById(field);
    if (input) {
      input.value = profile[field] || "";
    }
  }
}

async function loadProfile() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const profile = data[STORAGE_KEY] || {};
  writeProfileToForm(profile);
}

async function saveProfile() {
  const profile = readProfileFromForm();
  await chrome.storage.local.set({ [STORAGE_KEY]: profile });
  setStatus("Profile saved.");
}

async function autofillCurrentTab() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const profile = data[STORAGE_KEY] || {};

  if (!Object.values(profile).some(Boolean)) {
    setStatus("Please save profile data first.", true);
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || tab.id == null) {
    setStatus("No active tab found.", true);
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "AUTOFILL_FIELDS",
      profile
    });

    const count = response && typeof response.filledCount === "number"
      ? response.filledCount
      : 0;

    setStatus(`Autofilled ${count} field${count === 1 ? "" : "s"}.`);
  } catch (error) {
    setStatus("Could not autofill this page.", true);
  }
}

saveBtn.addEventListener("click", () => {
  saveProfile().catch(() => setStatus("Failed to save profile.", true));
});

fillBtn.addEventListener("click", () => {
  autofillCurrentTab().catch(() => setStatus("Autofill failed.", true));
});

loadProfile().catch(() => setStatus("Could not load saved profile.", true));
