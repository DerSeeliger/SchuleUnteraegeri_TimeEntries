// Shared between background, popup and options pages.

const ACTIONS = {
  login:         { label: 'Log in' },
  lunch_start:   { label: 'Start lunch' },
  lunch_end:     { label: 'End lunch' },
  leave:         { label: 'Leave work' },
  lunch30_leave: { label: 'Leave (+30 min lunch)', hint: 'Enters lunch 12:15–12:45 and leaves now' },
};

const MODE_ACTIONS = {
  normal: ['login', 'lunch_start', 'lunch_end', 'leave'],
  azubi:  ['login', 'lunch30_leave'],
};


const DEFAULT_QUIPS = {
  login:         ['ist da', 'hat um {time} eingestempelt.'],
  lunch_start:   ['ist in der Mittagspause'],
  lunch_end:     ['ist satt und wieder da.'],
  leave:         ['ist weg', 'hat um {time} ausgestempelt.'],
  lunch30_leave: ['hat genug und geht nach Hause'],
};

// Accepts one quip per line, a JSON array, or a pasted Power Automate expression
// like createArray('a', 'b')[rand(0,2)].
function parseQuips(text) {
  const trimmed = text.trim();
  if (/^createArray\s*\(/i.test(trimmed)) {
    return [...trimmed.matchAll(/'((?:[^']|'')*)'/g)]
      .map((m) => m[1].replace(/''/g, "'").trim())
      .filter(Boolean);
  }
  if (trimmed.startsWith('[')) {
    try {
      const list = JSON.parse(trimmed);
      if (Array.isArray(list)) return list.map((q) => String(q).trim()).filter(Boolean);
    } catch { /* not JSON, treat as lines */ }
  }
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
}

function looksLikeQuipArray(text) {
  return /^\s*(createArray\s*\(|\[)/i.test(text);
}

function renderQuip(quip, firstName, time) {
  const text = quip.includes('{name}') ? quip : `{name} ${quip}`;
  return text.replaceAll('{name}', firstName).replaceAll('{time}', time).trim();
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

const HOST_ORIGINS = [
  'https://login.microsoftonline.com/*',
  'https://graph.microsoft.com/*',
  'https://*.logic.azure.com/*',
  'https://*.environment.api.powerplatform.com/*',
];
const WEBHOOK_HOST_SUFFIXES = ['.logic.azure.com', '.environment.api.powerplatform.com'];

function isAllowedWebhookUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && WEBHOOK_HOST_SUFFIXES.some((s) => u.hostname.endsWith(s));
  } catch {
    return false;
  }
}

function isToday(iso) {
  return !!iso && new Date(iso).toDateString() === new Date().toDateString();
}

function formatTime(iso) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday(iso)) return time;
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' }) + ' ' + time;
}

// Short text for today's row, e.g. "in 07:57 · lunch 12:15–12:45 · out 16:05".
function todaySummary(today) {
  const parts = [];
  if (today.login) parts.push(`in ${today.login}`);
  // A day without lunch is stored as lunch start = lunch end = leave; don't show it as a lunch.
  const noLunch = today.lunchStart && today.lunchStart === today.lunchEnd;
  if (today.lunchStart && !noLunch) parts.push(`lunch ${today.lunchStart}–${today.lunchEnd || '…'}`);
  if (today.leave) parts.push(`out ${today.leave}`);
  return parts.join(' · ') || 'nothing recorded yet';
}

// Suggested next step for the day; null once the day is finished.
function nextAction(mode, last) {
  if (!last || !isToday(last.time)) return 'login';
  const seq = {
    login: mode === 'azubi' ? 'lunch30_leave' : 'lunch_start',
    lunch_start: 'lunch_end',
    lunch_end: 'leave',
  };
  return seq[last.action] || null;
}
