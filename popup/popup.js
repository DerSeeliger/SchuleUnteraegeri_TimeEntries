const $ = (id) => document.getElementById(id);

const DEFAULT_STATE = { mode: 'normal', account: null, workbook: null, lastAction: null, today: null, history: [] };
let state = { ...DEFAULT_STATE };
let showAll = false;
let pending = null; // action currently being sent, or 'sync'
let armed = null;   // action waiting for a confirming second click

function labelOf(action) {
  if (action === 'sync') return 'Sync';
  return ACTIONS[action] ? ACTIONS[action].label : action;
}

async function load() {
  const stored = await browser.storage.local.get(Object.keys(DEFAULT_STATE));
  state = { ...DEFAULT_STATE, ...stored };
  render();
}

function todaysLast() {
  const last = state.lastAction;
  return last && isToday(last.time) ? last.action : null;
}

function warningFor(action) {
  const last = todaysLast();
  if ((action === 'leave' || action === 'lunch30_leave') && last === 'lunch_start') {
    return 'Lunch still open. Click again to leave anyway';
  }
  return null;
}

function setupMessage() {
  if (!state.account) return 'Not signed in to Microsoft.';
  if (!state.workbook) return 'No Excel file connected.';
  if (!state.workbook.table) return 'No time sheet selected.';
  const latest = state.history[0];
  if (latest && !latest.ok && latest.needsSignIn) return 'Your Microsoft sign-in expired. Sign in again in settings.';
  return null;
}

function render() {
  $('user').textContent = state.account ? state.account.name : 'Time Entry';

  const setup = setupMessage();
  $('setup').hidden = !setup;
  $('setup-text').textContent = setup || '';

  const ready = !!(state.account && state.workbook && state.workbook.table);
  const modeList = MODE_ACTIONS[state.mode] || MODE_ACTIONS.normal;
  const visible = !ready ? [] : showAll ? Object.keys(ACTIONS) : modeList;
  $('show-all').hidden = !ready;
  $('show-all').textContent = showAll ? 'Show less' : 'Show all';
  $('sync').hidden = !ready;
  $('sync').disabled = pending !== null;
  $('sync').classList.toggle('spinning', pending === 'sync');

  const next = nextAction(state.mode, state.lastAction);
  $('buttons').replaceChildren(...visible.map((a) => {
    const b = document.createElement('button');
    b.className = 'action';
    if (armed === a) {
      b.classList.add('warn');
      b.textContent = warningFor(a);
    } else {
      if (a === next) b.classList.add('next');
      b.textContent = pending === a ? `${ACTIONS[a].label}…` : ACTIONS[a].label;
    }
    if (ACTIONS[a].hint) b.title = ACTIONS[a].hint;
    b.disabled = pending !== null;
    b.addEventListener('click', () => onAction(a));
    return b;
  }));

  renderStatus();
  renderHistory();
}

function renderStatus() {
  const el = $('status');
  const latest = state.history[0];
  const last = state.lastAction;
  el.className = 'muted';

  if (pending) {
    el.textContent = pending === 'sync' ? 'Reading Excel…' : `Sending ${labelOf(pending)}…`;
  } else if (latest && !latest.ok) {
    el.className = 'err';
    el.textContent = `✗ ${labelOf(latest.action)} failed (${formatTime(latest.time)}): ${latest.error}`;
  } else if (state.today && isToday(state.today.date)) {
    el.textContent = `Today in Excel: ${todaySummary(state.today)}`;
  } else if (last && isToday(last.time)) {
    el.textContent = `Last: ${ACTIONS[last.action].label} ${formatTime(last.time)} ✓`;
  } else {
    el.textContent = 'Nothing logged today';
  }
}

function renderHistory() {
  $('history-box').hidden = state.history.length === 0;
  $('history').replaceChildren(...state.history.map((h) => {
    const li = document.createElement('li');
    const label = labelOf(h.action);
    const mark = document.createElement('span');
    const teamsFailed = h.teams && h.teams.startsWith('failed');
    mark.className = h.ok && !teamsFailed ? 'ok' : 'err';
    mark.textContent = !h.ok ? ` ✗ ${h.error || ''}` : teamsFailed ? ' ✓ (Teams failed)' : ' ✓';
    if (teamsFailed) li.title = h.teams;
    li.append(`${formatTime(h.time)}  ${label}`, mark);
    return li;
  }));
}

async function onAction(action) {
  if (warningFor(action) && armed !== action) {
    armed = action;
    render();
    return;
  }
  armed = null;
  pending = action;
  render();
  try {
    await browser.runtime.sendMessage({ type: 'send', action });
  } finally {
    pending = null;
    await load();
  }
}

async function onSync() {
  armed = null;
  pending = 'sync';
  render();
  try {
    await browser.runtime.sendMessage({ type: 'sync' });
  } finally {
    pending = null;
    await load();
  }
}

$('sync').addEventListener('click', onSync);
$('settings').addEventListener('click', () => browser.runtime.openOptionsPage());
$('open-options').addEventListener('click', () => browser.runtime.openOptionsPage());
$('show-all').addEventListener('click', () => { showAll = !showAll; render(); });
browser.storage.onChanged.addListener(load);

load();
