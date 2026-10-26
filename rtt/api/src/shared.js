const sql = require('mssql');

// Signs in to Azure SQL with Microsoft Entra ID, no password.
// In Azure it uses the Function App's managed identity; on a developer's computer it uses their `az login`.
const dbConfig = {
  server: process.env.SQL_SERVER,          // e.g. mcg-sql-01.database.windows.net
  database: process.env.SQL_DATABASE,      // e.g. onboarding
  authentication: { type: 'azure-active-directory-default', options: {} },
  options: { encrypt: true },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

// Each training program has its own tables. Names are fixed here (never taken from the request), so they're safe to put in SQL.
const PROGRAMS = {
  OJT: { emp: 'dbo.ojt_employees', log: 'dbo.ojt_tasklog' },
  LIT: { emp: 'dbo.lit_employees', log: 'dbo.lit_tasklog' }
};

let poolPromise = null;
const WAKE_WINDOW_MS = 40000;   // stay under Static Web Apps' ~45 s request limit

async function db() {
  const start = Date.now();
  for (let attempt = 1; ; attempt++) {
    try {
      if (!poolPromise) poolPromise = new sql.ConnectionPool(dbConfig).connect();
      return await poolPromise;
    } catch (err) {
      poolPromise = null;
      const wait = Math.min(2000 * attempt, 8000);           // 2 s, 4 s, 6 s, 8 s, 8 s…
      if (Date.now() - start + wait > WAKE_WINDOW_MS) {
        err.dbUnavailable = true;                             // lets secured() send a "try again" reply
        throw err;
      }
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

// Every request runs for exactly one station (user.station) and one program (user.program). The page sends the station it is showing
// in the X-Station header; the server only accepts a station the user's Entra groups give them.
function secured(handler) {
  return async (request, context) => {
    const user = getUser(request);
    if (!user) return json(401, { error: 'Sign in to continue.' });
    if (!user.stations.length)
      return json(403, { error: 'Your account isn’t in a station trainer group yet, so there’s nothing to show. Ask your supervisor or IT to add you to your station’s group, then sign out and back in.', noStation: true });
    const asked = String(request.headers.get('x-station') || '').trim().toUpperCase();
    if (asked && !user.stations.includes(asked))
      return json(403, { error: `You don’t have access to ${asked}. Sign out and back in if your station just changed.`, badStation: true });
    user.station = asked || user.stations[0];
    // The page also sends which program it is showing (OJT or LIT) in X-Program.
    const program = String(request.headers.get('x-program') || 'OJT').trim().toUpperCase();
    if (!PROGRAMS[program]) return json(400, { error: `There is no ${program} tracker. Reload the page.` });
    user.program = program;
    user.t = PROGRAMS[program];
    try {
      return await handler(request, context, user);
    } catch (err) {
      context.error(err);
      if (err.dbUnavailable) return json(503, { error: 'The database didn’t respond. It may still be starting up. Try again in a minute, and tell your supervisor if it keeps happening.', retry: true });
      return json(500, { error: 'The server could not complete that request. Try again, and tell your supervisor if it keeps happening.' });
    }
  };
}

// Static Web Apps passes the signed-in user in this header (base64 JSON).
// Station access comes from userRoles, which GetRoles (roles.js) fills in at sign-in from the user's Entra groups.
function getUser(request) {
  const header = request.headers.get('x-ms-client-principal');
  if (!header) return null;
  const p = JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
  const claims = p.claims || [];
  const claim = t => (claims.find(c => c.typ === t) || {}).val;
  const email = String(p.userDetails || claim('preferred_username') || '').toLowerCase();
  if (!email) return null;
  const name = claim('name') || email.split('@')[0];
  const stations = [...new Set((p.userRoles || [])
    .map(r => /^station_([a-z0-9]{2,5})$/i.exec(String(r)))
    .filter(Boolean).map(m => m[1].toUpperCase()))].sort();
  // Anyone signed in can edit, but only inside the stations they belong to.
  return { email, name, isAdmin: true, stations };
}

const json = (status, body) => ({ status, jsonBody: body });
const bad = msg => json(400, { error: msg });

const clean = (v, max) => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

module.exports = { sql, db, json, bad, secured, clean, isDate, PROGRAMS };