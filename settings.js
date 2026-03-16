const MAIN_FIELDS = ["name", "email", "phone", "company", "address"];
const STORAGE_KEY = "profile";
const HINTS_STORAGE_KEY = "customFieldHints";
const CUSTOM_FIELDS_STORAGE_KEY = "customFields";

const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("saveBtn");
const closeBtn = document.getElementById("closeBtn");
const addCustomFieldBtn = document.getElementById("addCustomFieldBtn");
const customFieldsContainer = document.getElementById("customFieldsContainer");

let customFieldsState = [];

function setStatus(message, isError = false) {
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", isError);
  }
}

function readProfileFromForm() {
  const profile = {};

  for (const field of MAIN_FIELDS) {
    const input = document.getElementById(field);
    profile[field] = input ? input.value.trim() : "";
  }

  return profile;
}

function writeProfileToForm(profile) {
  for (const field of MAIN_FIELDS) {
    const input = document.getElementById(field);
    if (input) {
      input.value = profile[field] || "";
    }
  }
}

function parseHintString(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function readHintsFromForm() {
  const customHints = {};

  for (const field of MAIN_FIELDS) {
    const input = document.getElementById(`hints-${field}`);
    customHints[field] = parseHintString(input ? input.value : "");
  }

  return customHints;
}

function writeHintsToForm(customHints) {
  for (const field of MAIN_FIELDS) {
    const input = document.getElementById(`hints-${field}`);
    if (input) {
      const hints = Array.isArray(customHints[field]) ? customHints[field] : [];
      input.value = hints.join(", ");
    }
  }
}

function generateCustomFieldId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `cf-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function sanitizeCustomField(field) {
  const normalized = field || {};
  return {
    id: normalized.id || generateCustomFieldId(),
    label: String(normalized.label || "").trim(),
    value: String(normalized.value || "").trim(),
    hints: Array.isArray(normalized.hints)
      ? normalized.hints.map((hint) => String(hint || "").trim().toLowerCase()).filter(Boolean)
      : []
  };
}

function renderCustomFields() {
  customFieldsContainer.innerHTML = "";

  if (!customFieldsState.length) {
    const empty = document.createElement("div");
    empty.className = "empty-custom-fields";
    empty.textContent = "No custom fields yet. Click + Add Field to create one.";
    customFieldsContainer.append(empty);
    return;
  }

  customFieldsState.forEach((field, index) => {
    const wrapper = document.createElement("section");
    wrapper.className = "custom-field";
    wrapper.dataset.fieldId = field.id;

    wrapper.innerHTML = `
      <div class="custom-field-top">
        <span class="custom-field-title">Custom Field ${index + 1}</span>
        <button type="button" class="danger remove-custom-field-btn">Remove</button>
      </div>
      <div class="row">
        <label>
          Field Name
          <input type="text" class="custom-field-label" value="${field.label.replace(/"/g, "&quot;")}" placeholder="LinkedIn URL" />
        </label>
        <label>
          Value
          <input type="text" class="custom-field-value" value="${field.value.replace(/"/g, "&quot;")}" placeholder="https://linkedin.com/in/your-name" />
        </label>
        <label>
          Hints (comma-separated)
          <input type="text" class="custom-field-hints" value="${field.hints.join(", ").replace(/"/g, "&quot;")}" placeholder="linkedin, profile_url" />
        </label>
      </div>
    `;

    const removeBtn = wrapper.querySelector(".remove-custom-field-btn");
    removeBtn.addEventListener("click", () => {
      customFieldsState = customFieldsState.filter((item) => item.id !== field.id);
      renderCustomFields();
    });

    customFieldsContainer.append(wrapper);
  });
}

function readCustomFieldsFromForm() {
  const nodes = customFieldsContainer.querySelectorAll(".custom-field");
  const fields = [];

  nodes.forEach((node) => {
    const id = node.dataset.fieldId || generateCustomFieldId();
    const label = (node.querySelector(".custom-field-label")?.value || "").trim();
    const value = (node.querySelector(".custom-field-value")?.value || "").trim();
    const hints = parseHintString(node.querySelector(".custom-field-hints")?.value || "");

    if (!label && !value && !hints.length) {
      return;
    }

    fields.push({ id, label, value, hints });
  });

  return fields;
}

function writeCustomFieldsToForm(customFields) {
  customFieldsState = Array.isArray(customFields)
    ? customFields.map((field) => sanitizeCustomField(field))
    : [];
  renderCustomFields();
}

async function loadProfile() {
  const data = await chrome.storage.local.get([
    STORAGE_KEY,
    HINTS_STORAGE_KEY,
    CUSTOM_FIELDS_STORAGE_KEY
  ]);
  const profile = data[STORAGE_KEY] || {};
  const customHints = data[HINTS_STORAGE_KEY] || {};
  const customFields = data[CUSTOM_FIELDS_STORAGE_KEY] || [];
  writeProfileToForm(profile);
  writeHintsToForm(customHints);
  writeCustomFieldsToForm(customFields);
}

async function saveProfile() {
  const profile = readProfileFromForm();
  const customHints = readHintsFromForm();
  const customFields = readCustomFieldsFromForm();
  customFieldsState = customFields;
  renderCustomFields();

  await chrome.storage.local.set({
    [STORAGE_KEY]: profile,
    [HINTS_STORAGE_KEY]: customHints,
    [CUSTOM_FIELDS_STORAGE_KEY]: customFields
  });
  setStatus("Profile, hints, and custom fields saved.");
}

if (saveBtn) {
  saveBtn.addEventListener("click", () => {
    saveProfile().catch(() => setStatus("Failed to save profile.", true));
  });
}

if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    window.close();
  });
}

if (addCustomFieldBtn) {
  addCustomFieldBtn.addEventListener("click", () => {
    customFieldsState.push({
      id: generateCustomFieldId(),
      label: "",
      value: "",
      hints: []
    });
    renderCustomFields();
  });
}

loadProfile().catch(() => setStatus("Could not load saved profile.", true));
