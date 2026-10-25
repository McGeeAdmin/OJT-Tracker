const { app } = require('@azure/functions');

// Static Web Apps calls this once at each sign-in (see "rolesSource" in staticwebapp.config.json).
// It turns the app roles the user has in Entra (SEA, PDX, ANC…) into Static Web Apps roles
// (station_sea, station_pdx…). Roles are created under App registrations → App roles, and given to
// groups under Enterprise applications → Users and groups. Nothing to configure here.
const ROLE_CLAIMS = ['roles', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

app.http('GetRoles', {
  methods: ['POST'], authLevel: 'anonymous', route: 'GetRoles',
  handler: async (req, ctx) => {
    const b = await req.json().catch(() => ({}));
    const claims = Array.isArray(b.claims) ? b.claims : [];
    const appRoles = claims.filter(c => ROLE_CLAIMS.includes(c.typ)).map(c => String(c.val).trim().toUpperCase());
    const stations = [...new Set(appRoles.filter(r => /^[A-Z0-9]{2,5}$/.test(r)))];
    const roles = stations.map(s => 'station_' + s.toLowerCase());
    ctx.log(`GetRoles: ${b.userDetails || 'unknown user'} -> ${roles.join(', ') || 'no station'} (Entra roles: ${appRoles.join(', ') || 'none'})`);
    return { status: 200, jsonBody: { roles } };
  }
});