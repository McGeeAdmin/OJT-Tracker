CREATE TABLE dbo.ojt_employees (
    EmployeeId   VARCHAR(20)   NOT NULL PRIMARY KEY,
    FirstName    NVARCHAR(60)  NOT NULL,
    LastName     NVARCHAR(60)  NOT NULL,
    Active       BIT           NOT NULL DEFAULT 1,
    Station      VARCHAR(5)    NOT NULL,   -- station code, e.g. SEA
    CreatedBy    NVARCHAR(200) NULL,
    CreatedAt    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);


CREATE TABLE dbo.ojt_tasklog (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    EntryGroupId UNIQUEIDENTIFIER NOT NULL,
    LogDate      DATE          NOT NULL,
    EmployeeId   VARCHAR(20)   NOT NULL REFERENCES dbo.ojt_employees(EmployeeId),
    TaskCode     VARCHAR(40)   NOT NULL,   -- task list lives in api/src/taskList.js
    Phase        CHAR(3)       NOT NULL CHECK (Phase IN ('IN','OUT')),
    Week         TINYINT       NOT NULL CHECK (Week IN (1,2)),
    Gate         NVARCHAR(10)  NOT NULL,
    Flight       NVARCHAR(10)  NULL,
    Tail         NVARCHAR(12)  NULL,
    Notes        NVARCHAR(500) NULL,
    TrainerEmail NVARCHAR(200) NOT NULL,
    TrainerName  NVARCHAR(120) NOT NULL,
    CreatedAt    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_ojt_employees_Station ON dbo.ojt_employees(Station, Active);
CREATE INDEX IX_ojt_tasklog_Employee ON dbo.ojt_tasklog(EmployeeId, TaskCode);
CREATE INDEX IX_ojt_tasklog_Date     ON dbo.ojt_tasklog(LogDate DESC);
CREATE INDEX IX_ojt_tasklog_Trainer  ON dbo.ojt_tasklog(TrainerEmail, LogDate);

-- LIT trainees and their logged tasks (same shape as the OJT tables; Phase also allows PUSH)
CREATE TABLE dbo.lit_employees (
    EmployeeId   VARCHAR(20)   NOT NULL PRIMARY KEY,
    FirstName    NVARCHAR(60)  NOT NULL,
    LastName     NVARCHAR(60)  NOT NULL,
    Active       BIT           NOT NULL DEFAULT 1,
    Station      VARCHAR(5)    NOT NULL,
    CreatedBy    NVARCHAR(200) NULL,
    CreatedAt    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.lit_tasklog (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    EntryGroupId UNIQUEIDENTIFIER NOT NULL,
    LogDate      DATE          NOT NULL,
    EmployeeId   VARCHAR(20)   NOT NULL REFERENCES dbo.lit_employees(EmployeeId),
    TaskCode     VARCHAR(40)   NOT NULL,   -- LIT list in api/src/taskList.js
    Phase        VARCHAR(4)    NOT NULL CHECK (Phase IN ('IN','OUT','PUSH')),
    Week         TINYINT       NOT NULL CHECK (Week IN (1,2)),
    Gate         NVARCHAR(10)  NOT NULL,
    Flight       NVARCHAR(10)  NULL,
    Tail         NVARCHAR(12)  NULL,
    Notes        NVARCHAR(500) NULL,
    TrainerEmail NVARCHAR(200) NOT NULL,
    TrainerName  NVARCHAR(120) NOT NULL,
    CreatedAt    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_lit_employees_Station ON dbo.lit_employees(Station, Active);
CREATE INDEX IX_lit_tasklog_Employee  ON dbo.lit_tasklog(EmployeeId, TaskCode);
CREATE INDEX IX_lit_tasklog_Date      ON dbo.lit_tasklog(LogDate DESC);
CREATE INDEX IX_lit_tasklog_Trainer   ON dbo.lit_tasklog(TrainerEmail, LogDate);