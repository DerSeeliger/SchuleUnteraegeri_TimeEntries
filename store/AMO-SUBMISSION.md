# AMO submission – Time Entry

Copy-paste texts and checklist for submitting to [addons.mozilla.org](https://addons.mozilla.org/developers/).

## Recommended: unlisted (self-distribution)

Choose **"On your own"** when uploading. Why:

- The extension only works with a Schulen Unterägeri Microsoft account, the "Time Entry" Entra app and the team's Excel file. Public users can't use it.
- A **listed** add-on needs **test credentials** for Mozilla's reviewers ("if an account is needed for any part of the add-on's functionality, testing credentials"). That would mean creating a test account in the school tenant.
- Unlisted add-ons are still **signed by Mozilla**. The resulting `.xpi` can be installed permanently in normal Firefox, with no more `about:debugging` after every restart.

Unlisted add-ons must follow the same policies. Everything below applies to both.

## Upload package

```powershell
powershell -ExecutionPolicy Bypass -File tools\package.ps1
```

This creates `web-ext-artifacts\time-entry-<version>.zip`, containing only the files the extension needs, with `manifest.json` at the root. Upload that file.

**Source code:** not needed. The extension has no build step, minification or bundling, so the uploaded files *are* the source. Answer "No" to the source-code question.

## Listing texts (for listed, or to keep on file)

**Name:** Time Entry

**Summary** (max. 250 characters):
> Clock in and out with one click. Time Entry writes your working times straight into your Excel time sheet in Microsoft 365 and can post a message to a Teams chat. Built for the ICT team at Schulen Unterägeri.

**Description:**
> Time Entry replaces manual Power Automate flows for time tracking.
>
> **Features**
> - One-click buttons: Log in, Start lunch, End lunch, Leave work
> - Azubi mode: a fixed lunch break (12:15–12:45) is added automatically when you leave
> - Writes directly into your own row in a shared Excel time sheet via Microsoft Graph. Existing formulas keep working, and filled cells are never overwritten
> - Sync button, history of the last 50 actions, and a success/error badge
> - Optional: posts a random message from your own list to a Teams chat when you clock in or out
>
> **Requirements**
> - A Microsoft 365 work account in an organization that has registered the "Time Entry" Entra app
> - An Excel time sheet in the expected layout (one table per person, one row per day)
>
> **Privacy:** no own server, no tracking. Data only goes to Microsoft (sign-in, Excel, Teams). See the privacy policy.
>
> Not affiliated with or endorsed by Microsoft. Microsoft, Excel and Teams are trademarks of Microsoft Corporation.

**Categories:** Productivity (optional second: Other)

**Support website:** https://github.com/DerSeeliger/SchuleUnteraegeri_TimeEntries
**Support e-mail:** *(fill in)*

**License:** *(to be decided: see the note in the README / repository owner)*

**Privacy policy:** paste the contents of [`PRIVACY.md`](../PRIVACY.md).

## Notes to reviewer

> Time Entry is an internal tool for one organization (Schulen Unterägeri, Switzerland). It signs in with Microsoft Entra ID (OAuth 2.0 authorization code + PKCE via `browser.identity.launchWebAuthFlow`, SPA platform, no client secret) and calls Microsoft Graph with delegated permissions to (1) write clock-in/out times into a user-selected Excel table and (2) optionally post a chat message to a user-selected Teams chat.
>
> - No remote code, no minification, no build step: the submitted files are the source.
> - Network access is limited to `login.microsoftonline.com` and `graph.microsoft.com` (`host_permissions`, granted at runtime from the settings page).
> - Data collection: `authenticationInfo` (required, Microsoft sign-in) and `personalCommunications` (optional, only requested when the user enables Teams messages).
> - All settings and tokens are kept in `browser.storage.local`. No data is sent to the developer.
> - The tenant ID and client ID are entered by the user in the settings. They are not in the code.
>
> Testing requires an account in the organization's Microsoft 365 tenant. If needed, please contact us via the support e-mail and we'll arrange a test account.

## Checklist before upload

- [ ] `version` in `manifest.json` raised (every upload needs a new version)
- [ ] `tools\package.ps1` run, zip in `web-ext-artifacts\`
- [ ] Tested once in Firefox 140+ from the zip (`about:debugging` → Load Temporary Add-on → pick the zip)
- [ ] Privacy policy up to date
- [ ] License chosen (listed only)
- [ ] After signing: download the `.xpi` from AMO and share it with the team (drag it into Firefox to install)

## Important: don't change the add-on ID

`browser_specific_settings.gecko.id` (`time-entry@david-vibecoding`) determines the redirect URI registered in the Entra app. Changing it breaks sign-in for everyone until the Entra redirect URI is updated.
