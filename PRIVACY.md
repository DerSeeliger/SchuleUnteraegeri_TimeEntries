# Privacy Policy – Time Entry

*Last updated: 25 September 2026*

Time Entry is a Firefox extension that records your working times in an Excel time sheet and can optionally post a message to a Microsoft Teams chat. This policy explains which data the extension handles and where it goes.

## Summary

- The extension has **no server of its own** and contains **no analytics or tracking**.
- Data is only sent to **Microsoft** (sign-in, Excel, Teams), and only when you use a feature that needs it.
- Everything else stays **in your Firefox profile** on your computer.

## Data sent to Microsoft

| Data | When | Sent to | Why |
|---|---|---|---|
| Sign-in data (authorization code, access and refresh tokens) | When you sign in and when the sign-in is renewed | Microsoft Entra ID (`login.microsoftonline.com`) | To sign in to your Microsoft account |
| Your working times (date, arrival, lunch start and end, leaving time) | When you click a clock button | Microsoft Graph (`graph.microsoft.com`), into the Excel file you connected | Core function: recording your times |
| Requests to read your profile name, the Excel file, its tables and today's row | When you sign in, connect a file, test, sync, or clock | Microsoft Graph | To show who is signed in and to find the right cell |
| Teams chat message text (optional) | Only if you turned on Teams messages, when you clock | Microsoft Graph, into the Teams chat you chose | Optional feature: posting a message to your chat |
| List of your Teams chats (optional) | Only when you click "Load my chats" | Microsoft Graph | To let you choose a chat |

The extension acts **as you**, with Microsoft's *delegated* permissions. It cannot access anything you couldn't access yourself. Microsoft's handling of this data is covered by your organization's Microsoft 365 agreement and the [Microsoft Privacy Statement](https://privacy.microsoft.com/privacystatement).

Firefox asks for your consent before installation for sign-in data. Teams messages are an **optional** data permission: Firefox asks separately when you turn them on, and you can revoke it at any time in `about:addons` → Time Entry → Permissions.

## Data stored locally

The following is stored only in your Firefox profile (`browser.storage.local`) and never sent anywhere else:

- Tenant ID and client ID of the Entra app
- Sign-in tokens
- Your name and e-mail address as returned by Microsoft (shown in the popup)
- The link and internal IDs of your Excel file and the selected sheet
- Your mode (Normal / Azubi), your last action, today's times, and a history of your last 50 clicks
- Teams settings: the chosen chat and your message texts

To delete all of it, click **Sign out** in the settings and remove the extension.

## Data not collected

The extension does **not** read your browsing history, web pages or other tabs. It does not use cookies, analytics or advertising, and it does not share or sell any data.

## Contact

Questions about this policy: open an issue at <https://github.com/DerSeeliger/SchuleUnteraegeri_TimeEntries/issues>.
