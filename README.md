# Field Autofiller Chrome Extension

Field Autofiller is a Chrome extension that fills web forms using saved profile data.
It supports standard fields (name, email, phone, company, address), custom hints, dynamic modal forms, and user-defined custom fields.

## Features

- Autofill common fields: full name, email, phone, company, address
- User-created custom fields (label, value, hints)


## How It Works

1. You save profile values and hints in the extension UI.
2. Click "Autofill Page".
3. The extension targets your active website tab and sends autofill data to the content script.

## Installation (Unpacked)

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.
5. Pin the extension if desired.

## Usage

1. Click the extension icon.
2. Fill your main profile fields.
3. Add per-field hints if a site uses unusual input names/ids.
4. Optionally add custom fields:
   - Click **+ Add Field**
   - Enter field name, value, and matching hints
5. Click **Save Profile**.
6. Open the target website tab and click **Autofill Page**.

## Contributing
Pull requests are welcome.


# Thanks for attention!