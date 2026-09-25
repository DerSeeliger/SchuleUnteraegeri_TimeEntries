const $ = (id) => document.getElementById(id);
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const quipInputs = {};

function say(el, text, cls = 'muted') {
  el.textContent = text;
  el.className = `result ${cls}`;
}

// Must be called synchronously from a click handler, or Firefox won't show the prompt.
function withPermission(statusEl, fn) {
  browser.permissions.request({ origins: HOST_ORIGINS }).then((granted) => {
    if (!granted) return say(statusEl, 'Firefox needs permission to reach Microsoft.', 'err');
    return fn();
  });
}

function ask(msg) {
  return browser.runtime.sendMessage(msg);
}

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

// One collapsible panel per event: textarea (one message per line), count, preview.
function buildQuips() {
  for (const [action, def] of Object.entries(ACTIONS)) {
    const count = el('span', { className: 'count muted' });
    const area = el('textarea', { rows: 6, spellcheck: false });
    const info = el('div', { className: 'result' });
    const preview = el('button', { type: 'button', textContent: '🎲 Preview' });
    const reset = el('button', { type: 'button', textContent: 'Reset to defaults' });

    const update = () => {
      const n = parseQuips(area.value).length;
      count.textContent = n === 0 ? 'no message' : n === 1 ? '1 message' : `${n} messages, picked at random`;
    };

    area.addEventListener('input', () => {
      // A pasted createArray(...) or JSON array is turned into one message per line.
      if (looksLikeQuipArray(area.value)) {
        const quips = parseQuips(area.value);
        area.value = quips.join('\n');
        say(info, `Converted ${quips.length} messages from the array.`, 'ok');
      }
      update();
    });

    preview.addEventListener('click', async () => {
      const quips = parseQuips(area.value);
      if (!quips.length) return say(info, 'No messages for this event, so nothing is sent.');
      const { account } = await browser.storage.local.get('account');
      const now = new Date().toISOString();
      say(info, `“${renderQuip(pickRandom(quips), account ? account.firstName : 'Name', formatTime(now))}”`);
    });

    reset.addEventListener('click', () => {
      area.value = (DEFAULT_QUIPS[action] || []).join('\n');
      update();
      say(info, 'Defaults restored. Click Save to keep them.');
    });

    $('quips').append(el('details', { className: 'quip' },
      el('summary', {}, el('span', { textContent: def.label }), ' ', count),
      area,
      el('div', { className: 'line' }, preview, reset),
      info,
    ));
    quipInputs[action] = { area, update };
  }
}

async function loadForm() {
  const s = await browser.storage.local.get(['tenantId', 'clientId', 'workbook', 'mode', 'teams', 'teamsConsent']);
  $('redirectUri').value = browser.identity.getRedirectURL();
  $('tenantId').value = s.tenantId || '';
  $('clientId').value = s.clientId || '';
  $('fileLink').value = s.workbook ? s.workbook.link : '';
  if (s.workbook && s.workbook.table) fillTables([{ name: s.workbook.table, sheet: 'Selected' }], s.workbook.table);
  document.querySelector(`input[name="mode"][value="${s.mode || 'normal'}"]`).checked = true;

  const teams = s.teams || {};
  $('teamsEnabled').checked = !!teams.enabled;
  if (teams.chatId) {
    chosenChat = { id: teams.chatId, name: teams.chatName || teams.chatId };
    fillChats([chosenChat], chosenChat.id);
  }
  if (s.teamsConsent) {
    $('allowTeams').textContent = 'Allow again';
    say($('teamsStatus'), 'Teams access allowed.', 'ok');
  }
  const quips = teams.quips || DEFAULT_QUIPS;
  for (const [action, q] of Object.entries(quipInputs)) {
    q.area.value = (quips[action] || []).join('\n');
    q.update();
  }
}

async function renderStatus() {
  const { account, workbook } = await browser.storage.local.get(['account', 'workbook']);
  if (account) say($('accountStatus'), `Signed in as ${account.name} (${account.username})`, 'ok');
  else if (!$('accountStatus').textContent.startsWith('Sign')) say($('accountStatus'), 'Not signed in');
  $('signOut').hidden = !account;
  $('signIn').textContent = account ? 'Sign in again' : 'Sign in';
  if (workbook && !$('fileStatus').textContent) say($('fileStatus'), `Connected: ${workbook.name}`, 'ok');
}

// --- Microsoft account ---

$('copyRedirect').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('redirectUri').value);
  $('copyRedirect').textContent = 'Copied ✓';
  setTimeout(() => { $('copyRedirect').textContent = 'Copy'; }, 1500);
});

$('signIn').addEventListener('click', () => {
  const status = $('accountStatus');
  const tenantId = $('tenantId').value.trim();
  const clientId = $('clientId').value.trim();
  $('tenantId').classList.toggle('invalid', !GUID.test(tenantId));
  $('clientId').classList.toggle('invalid', !GUID.test(clientId));
  if (!GUID.test(tenantId) || !GUID.test(clientId)) return say(status, 'Tenant ID and Client ID must be GUIDs.', 'err');

  withPermission(status, async () => {
    const old = await browser.storage.local.get(['tenantId', 'clientId']);
    if (old.tenantId !== tenantId || old.clientId !== clientId) {
      await browser.storage.local.remove(['tokens', 'account']);
    }
    await browser.storage.local.set({ tenantId, clientId });
    say(status, 'Signing in… (a Microsoft window opens)');
    const r = await ask({ type: 'signIn' });
    if (r.ok) say(status, `Signed in as ${r.name} (${r.username})`, 'ok');
    else say(status, r.error, 'err');
    renderStatus();
  });
});

$('signOut').addEventListener('click', async () => {
  await ask({ type: 'signOut' });
  say($('accountStatus'), 'Signed out');
  renderStatus();
});

// --- Excel file ---

// tables: [{ name, sheet }]
function fillTables(tables, selected) {
  const select = $('tableSelect');
  const options = tables.map((t) => new Option(`${t.sheet} (table ${t.name})`, t.name, false, t.name === selected));
  if (!selected) options.unshift(new Option('Choose your sheet…', '', true, true));
  select.replaceChildren(...options);
  select.disabled = tables.length === 0;
}

$('connectFile').addEventListener('click', () => {
  const status = $('fileStatus');
  const link = $('fileLink').value.trim();
  if (!/^https:\/\//.test(link)) return say(status, 'Paste the file link (https://…).', 'err');
  withPermission(status, async () => {
    say(status, 'Connecting…');
    const r = await ask({ type: 'connectFile', link });
    if (!r.ok) return say(status, r.error, 'err');
    const { workbook, account } = await browser.storage.local.get(['workbook', 'account']);
    let selected = workbook.table;
    // Preselect the sheet named after you, e.g. "DavidStempel".
    if (!selected && account) {
      const mine = r.tables.find((t) => t.sheet.toLowerCase().includes(account.firstName.toLowerCase()));
      if (mine) {
        selected = mine.name;
        await ask({ type: 'selectTable', table: selected });
      }
    }
    fillTables(r.tables, selected);
    if (!r.tables.length) return say(status, `Connected to ${r.name}, but it contains no Excel tables.`, 'err');
    say(status, selected ? `Connected: ${r.name}` : `Connected: ${r.name}. Now choose your sheet.`, 'ok');
  });
});

$('tableSelect').addEventListener('change', async (e) => {
  if (!e.target.value) return;
  const r = await ask({ type: 'selectTable', table: e.target.value });
  say($('fileStatus'), r.ok ? 'Sheet saved ✓' : r.error, r.ok ? 'ok' : 'err');
});

$('testFile').addEventListener('click', () => {
  const status = $('fileStatus');
  withPermission(status, async () => {
    say(status, 'Testing…');
    const r = await ask({ type: 'testFile' });
    if (!r.ok) return say(status, r.error, 'err');
    const today = r.today.found ? `today: ${todaySummary(r.today)}` : 'no row for today yet';
    say(status, `OK: sheet "${r.sheet}", ${r.rows} day(s), ${today}`, 'ok');
  });
});

// --- Teams ---

let chosenChat = null; // { id, name }

// chats: [{ id, name }]
function fillChats(chats, selected) {
  const select = $('chatSelect');
  const options = chats.map((c) => new Option(c.name, c.id, false, c.id === selected));
  if (!selected) options.unshift(new Option('Choose a chat…', '', true, true));
  select.replaceChildren(...options);
  select.disabled = chats.length === 0;
}

// Graph answers 403 when the token lacks the chat permissions.
function teamsError(r) {
  return /403|scope|permission|consent|Forbidden/i.test(r.error)
    ? `${r.error}. Click "Allow Teams access" first. If that fails, the Entra app may be missing ChatMessage.Send / Chat.ReadBasic.`
    : r.error;
}

$('allowTeams').addEventListener('click', () => {
  const status = $('teamsStatus');
  withPermission(status, async () => {
    say(status, 'Signing in with Teams access… (a Microsoft window opens)');
    const r = await ask({ type: 'enableTeams' });
    if (!r.ok) return say(status, r.error, 'err');
    $('allowTeams').textContent = 'Allow again';
    say(status, 'Teams access allowed. Now load your chats or paste a chat link.', 'ok');
  });
});

$('loadChats').addEventListener('click', () => {
  const status = $('teamsStatus');
  withPermission(status, async () => {
    say(status, 'Loading chats…');
    const r = await ask({ type: 'listChats' });
    if (!r.ok) return say(status, teamsError(r), 'err');
    const chats = r.chats;
    if (chosenChat && !chats.some((c) => c.id === chosenChat.id)) chats.unshift(chosenChat);
    fillChats(chats, chosenChat && chosenChat.id);
    say(status, chats.length ? `${chats.length} chats loaded. Pick one, then Save.` : 'No chats found. Paste a chat link instead.', 'ok');
  });
});

$('chatSelect').addEventListener('change', (e) => {
  const option = e.target.selectedOptions[0];
  chosenChat = e.target.value ? { id: e.target.value, name: option.textContent } : null;
});

$('useChatLink').addEventListener('click', () => {
  const id = chatIdFromInput($('chatLink').value);
  $('chatLink').classList.toggle('invalid', !id);
  if (!id) return say($('teamsStatus'), 'No chat ID found in that link. In Teams: right-click the chat → Copy link.', 'err');
  chosenChat = { id, name: 'Chat from link' };
  fillChats([chosenChat], id);
  say($('teamsStatus'), 'Chat set from link. Send a test, then Save.', 'ok');
});

$('testTeams').addEventListener('click', () => {
  const status = $('teamsStatus');
  if (!chosenChat) return say(status, 'Choose a chat first.', 'err');
  withPermission(status, async () => {
    const { account } = await browser.storage.local.get('account');
    say(status, 'Sending…');
    const r = await ask({ type: 'testTeams', chatId: chosenChat.id, text: `Test from Time Entry${account ? ` (${account.name})` : ''} ✅` });
    say(status, r.ok ? 'Sent. Check the chat.' : teamsError(r), r.ok ? 'ok' : 'err');
  });
});

// --- Save ---

$('save').addEventListener('click', () => {
  const msg = $('msg');
  const enabled = $('teamsEnabled').checked;
  if (enabled && !chosenChat) return say(msg, 'Choose a Teams chat or turn Teams messages off.', 'err');

  const quips = {};
  for (const [action, q] of Object.entries(quipInputs)) quips[action] = parseQuips(q.area.value);
  withPermission(msg, async () => {
    await browser.storage.local.set({
      mode: document.querySelector('input[name="mode"]:checked').value,
      teams: { enabled, chatId: chosenChat && chosenChat.id, chatName: chosenChat && chosenChat.name, quips },
    });
    say(msg, 'Saved ✓', 'ok');
  });
});

browser.storage.onChanged.addListener((changes) => {
  if (changes.account || changes.workbook) renderStatus();
});

buildQuips();
loadForm().then(renderStatus);
