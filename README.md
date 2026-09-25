# Time Entry – Firefox extension

Clock in and out with one click. The extension writes your times straight into your own sheet in the shared time file `ArbeitszeitStempeln_Auto.xlsx`, exactly where the old Power Automate flows put them. It can optionally post a random message to a Teams chat, e.g. "David flitzt nach Hause und fliegt im Flight Sim".

---

## What you need

- **Firefox 140 or newer**
- Your **Microsoft account** from Schulen Unterägeri
- Access to the time file in SharePoint:
  *ICT-Support und Animation - General › Projekte Lehrlinge › Arbeitszeiten_Lehrlinge › ArbeitszeitStempeln_Auto.xlsx*
- The **Directory (tenant) ID** and **Application (client) ID**. Ask Michael Iten for them. They are not in this repository.

---

## 1. Install

### Signed version (recommended)
1. Get the file `time-entry-<version>.xpi` (from the GitHub **Releases** page, or from David Seeliger).
2. Drag it into a Firefox window, or open it via **☰ → Add-ons and themes → ⚙ → Install Add-on From File…**.
3. Confirm the prompt. It lists what the extension needs, including sending sign-in data to Microsoft.
4. The Time Entry icon (a clock) now appears in the toolbar. If you don't see it, click the puzzle icon 🧩 and pin it.

This installation stays after restarting Firefox.

### Development version (without signing)
1. Download this repository: **Code → Download ZIP**, then unzip it.
2. In Firefox, type into the address bar: `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on…** and select **`manifest.json`** in the unzipped folder.

> Firefox removes temporary add-ons whenever it restarts. Repeat steps 2–3 after a restart. Your settings are kept.

---

## 2. Set up (once)

Click the Time Entry icon, then **⚙** (Settings).

### Microsoft account
1. Paste the **Directory (tenant) ID** and **Application (client) ID** you got from Michael Iten.
2. Click **Sign in** and log in with your Microsoft account. If Firefox asks for permission to reach Microsoft, allow it.
3. You should see *"Signed in as …"*.

### Excel file
1. **Your own sheet:** check whether the time file already has a sheet for you (e.g. `DavidStempel`). If not, copy an existing person's sheet in Excel, rename it (e.g. `VornameStempel`), and delete the old rows.
2. Open the time file in Excel, click **Share → Copy link**, paste the link under **File link**, and click **Connect**.
3. Under **Your sheet**, choose **your own sheet**. It's preselected if the sheet name contains your first name. Check it anyway, or your times end up in someone else's sheet.
4. Click **Test**. It shows your sheet, how many days are in it, and what's recorded today.

### Mode
- **Normal:** you clock your lunch break yourself (Start lunch / End lunch).
- **Azubi:** no lunch buttons during the day. When you leave, a fixed lunch break of **12:15–12:45** is entered automatically.

Click **Save**.

If you used the old Power Automate flows, stop using them now. Otherwise a day may get recorded twice.

---

## 3. Daily use

Click the Time Entry icon and press the button for what you're doing:

| Button | Writes into today's row in your sheet | Mode |
|---|---|---|
| **Log in** | New row with today's date and your arrival time (column B) | both |
| **Start lunch** | Start of lunch break (column C) | Normal |
| **End lunch** | End of lunch break (column E) | Normal |
| **Leave work** | Leaving time (column F). No lunch clocked? Then C = E = F, like before | Normal |
| **Leave (+30 min lunch)** | Lunch 12:15–12:45 (C, E) and leaving time now (F) | Azubi |

- The **next logical step** is highlighted in blue.
- **Show all** reveals every button, for exceptions (e.g. a real lunch break in Azubi mode).
- The status line shows what's **in Excel today**, e.g. *"in 07:57 · lunch 12:15–12:45 · out 16:05"*.
- **⟳** (Sync) re-reads today's row from Excel, e.g. after you corrected something by hand.
- **History** lists your last 50 clicks, including errors.
- The icon shows a green **✓** after a successful click and a red **!** if something failed.

The totals and overtime columns in Excel keep calculating as before. The extension never touches your notes (column J) or anything outside your table.

### Made a mistake?
The extension **never overwrites** a time that's already there. Fix it directly in Excel, then press **⟳** in the popup.

---

## 4. Teams messages (optional)

The extension can post a message to a Teams chat when you clock in or out. The message is sent **from your own account**, as if you'd typed it.

### Set up
In Settings, under **4. Teams messages**:
1. Click **Allow Teams access**. Firefox first asks whether the extension may send chat messages, then Microsoft asks for chat access. Both are only asked once.
2. Choose the chat:
   - Click **Load my chats** and pick one under **Chat**, **or**
   - in Teams, right-click the chat → **Copy link**, paste it under *…or paste a chat link*, and click **Use link**.
3. Click **Send test**. A test message from you should appear in the chat.
4. Tick **Send a message to Teams** and click **Save**.

Use a group chat or a 1:1 chat. Teams' *"chat with yourself"* usually doesn't work.

### Edit the messages
Each event (Log in, Start lunch, End lunch, Leave work, Leave +30 min) has its own panel:
- **One message per line.** Each time you clock, one line is picked at random.
- Your **first name is added in front** automatically: `flitzt nach Hause` becomes *"David flitzt nach Hause"*. To put your name somewhere else, write `{name}` where it should go, e.g. `Tschüss von {name}!`
- `{time}` inserts the current time, e.g. `hat um {time} ausgestempelt`.
- You can paste an array from an old Power Automate flow, e.g. `createArray('…', '…')[rand(0,9)]`. It's split into lines automatically.
- **🎲 Preview** shows a random example, and **Reset to defaults** restores the built-in messages.
- Leave a panel **empty** if you don't want a message for that event.

Click **Save** when you're done.

---

## Troubleshooting

| Message / problem | What to do |
|---|---|
| *"Already logged in today at …"* / *"Already left today at …"* | That time is already in Excel. Correct it there if it's wrong, then press ⟳. |
| *"Not logged in today yet"* | Click **Log in** first. |
| *"Microsoft sign-in expired"* | Settings → **Sign in** again. |
| *"No time sheet selected"* | Settings → Excel file → **Connect**, then choose your sheet. |
| Extension is gone | You're using the development version and Firefox was restarted. Load it again, or install the signed `.xpi`. |
| *"Firefox permission to send Teams messages is not granted"* | Settings → **Allow Teams access** again. It was revoked in `about:addons` or never granted. |
| Excel still shows old values after you edited them | If you edited in desktop Excel, wait a moment until it's uploaded, then press ⟳. |
| Time was recorded but *"(Teams failed)"* in History | The time is safe in Excel. Check the Teams settings: **Allow Teams access** and **Send test**. |

Still stuck? Open **History** in the popup and send the error message to David Seeliger.

---

## Privacy

Your sign-in, file link, chat and messages are stored **only in your own Firefox profile**. Nothing is sent anywhere except Microsoft (for Excel and Teams), and nothing is stored in this repository. Details: [PRIVACY.md](PRIVACY.md).

---

## For the admin

<details>
<summary>Releasing a new version (Mozilla signing)</summary>

Raise `version` in `manifest.json`, run `tools\package.ps1`, and upload the zip from `web-ext-artifacts\` on addons.mozilla.org. All texts, reviewer notes and the checklist are in [store/AMO-SUBMISSION.md](store/AMO-SUBMISSION.md).

</details>

<details>
<summary>Entra app registration (one-time, already done for Schulen Unterägeri)</summary>

- App registration **"Time Entry"**, single tenant, platform **Single-page application**.
- Redirect URI: shown in the extension's Settings (it comes from the extension ID in `manifest.json`, so it's the same for everyone).
- Delegated Microsoft Graph permissions:
  - `User.Read`, `Files.ReadWrite.All`, `offline_access`, `openid`, `profile` (sign-in and Excel)
  - `ChatMessage.Send` (in the **ChatMessage** group) and `Chat.ReadBasic` (Teams messages, requested only when a user enables Teams)
- No client secret.

</details>

<details>
<summary>Excel layout the extension expects</summary>

One sheet and one Excel table per person, one row per day:

| A | B | C | D | E | F | G / H / I |
|---|---|---|---|---|---|---|
| Datum (text `dd.mm.yyyy`) | Morgen kommen | Mittagspause gehen | formula | Mittagspause kommen | Abend gehen | formulas |

New rows get the table's formulas (D, G, H, I) copied in. Filled cells are never overwritten.

</details>
