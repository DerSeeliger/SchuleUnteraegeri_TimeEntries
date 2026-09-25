# Time Entry (Firefox extension)

One-click time logging. The extension signs in with your Microsoft account and fills in your row in the existing time sheet (`ArbeitszeitStempeln_Auto.xlsx`) through Microsoft Graph. It can also post a random message to a Teams chat, in your name. No Power Automate, no workflows, no Premium license needed.

## The Excel file

Each person has their own sheet with one Excel table in it (e.g. sheet `DavidStempel` with table `JonasStempel4`). Each day is one row:

| A | B | C | D | E | F | G / H / I |
|---|---|---|---|---|---|---|
| Datum (text `dd.mm.yyyy`) | Morgen kommen | Mittagspause gehen | *formula* | Mittagspause kommen | Abend gehen | *formulas* |

| Button | What it writes into today's row | Mode |
|---|---|---|
| Log in | new row: A = date, B = now | normal, azubi |
| Start lunch | C = now | normal |
| End lunch | E = now | normal |
| Leave work | F = now. If lunch is missing, C and E = now too (no lunch = C = E = F, as before) | normal |
| Leave (+30 min lunch) | C = 12:15, E = 12:45 (only if still empty), F = now | azubi |

Rules:
- A filled cell is **never overwritten**. Logging in twice or leaving twice shows an error in the popup. To fix a mistake, edit the Excel file.
- New rows get the table's formulas (D, G, H, I), so totals and overtime keep working.
- Everything outside the table (notes in column J, Sollarbeitszeit in K1, the "Abrechnung" sheet) is not touched.
- **New colleague:** copy an existing person's sheet, clear the rows, and pick it in the extension's settings.

## Setup

### 1. Load the extension (Firefox)
1. Open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → select `manifest.json`.
2. Open the settings (⚙ in the popup) and copy the **Redirect URI** shown there.

### 2. Entra app registration (once for the whole team)
1. Go to **Entra admin center** → **App registrations** → **New registration**.
   - Name: `Time Entry`
   - Supported account types: *Accounts in this organizational directory only*
   - Redirect URI: platform **Single-page application (SPA)**, and paste the URI from step 1.2.
2. **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated**:
   - `User.Read`, `Files.ReadWrite.All`, `offline_access`, `openid`, `profile` (sign-in and Excel)
   - `ChatMessage.Send`, `Chat.ReadBasic` (only needed for Teams messages)

   If users aren't allowed to consent themselves, an admin clicks **Grant admin consent**.
3. No client secret is needed.
4. Copy the **Application (client) ID** and **Directory (tenant) ID** from *Overview* into the settings, then click **Sign in**.

The redirect URI comes from the extension ID in `manifest.json`, so it is the same for everyone who installs this extension.

### 3. Excel
1. Open `ArbeitszeitStempeln_Auto.xlsx` in Excel. Go to **Share → Copy link**, paste the link into the settings, and click **Connect**.
2. Under **Your sheet**, pick your own sheet. It's preselected if the sheet name contains your first name.
3. Click **Test**. It shows the sheet, the number of days, and what's already recorded today.
4. Turn off the old Power Automate flows for yourself, so no day gets recorded twice.

### 4. Teams messages (optional)

The extension posts the message itself through Microsoft Graph, **as you** (a normal chat message from your account) into a chat you choose. There is no workflow, webhook or bot in between.

**Once, by the admin:** the Entra app needs the delegated permissions `ChatMessage.Send` and `Chat.ReadBasic` (see step 2). If users can't consent themselves, click **Grant admin consent**.

**Per person, in the settings under "4. Teams messages":**
1. Click **Allow Teams access**. A Microsoft window opens and asks you to allow chat access. This is only asked when you turn on Teams; for Excel-only users nothing changes.
2. Choose the chat:
   - **Load my chats** lists your group chats and 1:1 chats. Pick one from **Chat**.
   - Or, in Teams, right-click the chat → **Copy link**, paste it under *…or paste a chat link*, and click **Use link**.
3. Click **Send test**. A test message from you should appear in the chat.
4. Edit the messages (see below), tick **Send a message to Teams**, and click **Save**.

**Messages:**
- Each event (Log in, Start lunch, End lunch, Leave work, Leave +30 min) has its own panel. Put one message per line; each time you stamp, one is picked at random.
- You can paste an array from an old Power Automate flow, e.g. `createArray('flitzt nach Hause', 'düst nach Hause')[rand(0,2)]`, or a JSON array `["…", "…"]`. It's split into lines automatically.
- Your first name goes in front automatically ("flitzt nach Hause" becomes "David flitzt nach Hause"), unless the line contains `{name}` somewhere else. `{time}` inserts the current time.
- **🎲 Preview** shows a random message, and **Reset to defaults** restores the built-in texts.
- An empty panel means no message is sent for that event.

**Limits:**
- Messages come from **your account**, not from a bot. That's the trade-off for not needing a workflow.
- Posting into Teams' **"chat with yourself"** usually isn't supported by Graph. Use a group chat (even with just two people) or a 1:1 chat.
- Meeting chats are not listed.

## Notes

- Everything (sign-in tokens, file ID, chat ID, messages) is stored only in `browser.storage.local` on your machine, never in this repo.
- Microsoft limits sign-in for browser apps to about 24 hours. The extension renews it silently. If that fails, the popup asks you to sign in again in the settings.
- The popup's History list shows the last 50 clicks, including errors. The badge shows ✓ briefly on success, and `!` on failure until the next success.
- The time is always logged first. If Teams fails, the entry is still in Excel, and the History list shows "(Teams failed)".
- Temporary add-ons are removed when Firefox restarts. For a permanent install, sign the extension as an *unlisted* add-on on addons.mozilla.org.
