const { app } = require('@azure/functions');
const { sql, db, json, bad, secured, clean } = require('../shared');

// GET list, POST add a new trainee. Everything is limited to the user's current station.
app.http('employees', {
  methods: ['GET', 'POST'], authLevel: 'anonymous', route: 'employees',
  handler: secured(async (req, ctx, user) => {
    const pool = await db();
    if (req.method === 'GET') {
      const all = req.query.get('all') === '1' && user.isAdmin;
      const finished = req.query.get('finished') === '1';
      const r = await pool.request().input('st', sql.VarChar(5), user.station).query(`
        SELECT e.EmployeeId AS id, e.FirstName AS first, e.LastName AS last, e.Active AS active,
               COUNT(t.Id) AS total, CONVERT(char(10), MAX(t.LogDate), 23) AS lastDate,
               (SELECT STRING_AGG(x.TrainerEmail, ',') FROM (SELECT DISTINCT TrainerEmail FROM dbo.ojt_tasklog WHERE EmployeeId = e.EmployeeId) x) AS trainerEmails,
               (SELECT STRING_AGG(x.TrainerName, ', ') FROM (SELECT DISTINCT TrainerName FROM dbo.ojt_tasklog WHERE EmployeeId = e.EmployeeId) x) AS trainerNames
        FROM dbo.ojt_employees e LEFT JOIN dbo.ojt_tasklog t ON t.EmployeeId = e.EmployeeId
        WHERE e.Station = @st ${finished ? 'AND e.Active = 0' : all ? '' : 'AND e.Active = 1'}
        GROUP BY e.EmployeeId, e.FirstName, e.LastName, e.Active
        ORDER BY e.LastName, e.FirstName`);
      return json(200, r.recordset.map(e => ({ ...e, trainerEmails: (e.trainerEmails || '').toLowerCase().split(',').filter(Boolean), trainerNames: e.trainerNames || '' })));
    }
    const b = await req.json().catch(() => ({}));
    const id = clean(b.id, 20), first = clean(b.first, 60), last = clean(b.last, 60);
    if (!first || !last) return bad('Enter a first and last name.');
    if (!id || !/^\d{4,20}$/.test(id)) return bad('Employee ID must be numbers only, at least 4 digits.');
    const exists = await pool.request().input('id', sql.VarChar(20), id)
      .query('SELECT FirstName, LastName, Station FROM dbo.ojt_employees WHERE EmployeeId = @id');
    if (exists.recordset.length) {
      const e = exists.recordset[0];
      if (e.Station !== user.station)
        return json(409, { error: `ID ${id} is already on the list at ${e.Station}. Ask IT to move them to ${user.station} if they transferred.` });
      return json(409, { error: `ID ${id} already belongs to ${e.FirstName} ${e.LastName}.` });
    }
    await pool.request()
      .input('id', sql.VarChar(20), id).input('f', sql.NVarChar(60), first)
      .input('l', sql.NVarChar(60), last).input('by', sql.NVarChar(200), user.email)
      .input('st', sql.VarChar(5), user.station)
      .query('INSERT INTO dbo.ojt_employees (EmployeeId, FirstName, LastName, Station, CreatedBy) VALUES (@id, @f, @l, @st, @by)');
    return json(201, { id, first, last, active: true, total: 0, lastDate: null, trainerEmails: [], trainerNames: '' });
  })
});

// PUT edit a trainee: name, employee ID, and/or Active (in training vs. completed).
// Fields left out of the body stay as they are. Changing the ID moves all of their logged tasks to the new ID.
app.http('employeeEdit', {
  methods: ['PUT'], authLevel: 'anonymous', route: 'employees/{id}',
  handler: secured(async (req, ctx, user) => {
    if (!user.isAdmin) return json(403, { error: 'Only supervisors can edit trainee details.' });
    const b = await req.json().catch(() => ({}));
    const oldId = String(req.params.id || '');
    const first = clean(b.first, 60), last = clean(b.last, 60);
    if (!first || !last) return bad('Enter a first and last name.');
    const newId = b.id === undefined ? oldId : clean(b.id, 20);
    if (!newId || !/^\d{4,20}$/.test(newId)) return bad('Employee ID must be numbers only, at least 4 digits.');
    const pool = await db();

    const cur = await pool.request().input('id', sql.VarChar(20), oldId).input('st', sql.VarChar(5), user.station)
      .query('SELECT Active FROM dbo.ojt_employees WHERE EmployeeId=@id AND Station=@st');
    if (!cur.recordset.length) return json(404, { error: 'That trainee no longer exists.' });
    const active = typeof b.active === 'boolean' ? b.active : !!cur.recordset[0].Active;

    if (newId !== oldId) {
      const taken = await pool.request().input('id', sql.VarChar(20), newId)
        .query('SELECT FirstName, LastName, Station FROM dbo.ojt_employees WHERE EmployeeId=@id');
      if (taken.recordset.length) {
        const t = taken.recordset[0];
        return json(409, { error: t.Station === user.station ? `ID ${newId} already belongs to ${t.FirstName} ${t.LastName}.` : `ID ${newId} is already used at ${t.Station}.` });
      }
    }

    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const q = () => new sql.Request(tx)
        .input('old', sql.VarChar(20), oldId).input('new', sql.VarChar(20), newId)
        .input('f', sql.NVarChar(60), first).input('l', sql.NVarChar(60), last).input('a', sql.Bit, active ? 1 : 0);
      if (newId === oldId) {
        await q().query('UPDATE dbo.ojt_employees SET FirstName=@f, LastName=@l, Active=@a WHERE EmployeeId=@old');
      } else {
        // The task log points at the ID, so: copy the trainee to the new ID, move their tasks, remove the old row.
        await q().query(`INSERT INTO dbo.ojt_employees (EmployeeId, FirstName, LastName, Active, Station, CreatedBy, CreatedAt)
                         SELECT @new, @f, @l, @a, Station, CreatedBy, CreatedAt FROM dbo.ojt_employees WHERE EmployeeId=@old`);
        await q().query('UPDATE dbo.ojt_tasklog SET EmployeeId=@new WHERE EmployeeId=@old');
        await q().query('DELETE FROM dbo.ojt_employees WHERE EmployeeId=@old');
      }
      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    }
    return json(200, { ok: true, id: newId });
  })
});

// GET one trainee's full record: counts per task plus every entry
app.http('employeeSummary', {
  methods: ['GET'], authLevel: 'anonymous', route: 'employees/{id}/summary',
  handler: secured(async (req, ctx, user) => {
    const pool = await db();
    const id = req.params.id;
    const e = await pool.request().input('id', sql.VarChar(20), id).input('st', sql.VarChar(5), user.station)
      .query('SELECT EmployeeId AS id, FirstName AS first, LastName AS last, Active AS active FROM dbo.ojt_employees WHERE EmployeeId=@id AND Station=@st');
    if (!e.recordset.length) return json(404, { error: 'No trainee has that ID.' });
    const rows = await pool.request().input('id', sql.VarChar(20), id).query(`
      SELECT Id AS id, CONVERT(char(10), LogDate, 23) AS date, TaskCode AS task, RTRIM(Phase) AS io, Week AS week,
             Gate AS gate, Flight AS flight, Tail AS tail, Notes AS notes, TrainerName AS trainer, TrainerEmail AS trainerEmail
      FROM dbo.ojt_tasklog WHERE EmployeeId=@id ORDER BY LogDate DESC, Id DESC`);
    const recs = rows.recordset, counts = {};
    recs.forEach(r => { counts[r.task] = (counts[r.task] || 0) + 1; });
    return json(200, {
      employee: e.recordset[0],
      counts,
      records: recs,
      latestWeek: recs.length ? recs[0].week : null,
      firstDate: recs.length ? recs[recs.length - 1].date : null,
      trainers: [...new Set(recs.map(r => r.trainer))]
    });
  })
});