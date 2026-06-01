<p align="center">
  <img src="images/icon128.png" alt="BM Runner" width="128" />
</p>

---

<p align="center">
  BM Runner is a Chrome extension that brings a KDE Runner-style alias launcher to your browser. Open a dialog with a keyboard shortcut, type to search your saved aliases, and open matching URLs in a new tab instantly.
</p>

## Description

The extension injects a searchable dialog into any page. Aliases are stored in `chrome.storage.sync` so they sync across all your Chrome profiles. Each alias maps a name to a URL — type the name (or part of it), hit Enter, and the URL opens in a new tab.

### Controls

| Key            | Action                         |
| -------------- | ------------------------------ |
| `Ctrl+Shift+K` | Open / close the runner dialog |
| `↑ / ↓`        | Navigate paginated results     |
| `Enter`        | Open the first matching alias  |
| `Esc`          | Close the dialog               |

### Features

- **Search** — filter aliases by name or value as you type
- **Pagination** — browse results 8 at a time with Prev / Next controls
- **Manage page** — full CRUD table with inline edit, delete, and pagination
- **Error popover** — inline feedback below the input (no alerts)
- **Favicons** — each result shows the target site's favicon
- **Sync** — aliases persist via `chrome.storage.sync`

## Download

Grab the latest `.crx` from the Releases page, then drag it into `chrome://extensions` (enable **Developer mode** first).

> Note: Some Brave versions display warnings or prevent enabling extensions installed from `.crx` files that are not distributed through the Chrome Web Store. If that happens, use the **Load unpacked** method instead.

### Unpacked Installation

Brave may block direct `.crx` installation even when **Developer mode** is enabled.

1. Download the source code ZIP or clone the repository.
2. Extract the project to a local folder.
3. Open `brave://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the project folder containing `manifest.json`.

The extension will be loaded locally and can be updated by pulling the latest changes from GitHub and reloading it from the extensions page.

## Usage

1. Press `Ctrl+Shift+K` to open the dialog
2. Type to search your aliases
3. Click a result or press Enter to open the URL in a new tab
4. Click **+ Add Alias** to create a new alias inline
5. Click **⚙** to open the full management page

## Project structure

```
bmrunner/
├── images/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── src/
│   ├── background.js
│   ├── content.js
│   ├── styles.css
│   ├── manage.html
│   ├── manage.js
│   └── manage.css
└── manifest.json
```
