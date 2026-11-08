/* henliz.github.io guestbook: a google sheet as the mailbox.

   setup (about five minutes):
   1. make a new google sheet. name the first tab "doodles".
   2. extensions > apps script. delete what's there, paste this whole file, save.
   3. run setup() once (pick it in the function menu, press run, allow access).
      it writes the header row and turns the "approved" column into checkboxes.
   4. deploy > new deployment > type: web app.
        execute as: me
        who has access: anyone
      deploy, then copy the web app url (it ends in /exec).
   5. paste that url into ENDPOINT at the top of js/guestbook.js.

   moderating: new doodles land with "approved" unticked, so nobody else sees
   them. tick the box to let one into everyone's orbit. delete the row to
   remove it for good. */

const SHEET = 'doodles';
const MAX_BYTES = 20000;      // one doodle's strokes, as text
const MAX_PER_MINUTE = 12;    // across everyone, so nobody can flood it
const SHOW = 120;             // newest approved doodles sent back

function setup() {
  const sh = sheet_();
  sh.getRange(1, 1, 1, 5).setValues([['time', 'id', 'name', 'strokes', 'approved']]).setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.getRange('E2:E').insertCheckboxes();
}

function doGet(e) {
  const rows = sheet_().getDataRange().getValues().slice(1);
  const items = rows
    .filter(r => r[4] === true)
    .slice(-SHOW)
    .map(r => {
      let s = [];
      try { s = JSON.parse(r[3]); } catch (err) {}
      return { id: String(r[1]), n: String(r[2] || ''), s: s };
    });
  return json_({ items: items });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return json_({ ok: false, error: 'busy' });
  try {
    const body = (e && e.postData && e.postData.contents) || '';
    if (body.length > MAX_BYTES) return json_({ ok: false, error: 'too big' });

    const cache = CacheService.getScriptCache();
    const n = Number(cache.get('perMinute') || 0);
    if (n >= MAX_PER_MINUTE) return json_({ ok: false, error: 'slow down' });
    cache.put('perMinute', String(n + 1), 60);

    const d = JSON.parse(body);
    const strokes = clean_(d.s);
    if (!strokes.length) return json_({ ok: false, error: 'empty' });
    const id = String(d.id || '').replace(/[^a-z0-9]/gi, '').slice(0, 24) || Utilities.getUuid();
    const name = String(d.n || '').replace(/[<>]/g, '').trim().slice(0, 24);

    const sh = sheet_();
    sh.appendRow([new Date(), id, name, JSON.stringify(strokes), false]);
    sh.getRange(sh.getLastRow(), 5).insertCheckboxes();
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'bad doodle' });
  } finally {
    lock.releaseLock();
  }
}

// only keep what a doodle can actually be: [ink 0-4, size 0-1, x, y, x, y, ...] on a 256 grid
function clean_(s) {
  if (!Array.isArray(s)) return [];
  return s.slice(0, 200).map(st => {
    if (!Array.isArray(st) || st.length < 4) return null;
    const ink = Math.max(0, Math.min(4, st[0] | 0)), size = st[1] ? 1 : 0;
    const pts = st.slice(2, 2 + 3200).map(v => Math.max(0, Math.min(255, v | 0)));
    return pts.length % 2 ? null : [ink, size].concat(pts);
  }).filter(Boolean);
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
