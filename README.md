# Secure Bookmarks

A password-protected Chrome extension for encrypted bookmark storage. Nothing is readable until you unlock the vault with your master password, and the session locks again when Chrome restarts.

## Features

- **First-run setup** to create a vault with a master password
- **Popup quick add** for fast bookmark capture from the current tab
- **Options page** for full bookmark management in a dedicated tab
- **Search, edit, delete, and sort** bookmarks
- **Import and export** bookmark data as JSON
- **Change password** without losing stored bookmarks
- **Auto-lock** when the browser session ends

## Security design

| Layer | Algorithm | Details |
|-------|-----------|---------|
| Key derivation | PBKDF2 | SHA-256, 200,000 iterations, random 16-byte salt |
| Encryption | AES-256-GCM | Random IV for each save operation |
| Session | `chrome.storage.session` | Password kept in memory-only session storage |
| Storage | `chrome.storage.local` | Only encrypted ciphertext is persisted |

All cryptographic operations use the browser's built-in Web Crypto API. No third-party crypto libraries are used.

## Project structure

```text
secure-bookmarks/
├── index.html
├── options.html
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── App.tsx
│   ├── OptionsApp.tsx
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── main.tsx
└── vite.config.ts
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Build the extension

```bash
npm run build
```

This generates the extension bundle in `dist/`.

### 3. Load the extension in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the generated `dist/` folder

## Usage

1. Click the extension icon to open the popup.
2. Create a vault or unlock an existing one.
3. Use **Current Page** to prefill the active tab.
4. Open **Manage All** to launch the options page for searching, editing, importing, exporting, and deleting bookmarks.

## How locking works

- **During a session** the password is reused from `chrome.storage.session`, so you usually only unlock once per browser session.
- **After a restart** the session storage is cleared by Chrome, so the vault returns to the locked state.

## Notes

- Bookmarks are stored only inside this extension and are not added to Chrome's native bookmark bar.
- If you forget your master password, the encrypted data cannot be recovered.

## License

MIT. See [LICENSE](LICENSE) for the full text.
