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

function secured(handler) {
  return async (request, context) => {
    const user = getUser(request);
    if (!user) return json(401, { error: 'Sign in to continue.' });
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
function getUser(request) {
  const header = request.headers.get('x-ms-client-principal');
  if (!header) return null;
  const p = JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
  const claims = p.claims || [];
  const claim = t => (claims.find(c => c.typ === t) || {}).val;
  const email = String(p.userDetails || claim('preferred_username') || '').toLowerCase();
  if (!email) return null;
  const admins = String(process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  const name = claim('name') || email.split('@')[0];
  return { email, name, isAdmin: true };
}

const json = (status, body) => ({ status, jsonBody: body });
const bad = msg => json(400, { error: msg });


const clean = (v, max) => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

module.exports = { sql, db, json, bad, secured, clean, isDate };
