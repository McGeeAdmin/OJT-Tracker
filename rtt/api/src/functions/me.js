const { app } = require('@azure/functions');
const { json, secured, PROGRAMS } = require('../shared');

app.http('me', {
  methods: ['GET'], authLevel: 'anonymous', route: 'me',
  handler: secured(async (req, ctx, user) => {
    const { t, ...me } = user;   // table names stay on the server
    return json(200, { ...me, programs: Object.keys(PROGRAMS) });
  })
});