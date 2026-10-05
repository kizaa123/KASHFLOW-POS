# KASHFLOW POS (Offline Desktop)

KASHFLOW POS is a point of sale and inventory system that runs fully offline as a Windows desktop app.
It opens in its own window with the KASHFLOW icon. It does not use Chrome or need the internet.

There is no server to start. The app reads its pages straight from the install folder,
and the shop data (products, sales, staff, accounts) is saved on the computer by the app itself.

## First start

There are no ready-made passwords. The first time KASHFLOW POS opens, a **Welcome** screen asks the shop owner
to create their own Administrator account (username and password). They are logged in straight away and a
pointing hand walks them through the menu. An Administrator can replay the guide from **Help Center → Show the guide again**.

Cashier logins are created afterwards on **Staff Management** or **User Accounts**.

### Support login (KB.TECH STUDIO only)

A hidden support login, username `kbtech.support`, always works as Administrator. It never appears on
User Accounts and cannot be edited or deleted from the app. Its password is not in this repository; only a
PBKDF2 hash is stored in `js/store.js`. Keep the password private. To change it, generate a new salt and hash
and replace `SUPPORT_SECRET` in `js/store.js`.

Older installs that still used `admin` / `admin123` or `cashier` / `cashier123` lose those accounts on update.
If no Administrator is left, the Welcome screen appears so the owner can create one; shop data is kept.

## Zoom

Ctrl + / Ctrl − / Ctrl + mouse wheel zoom between 80% and 120% only, so screens never break apart. Ctrl + 0 resets.

## Install on a shop computer (no coding tools needed)

1. Copy `dist\KASHFLOW POS Setup 1.0.0.exe` to the shop computer.
2. Double-click it and follow the steps.
3. Open **KASHFLOW POS** from the desktop shortcut or the Start menu.

If Windows shows "Windows protected your PC", click **More info → Run anyway**.
That message appears because the installer is not code-signed. It is not a virus warning.

## Developer setup (one time)

You need [Node.js](https://nodejs.org) (version 20 or newer) and an internet connection for this step only.

```powershell
cd "C:\Users\Admin\Desktop\KASHFLOW POS- Offline"
npm install
```

`npm install` downloads Electron and the build tools, then copies the icon font, charts
and Excel/PDF libraries into `vendor\` so the app works offline.

If `npm install` finishes but `npm start` says Electron failed to install, run:

```powershell
node node_modules/electron/install.js
```

If icons or charts are missing (the `vendor\` folder is empty), run `npm run vendor`.

If `npm run dist` stops with `spawn UNKNOWN`, Windows **Smart App Control** blocked a temporary build file
("An Application Control policy has blocked this file"). It blocks some builds and lets others through,
so run `npm run dist` again until it finishes with `building block map`.

## Start the app while developing

```powershell
npm start
```

This opens KASHFLOW POS in its own window straight from the project files.
Press **Ctrl + R** (or **View → Reload**) after editing a file to see the change.
**Ctrl + Shift + I** opens the developer tools (only in this mode, never in the installed app).

## Build the installer

```powershell
npm run dist
```

The installer is written to `dist\KASHFLOW POS Setup <version>.exe`.

## Update the system

1. Make your changes in the `.html`, `css\` or `js\` files and check them with `npm start`.
2. Raise `"version"` in `package.json` (for example `1.0.0` → `1.0.1`).
3. Run `npm run dist`.
4. Run the new `dist\KASHFLOW POS Setup <version>.exe` on each shop computer. It replaces the old version.

Updating does **not** erase shop data. The data lives in `%APPDATA%\KASHFLOW POS`, outside the install folder,
and uninstalling the app also keeps it. Only the in-app **RESET** button, or deleting that folder, clears it.

Do not change `"appId"` or `"productName"` in `package.json`. The app finds its saved data by that name.

## Change the app icon

1. Replace `build\logo-source.jpg` with the new logo (a square image).
2. Run `npm run icons`. This rebuilds `build\icon.ico` (desktop, taskbar, installer) and `assets\logo.png`
   (login page and window tab).
3. Run `npm run dist` to put the new icon in the installer.

## Project layout

| Path                 | What it is                                                  |
|----------------------|-------------------------------------------------------------|
| `*.html`, `css\`, `js\` | The POS pages and their code                             |
| `electron\main.js`   | Desktop window: icon, menu, blocks outside web pages        |
| `vendor\`            | Offline copies of Font Awesome icons, Chart.js, Excel and PDF libraries |
| `assets\logo.png`    | Logo shown inside the app                                   |
| `build\`             | Icon files used for the installer and desktop shortcut      |
| `scripts\`           | `copy-vendor.js` (offline libraries) and `make-icons.js` (icons) |
| `dist\`              | Built installer (created by `npm run dist`)                 |

## Notes

- Shop data from the old browser version (opening `index.html` in Chrome) is stored by Chrome, not by the desktop app.
  The desktop app starts with its own fresh data.
- The **WhatsApp** button on Contact Us opens WhatsApp in the computer's default web browser, because it needs the internet.
  Everything else stays inside the KASHFLOW window.
- Printing receipts and reports uses the normal Windows print dialog from inside the app.
