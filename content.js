const FIELD_HINTS = {
  name: ["name", "fullname", "full-name", "first", "last", "full_name"],
  email: ["email", "e-mail", "mail"],
  phone: ["phone", "mobile", "tel", "telephone"],
  company: ["company", "organization", "org", "business"],
  address: ["address", "street", "city", "zip", "postal"]
};

const MODAL_WATCH_TIMEOUT_MS = 20000;
const MODAL_WATCH_DEBOUNCE_MS = 120;

let modalWatchObserver = null;
let modalWatchTimer = null;
let modalWatchDebounceTimer = null;

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function buildMainFieldHints(fieldKey, customHints) {
  const defaultHints = FIELD_HINTS[fieldKey] || [];
  const userHints = Array.isArray(customHints[fieldKey])
    ? customHints[fieldKey].map((hint) => normalizeText(hint)).filter(Boolean)
    : [];

  return Array.from(new Set([...defaultHints, ...userHints]));
}

function matchesFieldByHints(element, hints) {
  if (!Array.isArray(hints) || !hints.length) {
    return false;
  }

  const textParts = [
    element.name,
    element.id,
    element.type,
    element.placeholder,
    element.getAttribute("aria-label"),
    element.getAttribute("autocomplete"),
    element.getAttribute("data-testid")
  ];

  const label = element.labels && element.labels.length > 0
    ? element.labels[0].textContent
    : "";
  textParts.push(label);

  const haystack = normalizeText(textParts.filter(Boolean).join(" "));
  return hints.some((hint) => haystack.includes(hint));
}

function buildAutofillEntries(profile, customHints, customFields) {
  const entries = [];

  for (const [fieldKey, fieldValue] of Object.entries(profile || {})) {
    const value = String(fieldValue || "").trim();
    if (!value) {
      continue;
    }

    entries.push({
      value,
      hints: buildMainFieldHints(fieldKey, customHints || {})
    });
  }

  if (Array.isArray(customFields)) {
    for (const field of customFields) {
      const value = String(field && field.value || "").trim();
      if (!value) {
        continue;
      }

      const userHints = Array.isArray(field && field.hints)
        ? field.hints.map((hint) => normalizeText(hint)).filter(Boolean)
        : [];

      const labelHint = normalizeText(field && field.label || "");
      if (labelHint) {
        userHints.push(labelHint);
      }

      const hints = Array.from(new Set(userHints));
      if (!hints.length) {
        continue;
      }

      entries.push({ value, hints });
    }
  }

  return entries;
}

function setElementValue(element, value) {
  const tagName = element.tagName.toLowerCase();
  if (tagName !== "input" && tagName !== "textarea" && tagName !== "select") {
    return false;
  }

  if (element.disabled || element.readOnly) {
    return false;
  }

  element.focus();
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function autofillFields(profile, customHints, customFields) {
  const elements = Array.from(document.querySelectorAll("input, textarea, select"));
  const entries = buildAutofillEntries(profile, customHints, customFields);
  let filledCount = 0;

  for (const entry of entries) {
    for (const element of elements) {
      if (!matchesFieldByHints(element, entry.hints)) {
        continue;
      }

      if (setElementValue(element, entry.value)) {
        filledCount += 1;
      }
    }
  }

  return filledCount;
}

function stopModalWatch() {
  if (modalWatchObserver) {
    modalWatchObserver.disconnect();
    modalWatchObserver = null;
  }

  if (modalWatchTimer) {
    clearTimeout(modalWatchTimer);
    modalWatchTimer = null;
  }

  if (modalWatchDebounceTimer) {
    clearTimeout(modalWatchDebounceTimer);
    modalWatchDebounceTimer = null;
  }
}

function startModalWatch(profile, customHints, customFields) {
  stopModalWatch();

  const root = document.documentElement;
  if (!root) {
    return;
  }

  const tryAutofill = () => {
    const filledCount = autofillFields(profile, customHints, customFields);
    if (filledCount > 0) {
      stopModalWatch();
    }
  };

  modalWatchObserver = new MutationObserver(() => {
    if (modalWatchDebounceTimer) {
      clearTimeout(modalWatchDebounceTimer);
    }

    modalWatchDebounceTimer = setTimeout(() => {
      tryAutofill();
    }, MODAL_WATCH_DEBOUNCE_MS);
  });

  modalWatchObserver.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "open", "aria-hidden"]
  });

  modalWatchTimer = setTimeout(() => {
    stopModalWatch();
  }, MODAL_WATCH_TIMEOUT_MS);
}

if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== "AUTOFILL_FIELDS") {
      return;
    }

    const filledCount = autofillFields(
      message.profile || {},
      message.customHints || {},
      message.customFields || []
    );

    if (filledCount > 0) {
      stopModalWatch();
      sendResponse({ filledCount, watching: false });
      return;
    }

    startModalWatch(
      message.profile || {},
      message.customHints || {},
      message.customFields || []
    );
    sendResponse({ filledCount: 0, watching: true, timeoutMs: MODAL_WATCH_TIMEOUT_MS });
  });
}
