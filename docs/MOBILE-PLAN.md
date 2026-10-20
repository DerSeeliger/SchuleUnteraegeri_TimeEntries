# Time Entry Mobile: PWA with a shared core

## Context
The Firefox extension (repo: `Time Entry Source`, v1.0.0, signed for self-distribution) works. Next, the team (max. 4 people: 2 iPhone, 2 Android) should be able to stamp from their phones with **exactly the same logic**, and in step 2 **directly from the home screen**.

Research ruled out the alternatives:
- The Power Automate mobile app, including its widgets, reached end of support on 31.08.2026, with no replacement.
- A native app of our own is out because of Apple costs and distribution (99 USD/year, Mac or cloud build, TestFlight/ABM). This was decided.
- Script apps (Scriptable/Tasker) would mean two ports and a hard setup per person.

**Decision:** a **Progressive Web App (PWA)** on **GitHub Pages**. The extension and the PWA use **the same core files**, so there is one codebase and the logic is automatically 1:1. Costs: 0.

## Architecture

```
Time Entry Source/
  core/                  ← NEW: platform-independent logic (plain JS, classic scripts, no build)
    actions.js           ← from shared/actions.js (ACTIONS, MODE_ACTIONS, quips, nextAction, todaySummary, chatIdFromInput …)
    auth.js              ← from lib/graph.js: PKCE helpers, redeem(), getAccessToken(), scopes(), NeedsSignIn, graph()
    excel.js             ← lib/excel.js (recordAction, readToday, listTables, resolveWorkbook …) unchanged, storage via Platform
    teams.js             ← lib/teams.js, data-consent check via Platform.canSendTeams()
    service.js           ← from background.js: sendAction, finish/history, syncToday, lastFromToday
  platform/
    extension.js         ← Platform for Firefox: browser.storage.local, launchWebAuthFlow, permissions/data_collection, badge
    web.js               ← Platform for the PWA: storage (localStorage wrapper, async), redirect sign-in, no-op permissions
  (extension, as before) manifest.json, background.js (message router + badge only), popup/, options/, icons/
  web/                   ← NEW: PWA
    index.html / app.js  ← main page = popup UI (buttons, status, sync, history), handles ?action=…
    settings.html        ← = options page (account, Excel/sheet, mode, Teams, quips)
    manifest.webmanifest ← name, icons 192/512 (+maskable), display standalone, **shortcuts** per action
    sw.js                ← service worker: cache the app shell (versioned) for fast starts
    icons/
  tests/                 ← NEW: unit tests for core/ (node:test, fake Platform + fake Graph)
  .github/workflows/pages.yml ← NEW: builds _site from web/ + core/ + platform/web.js + shared/style.css → GitHub Pages
```

**Platform interface** (the only thing that differs between extension and web):
```js
Platform = {
  storage: { get(keys), set(obj), remove(keys) },   // async, same keys as today
  interactiveSignIn(authorizeUrl, redirectUri),      // extension: launchWebAuthFlow; web: full-page redirect
  redirectUri(),                                     // extension: identity.getRedirectURL(); web: location.origin + base path
  canSendTeams(),                                    // extension: permissions.contains({data_collection}); web: settings flag
  onChanged(cb),                                     // storage.onChanged / own event emitter
}
```

## Phase 0: Spike on real phones (go/no-go, ~1 day)
A minimal page on GitHub Pages: sign in → `GET /me` → show the name. Verify on 1× iPhone and 1× Android:
1. **Sign-in by redirect** in Safari, in the installed iOS PWA, and in Chrome/PWA on Android (PKCE, SPA redirect URI).
2. **Android manifest shortcuts:** does long-pressing the icon show the actions, and can they be pinned to the home screen?
3. **iOS Shortcuts widget → URL with `?action=`** opens **Safari**, not the installed PWA (iOS can't deep-link into a PWA). Check that a sign-in in Safari persists and the action runs.
4. **24-hour behaviour:** after the SPA refresh token expires, does a silent redirect with `prompt=none` work without typing?

**Admin step (Michael Iten):** add `https://derseeliger.github.io/SchuleUnteraegeri_TimeEntries/` as an additional **SPA redirect URI** in the Entra app "Time Entry". No new permissions.

If point 1 or 3 fails, stop and re-evaluate (fallback for iPhone: Scriptable + Shortcuts with the same core JS).

## Phase 1: Shared core (the extension stays functionally identical)
1. Move the files into `core/` and replace every `browser.*` access with `Platform.*`:
   - `lib/excel.js` (`browser.storage.local.get('workbook')`)
   - `lib/teams.js` (storage, `permissions.contains`)
   - `lib/graph.js` (storage, `identity.*`)
   - The logic from `background.js`: `sendAction`, `finish`, `syncToday`, `lastFromToday`, `connectFile`, `selectTable`
2. `platform/extension.js` implements the interface. `background.js` becomes a pure message router plus `setBadge`.
3. Update the `background.scripts` order in `manifest.json` (`core/*` + `platform/extension.js` + `background.js`), and add `core/` and `platform/extension.js` to `tools/package.ps1`.
4. **Tests** in `tests/`, taking over the earlier simulations as real tests: `recordAction` (all actions, no overwrite, C=E=F, Azubi 12:15/12:45, empty table, formula shift), `isSameDay` 1900/1904, `parseQuips`/`renderQuip`, `chatIdFromInput`, `scopes()`, `postQuip`. Run them with `node --test tests/` (Node LTS; VS Code's Node works as a fallback).
5. Test the extension manually (`about:debugging`): sign in, Connect, all buttons, sync, Teams test. Raise the version to 1.1.0 and upload to AMO as unlisted.

## Phase 2: PWA with the same functionality
- **web/app.js** reuses the popup rendering logic (`popup/popup.js`), with a client adapter instead of `runtime.sendMessage`. Where possible, share one render module rather than copying it. Mobile layout: large touch targets, taking over the style from `shared/style.css`.
- **settings.html** mirrors `options/options.js`. Differences:
  - no `permissions.request`
  - the redirect URI comes from `Platform.redirectUri()`
  - a first-run notice about data (sign-in, Excel, optional Teams), because the web has no Firefox data consent
  - Teams "Allow" = incremental consent, as in the extension (`teamsConsent`)
- **Web sign-in** (`platform/web.js`):
  - `signIn()` stores `verifier`, `state` and a pending action in `sessionStorage`, then redirects to authorize.
  - On load with `?code=`: redeem, clean the URL with `history.replaceState`, and resume the pending action.
  - When the refresh token has expired: first a redirect with `prompt=none`. On `login_required`, show a Sign-in button.
- **Security:**
  - CSP via `<meta>`: `default-src 'self'; connect-src https://login.microsoftonline.com https://graph.microsoft.com; script-src 'self'`
  - no third-party scripts, and `textContent` only, as in the extension
- **Service worker:** caches only the app shell (HTML/JS/CSS/icons) with a version string. **No** Graph responses in the cache.

## Phase 3: Home screen (step 2)
- **URL actions:** `index.html?action=login|lunch_start|lunch_end|leave|lunch30_leave`
  - On start: token → `sendAction(action)` → show a large ✓/✗ with "Today in Excel: …".
  - Clean the URL afterwards. A `sessionStorage` guard prevents double stamping on reload.
  - The "Lunch still open" warning appears as a confirm button instead of stamping automatically.
- **Android:** `shortcuts` in `manifest.webmanifest`, one per action. Show the mode-specific ones first, because Android shows up to about 4 on long-press. Each can be pinned to the home screen as its own icon.
- **iPhone:** a setup guide for the **Shortcuts app**. Per action, an "Open URLs" shortcut with the Pages URL plus `?action=…`, placed in the Shortcuts widget (up to 4 buttons in the medium size). Optionally, provide ready-made iCloud shortcut links so there's no manual setup.
- Optional: add a `?quick=1` mode that shows a compact result so the tap feels like a widget.

## Phase 4: Deployment and docs
- The GitHub Actions workflow `pages.yml` runs on push to `main` and publishes `_site/`. The URL is the redirect URI from Phase 0.
- README: a new section "Mobile (Android/iPhone)" covering installation (add to home screen, sign in, choose the sheet) and shortcuts or the widget per platform.
- PowerPoint (`../Time Entry Dokumentation.pptx`, build script in the scratchpad): add a slide for "Mobile" and update the architecture slide (core + two front ends).
- Update `PRIVACY.md`: the web app stores data in the browser storage on the phone.

## Files (the most important)
- New: `core/*.js`, `platform/extension.js`, `platform/web.js`, `web/*`, `tests/*.test.js`, `.github/workflows/pages.yml`
- Changed: `manifest.json` (script list, version), `background.js` (router only), `popup/popup.js` and `options/options.js` (client adapter), `tools/package.ps1` (include list), `README.md`, `PRIVACY.md`
- Removed after moving: `lib/*.js`, `shared/actions.js` (now in `core/`)

## Verification
1. `node --test tests/` is green. It covers all Excel rules, dates, quips and chat IDs.
2. Extension 1.1.0 behaves exactly like 1.0.0 (manual checklist: sign in, Connect/Test, 4 buttons + Azubi, sync, History, badge, Teams test).
3. PWA on Android (Chrome): install, sign in, choose the sheet, all buttons, pinned shortcuts stamp in one tap, the row is correct in Excel.
4. PWA on iPhone: sign in in Safari and in the home-screen PWA, the Shortcuts widget buttons stamp, and it's still signed in the next day.
5. Mixed use: log in via the extension, lunch via the phone, leave via the extension, all in the same row, with no duplicates.
6. Teams: the message comes from the phone just as it does from the extension (random quip, name in front).

## Open / risks
- **iOS:** a URL from Shortcuts opens Safari, not the installed PWA, so iPhone users also sign in in Safari. Safari's ITP deletes storage after 7 days without use, but daily use prevents that.
- **SPA sign-in:** Microsoft forces a fresh sign-in every 24 hours. That usually happens silently with a redirect; if not, one tap on Sign in.
- **Tokens in localStorage** on the phone: acceptable thanks to the strict CSP and no third-party code, and noted in `PRIVACY.md`.
