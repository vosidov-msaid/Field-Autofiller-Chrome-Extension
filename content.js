const FIELD_HINTS = {
  name: ["name", "fullname", "full-name", "first", "last"],
  email: ["email", "e-mail", "mail"],
  phone: ["phone", "mobile", "tel", "telephone"],
  company: ["company", "organization", "org", "business"],
  address: ["address", "street", "city", "zip", "postal"]
};

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function matchesField(element, fieldKey) {
  const hints = FIELD_HINTS[fieldKey];
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

function autofillFields(profile) {
  const elements = Array.from(document.querySelectorAll("input, textarea, select"));
  let filledCount = 0;

  for (const [fieldKey, fieldValue] of Object.entries(profile)) {
    if (!fieldValue) {
      continue;
    }

    for (const element of elements) {
      if (!matchesField(element, fieldKey)) {
        continue;
      }

      if (setElementValue(element, fieldValue)) {
        filledCount += 1;
      }
    }
  }

  return filledCount;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "AUTOFILL_FIELDS") {
    return;
  }

  const filledCount = autofillFields(message.profile || {});
  sendResponse({ filledCount });
});
