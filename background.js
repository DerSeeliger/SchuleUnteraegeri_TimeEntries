// Event page: talks to Microsoft so requests survive the popup closing.

const HISTORY_MAX = 50;
let badgeTimer;

browser.runtime.onMessage.addListener((msg) => {
  switch (msg && msg.type) {
    case 'send':        return sendAction(msg.action);
    case 'signIn':      return reply(signIn(true));
    case 'signOut':     return reply(signOut());
    case 'connectFile': return reply(connectFile(msg.link));
    case 'listTables':  return reply(listTables());
    case 'selectTable': return reply(selectTable(msg.table));
    case 'testFile':    return reply(readToday());
    case 'sync':        return syncNow();
    case 'enableTeams': return reply(enableTeams());
    case 'listChats':   return reply(listChats());
    case 'testTeams':   return reply(postChatMessage(msg.chatId, msg.text));
  }
});

function reply(promise) {
  return promise.then(
    (result) => ({ ok: true, ...result }),
    (e) => ({ ok: false, error: e.message, needsSignIn: e.name === 'NeedsSignIn' }),
  );
}

async function connectFile(link) {
  const workbook = await resolveWorkbook(link);
  const { workbook: old } = await browser.storage.local.get('workbook');
  // Keep the chosen sheet when reconnecting the same file.
  const table = old && old.itemId === workbook.itemId ? old.table : undefined;
  await browser.storage.local.set({ workbook: { ...workbook, link, table } });
  return { name: workbook.name, ...(await listTables()) };
}

async function selectTable(table) {
  const { workbook } = await browser.storage.local.get('workbook');
  if (!workbook) throw new Error('No Excel file connected');
  await browser.storage.local.set({ workbook: { ...workbook, table } });
  return {};
}

async function sendAction(action) {
  const now = new Date();
  const entry = { action, time: now.toISOString() };

  try {
    const { account } = await browser.storage.local.get('account');
    if (!account) throw new NeedsSignIn('Not signed in');
    await recordAction(action, now);
  } catch (e) {
    return finish(entry, { ok: false, error: e.message, needsSignIn: e.name === 'NeedsSignIn' });
  }
  await syncToday().catch(() => {});

  // The time is logged; Teams is best effort.
  let teams = null;
  try {
    if (await postQuip(action, now)) teams = 'sent';
  } catch (e) {
    teams = `failed: ${e.message}`;
  }
  return finish(entry, { ok: true, teams });
}

// The last filled step of today's row, so the popup's suggestion matches Excel.
function lastFromToday(today) {
  const steps = [['leave', 'leave'], ['lunchEnd', 'lunch_end'], ['lunchStart', 'lunch_start'], ['login', 'login']];
  for (const [key, action] of steps) {
    if (!today[key]) continue;
    const [h, m] = today[key].split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return { action, time: d.toISOString() };
  }
  return null;
}

// Re-reads today's row from Excel, e.g. after cells were edited or deleted by hand.
async function syncToday() {
  const { today } = await readToday();
  await browser.storage.local.set({ today, lastAction: lastFromToday(today) });
}

async function syncNow() {
  const entry = { action: 'sync', time: new Date().toISOString() };
  try {
    await syncToday();
  } catch (e) {
    return finish(entry, { ok: false, error: e.message, needsSignIn: e.name === 'NeedsSignIn' });
  }
  return finish(entry, { ok: true });
}

async function finish(entry, result) {
  const record = { ...entry, ...result };
  const { history = [] } = await browser.storage.local.get('history');
  history.unshift(record);

  const update = { history: history.slice(0, HISTORY_MAX) };
  if (record.ok && record.action !== 'sync') update.lastAction = { action: record.action, time: record.time };
  await browser.storage.local.set(update);

  setBadge(record.ok);
  return record;
}

function setBadge(ok) {
  clearTimeout(badgeTimer);
  browser.action.setBadgeBackgroundColor({ color: ok ? '#2e7d32' : '#c62828' });
  browser.action.setBadgeText({ text: ok ? '✓' : '!' });
  // Errors stay visible until the next success.
  if (ok) badgeTimer = setTimeout(() => browser.action.setBadgeText({ text: '' }), 4000);
}
