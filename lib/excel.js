// Works with the existing time sheets: one table per person, one row per day.
//   A Datum (text "dd.mm.yyyy") | B Morgen kommen | C Mittagspause gehen | D formula
//   E Mittagspause kommen | F Abend gehen | G, H, I formulas
// Days without a lunch break are recorded as C = E = F, like the old flows did.

const COL = { date: 0, login: 1, lunchStart: 2, lunchEnd: 4, leave: 5 };
const AZUBI_LUNCH = { start: [12, 15], end: [12, 45] };

function sheetPath(wb, name) {
  return `${wb}/worksheets('${encodeURIComponent(name.replace(/'/g, "''"))}')`;
}

function tablePath(wb, name) {
  return `${wb}/tables('${encodeURIComponent(name)}')`;
}

function shareId(link) {
  const b64 = btoa(unescape(encodeURIComponent(link)));
  return 'u!' + b64.replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-');
}

async function resolveWorkbook(link) {
  const item = await graph(`/shares/${shareId(link)}/driveItem?$select=id,name,parentReference`);
  if (!/\.xlsx$/i.test(item.name)) throw new Error(`"${item.name}" is not an .xlsx file`);
  return { driveId: item.parentReference.driveId, itemId: item.id, name: item.name };
}

async function target() {
  const { workbook } = await browser.storage.local.get('workbook');
  if (!workbook) throw new Error('No Excel file connected');
  if (!workbook.table) throw new Error('No time sheet selected in settings');
  return { wb: `/drives/${workbook.driveId}/items/${workbook.itemId}/workbook`, table: workbook.table };
}

async function listTables() {
  const { workbook } = await browser.storage.local.get('workbook');
  if (!workbook) throw new Error('No Excel file connected');
  const wb = `/drives/${workbook.driveId}/items/${workbook.itemId}/workbook`;
  const { value } = await graph(`${wb}/tables?$select=id,name`);
  const tables = [];
  for (const t of value) {
    const ws = await graph(`${tablePath(wb, t.id)}/worksheet?$select=name`);
    tables.push({ name: t.name, sheet: ws.name });
  }
  return { tables };
}

// --- Date / time helpers ---

const pad = (n) => String(n).padStart(2, '0');

function dateText(d) {
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

// Days since 1899-12-30 (1900 date system).
function excelDate(d) {
  return (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86400000;
}

function excelTime(h, m) {
  return (h * 60 + m) / 1440;
}

function timeText(value) {
  if (typeof value !== 'number') return String(value);
  const minutes = Math.round((value % 1) * 1440);
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

// Recent rows hold the date as text; older ones as a serial number. This file uses the
// 1904 date system, which is 1462 days behind the 1900 one, so accept both.
function isSameDay(cell, d) {
  if (typeof cell === 'string') return cell.trim() === dateText(d);
  if (typeof cell === 'number') {
    const serial = excelDate(d);
    return cell === serial || cell === serial - 1462;
  }
  return false;
}

function columnLetter(index) {
  return String.fromCharCode(65 + index);
}

// "DavidStempel!A3:I6" or "'Jonas Stempel'!A3:I6" -> { sheet, firstRow }
function parseAddress(address) {
  const i = address.lastIndexOf('!');
  const sheet = address.slice(0, i).replace(/^'(.*)'$/, '$1').replace(/''/g, "'");
  return { sheet, firstRow: Number(address.slice(i + 1).match(/\d+/)[0]) };
}

// Moves relative row references down by `delta` rows (absolute $-rows stay put).
function shiftFormula(formula, delta) {
  return formula.replace(
    /(^|[^A-Za-z0-9_$.])(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\d(A-Za-z_])/g,
    (m, pre, colAbs, col, rowAbs, row) => pre + colAbs + col + rowAbs + (rowAbs ? row : String(Number(row) + delta)),
  );
}

// --- Table access ---

async function readTable() {
  const { wb, table } = await target();
  const range = await graph(`${tablePath(wb, table)}/dataBodyRange?$select=address,values,formulas`);
  return { wb, table, ...parseAddress(range.address), values: range.values, formulas: range.formulas };
}

function findToday(t, now) {
  for (let i = t.values.length - 1; i >= 0; i--) {
    if (isSameDay(t.values[i][COL.date], now)) return i;
  }
  return -1;
}

async function writeCell(t, rowIndex, col, value) {
  const cell = `${sheetPath(t.wb, t.sheet)}/range(address='${columnLetter(col)}${t.firstRow + rowIndex}')`;
  await graph(cell, { method: 'PATCH', body: { values: [[value]] } });
}

// Same as the old flows: the date is stored as text so it is never reinterpreted.
async function writeDate(t, rowIndex, now) {
  const cell = `${sheetPath(t.wb, t.sheet)}/range(address='${columnLetter(COL.date)}${t.firstRow + rowIndex}')`;
  await graph(cell, { method: 'PATCH', body: { numberFormat: [['@']] } });
  await graph(cell, { method: 'PATCH', body: { values: [[dateText(now)]] } });
}

async function addDayRow(t, now, loginTime) {
  const last = t.values.length - 1;
  const lastRow = t.values[last];
  const isBlank = (row) => [COL.date, COL.login, COL.lunchStart, COL.lunchEnd, COL.leave].every((c) => row[c] === '');

  let index;
  if (lastRow && isBlank(lastRow)) {
    // A table with no days yet still has one empty row; use it.
    index = last;
    await writeCell(t, index, COL.login, loginTime);
  } else {
    // Keep the calculated columns intact by passing their formulas, shifted to the new row.
    const values = t.formulas[last].map((f) => (typeof f === 'string' && f.startsWith('=') ? shiftFormula(f, 1) : ''));
    values[COL.date] = '';
    values[COL.login] = loginTime;
    const added = await graph(`${tablePath(t.wb, t.table)}/rows/add`, { method: 'POST', body: { index: null, values: [values] } });
    index = added.index;
  }
  await writeDate(t, index, now);
}

// Writes the given action into today's row. Never overwrites a filled cell.
async function recordAction(action, now) {
  const t = await readTable();
  const time = excelTime(now.getHours(), now.getMinutes());
  const i = findToday(t, now);
  const row = i >= 0 ? t.values[i] : null;
  const has = (col) => row[col] !== '' && row[col] != null;
  const need = (ok, message) => { if (!ok) throw new Error(message); };

  if (action === 'login') {
    need(!row || !has(COL.login), `Already logged in today at ${row && timeText(row[COL.login])}`);
    if (row) return writeCell(t, i, COL.login, time);
    return addDayRow(t, now, time);
  }

  need(row && has(COL.login), 'Not logged in today yet. Click "Log in" first.');

  if (action === 'lunch_start') {
    need(!has(COL.lunchStart), `Lunch already started at ${timeText(row[COL.lunchStart])}`);
    return writeCell(t, i, COL.lunchStart, time);
  }

  if (action === 'lunch_end') {
    need(has(COL.lunchStart), 'Lunch was not started today.');
    need(!has(COL.lunchEnd), `Lunch already ended at ${timeText(row[COL.lunchEnd])}`);
    return writeCell(t, i, COL.lunchEnd, time);
  }

  need(!has(COL.leave), `Already left today at ${timeText(row[COL.leave])}`);

  if (action === 'lunch30_leave') {
    // Fixed Azubi lunch, always 12:15–12:45; only fills lunch cells that are still empty.
    if (!has(COL.lunchStart)) await writeCell(t, i, COL.lunchStart, excelTime(...AZUBI_LUNCH.start));
    if (!has(COL.lunchEnd)) await writeCell(t, i, COL.lunchEnd, excelTime(...AZUBI_LUNCH.end));
    return writeCell(t, i, COL.leave, time);
  }

  // Plain leave: fill a missing lunch with "now" so the day's formulas still add up.
  if (!has(COL.lunchStart)) await writeCell(t, i, COL.lunchStart, time);
  if (!has(COL.lunchEnd)) await writeCell(t, i, COL.lunchEnd, time);
  return writeCell(t, i, COL.leave, time);
}

// Today's row as the Excel file currently has it: { date, login, lunchStart, lunchEnd, leave } (HH:MM or null).
async function readToday() {
  const t = await readTable();
  const now = new Date();
  const i = findToday(t, now);
  const row = i >= 0 ? t.values[i] : null;
  const get = (col) => (row && typeof row[col] === 'number' ? timeText(row[col]) : null);
  return {
    sheet: t.sheet,
    rows: t.values.length,
    today: {
      date: now.toISOString(),
      found: !!row,
      login: get(COL.login),
      lunchStart: get(COL.lunchStart),
      lunchEnd: get(COL.lunchEnd),
      leave: get(COL.leave),
    },
  };
}
