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
  const s = await browser.storage.local.get(['tenantId', 'clientId', 'workbook', 'mode', 'teams']);
  $('redirectUri').value = browser.identity.getRedirectURL();
  $('tenantId').value = s.tenantId || '';
  $('clientId').value = s.clientId || '';
  $('fileLink').value = s.workbook ? s.workbook.link : '';
  if (s.workbook && s.workbook.table) fillTables([{ name: s.workbook.table, sheet: 'Selected' }], s.workbook.table);
  document.querySelector(`input[name="mode"][value="${s.mode || 'normal'}"]`).checked = true;

  const teams = s.teams || {};
  $('teamsEnabled').checked = !!teams.enabled;
  $('webhookUrl').value = teams.webhookUrl || '';
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

$('revealWebhook').addEventListener('click', () => {
  const input = $('webhookUrl');
  input.type = input.type === 'password' ? 'text' : 'password';
  $('revealWebhook').textContent = input.type === 'password' ? 'Show' : 'Hide';
});

$('testTeams').addEventListener('click', () => {
  const status = $('teamsStatus');
  const url = $('webhookUrl').value.trim();
  if (!isAllowedWebhookUrl(url)) return say(status, 'Not a Teams workflow webhook URL.', 'err');
  withPermission(status, async () => {
    const { account } = await browser.storage.local.get('account');
    say(status, 'Sending…');
    const r = await ask({ type: 'testTeams', url, text: `Test from Time Entry${account ? ` (${account.name})` : ''} ✅` });
    say(status, r.ok ? 'Sent. Check the chat.' : r.error, r.ok ? 'ok' : 'err');
  });
});

// --- Save ---

$('save').addEventListener('click', () => {
  const msg = $('msg');
  const webhookUrl = $('webhookUrl').value.trim();
  const enabled = $('teamsEnabled').checked;
  $('webhookUrl').classList.toggle('invalid', !!webhookUrl && !isAllowedWebhookUrl(webhookUrl));
  if (webhookUrl && !isAllowedWebhookUrl(webhookUrl)) return say(msg, 'Webhook URL is not a Teams workflow URL.', 'err');
  if (enabled && !webhookUrl) return say(msg, 'Enter a webhook URL or turn Teams messages off.', 'err');

  const quips = {};
  for (const [action, q] of Object.entries(quipInputs)) quips[action] = parseQuips(q.area.value);
  withPermission(msg, async () => {
    await browser.storage.local.set({
      mode: document.querySelector('input[name="mode"]:checked').value,
      teams: { enabled, webhookUrl, quips },
    });
    say(msg, 'Saved ✓', 'ok');
  });
});

browser.storage.onChanged.addListener((changes) => {
  if (changes.account || changes.workbook) renderStatus();
});

buildQuips();
loadForm().then(renderStatus);
