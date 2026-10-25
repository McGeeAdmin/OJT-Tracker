const { app } = require('@azure/functions');
const { sql, db, json, secured } = require('../shared');

// Counts per trainee per task, for the all-trainees grid (this station's active trainees only)
app.http('progress', {
  methods: ['GET'], authLevel: 'anonymous', route: 'progress',
  handler: secured(async (req, ctx, user) => {
    const r = await (await db()).request().input('st', sql.VarChar(5), user.station).query(`
      SELECT t.EmployeeId AS eid, t.TaskCode AS task, COUNT(*) AS n
      FROM ${user.t.log} t JOIN ${user.t.emp} e ON e.EmployeeId = t.EmployeeId
      WHERE e.Active = 1 AND e.Station = @st
      GROUP BY t.EmployeeId, t.TaskCode`);
    return json(200, r.recordset);
  })
});