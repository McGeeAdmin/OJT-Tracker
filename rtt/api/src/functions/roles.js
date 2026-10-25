const { app } = require('@azure/functions');

const ROLE_CLAIMS = ['roles', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
const NOT_STATIONS = new Set(['ADMIN']);
const isCode = s => /^[A-Z0-9]{2,5}$/.test(s) && !NOT_STATIONS.has(s);

app.http('GetRoles', {
  methods: ['POST'], authLevel: 'anonymous', route: 'GetRoles',
  handler: async (req, ctx) => {
    const b = await req.json().catch(() => ({}));
    const claims = Array.isArray(b.claims) ? b.claims : [];
    const appRoles = claims.filter(c => ROLE_CLAIMS.includes(c.typ)).map(c => String(c.val).trim().toUpperCase());
    const isAdmin = appRoles.includes('ADMIN');
    const stations = new Set(appRoles.filter(isCode));
    if (isAdmin) String(process.env.STATIONS || '').split(',').map(s => s.trim().toUpperCase()).filter(isCode).forEach(s => stations.add(s));
    const roles = [...stations].sort().map(s => 'station_' + s.toLowerCase());
    if (isAdmin) roles.push('admin');
    if (isAdmin && !process.env.STATIONS) ctx.warn('GetRoles: ADMIN signed in but the STATIONS setting is empty, so they only get their own station roles.');
    ctx.log(`GetRoles: ${b.userDetails || 'unknown user'} -> ${roles.join(', ') || 'no station'} (Entra roles: ${appRoles.join(', ') || 'none'})`);
    return { status: 200, jsonBody: { roles } };
  }
});