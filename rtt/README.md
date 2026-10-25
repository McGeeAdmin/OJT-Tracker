# Ramp Trainee Tracker

Used by every McGee station. Each trainer only sees the trainees at the station(s) their Entra group gives them.

A web app for ramp trainers to record which tasks each new hire did on each flight, and to see how many times every trainee has done every task.

Trainers sign in with their Microsoft work account. They can use the app on a phone at the gate or on a computer.

---

## What trainers see

The app has two parts. On a phone, they're buttons at the bottom of the screen; on a computer, they're tabs at the top.

**Submit tasks** is the form:

1. The trainer's name is filled in automatically from their sign-in.
2. They pick the trainee by typing part of a name or employee ID. If the trainee isn't on the list yet, the trainer can add them right there.
3. Week 1 or 2 is filled in from the trainee's record, and the trainer can change it.
4. They choose **Arrival (In)** or **Departure (Out)**. Only that part of the turn's tasks are shown.
5. They enter the gate, flight number and tail number.
6. They tap every task the trainee did. Each task button shows how many times this trainee has done it so far.
7. They add notes if needed and submit.

"Submit and add another trainee on this flight" keeps the flight details filled in for the next trainee on the same turn.

**View submissions** has three views. A switch at the top shows everyone's trainees or only the trainer's own.

- **By trainee:** one trainee's count for every task and when each was last done. Tapping a task lists every time it was done.
- **All submissions:** a feed of submissions, newest first, with filters and a CSV download.
- **Progress grid:** every trainee as a row and every task as a column, with counts in each cell.

---

## How it's built

| Folder | Azure service | Purpose |
|---|---|---|
| `src/` | Azure Static Web Apps | The web page (`index.html`) and sign-in settings (`staticwebapp.config.json`) |
| `api/` | Azure Functions, run by Static Web Apps | Reads and saves data, and checks who is signed in |
| `database/` | Azure SQL Database | `schema.sql` creates the two tables |
| — | Microsoft Entra ID | Company sign-in. Only accounts in your tenant can get in |

### The database

**Employees** holds one row per trainee.

| Column | Meaning |
|---|---|
| `EmployeeId` | The trainee's employee ID (the key) |
| `FirstName`, `LastName` | Trainee's name |
| `Station` | Station code (SEA, PDX…). Trainers only see trainees at their own stations |
| `Active` | 1 = in training. 0 = hidden from lists after they finish or leave; their history is kept |
| `CreatedBy`, `CreatedAt` | Who added the trainee, and when |

**TaskLog** holds one row per task done. If a trainer ticks three tasks in one submission, that saves three rows.

| Column | Meaning |
|---|---|
| `Id` | Row number |
| `EntryGroupId` | Shared by all rows saved in the same submission, so a submission can be shown or deleted as one |
| `LogDate` | Date the task was done |
| `EmployeeId` | Which trainee |
| `TaskCode` | Which task (the codes are listed in `api/src/taskList.js`) |
| `Phase` | `IN` = arrival, `OUT` = departure |
| `Week` | Training week, 1 or 2 |
| `Gate`, `Flight`, `Tail` | Flight details. A gate is required, plus a flight or tail number |
| `Notes` | Optional trainer notes |
| `TrainerEmail`, `TrainerName` | Who logged it, taken from their sign-in |
| `CreatedAt` | When it was saved |

---

## Stations and access

Each station is an **app role** on the Training Tracker app registration (value `SEA`, `PDX`…), and each station's Entra group is assigned to its role under Enterprise applications → Users and groups. At sign-in, Static Web Apps calls `GetRoles` (`api/src/functions/roles.js`), which turns those roles into `station_sea`, `station_pdx`… Every API call is limited to the station the page is showing, and the server refuses any station the user isn't in.

- Adding a station: create an app role whose value is the station code, assign that station's group to it, and add the code to the STATIONS setting so admins can see it.
- A group that should see several stations (corporate, regional) gets assigned to each of those roles.
- The **ADMIN** app role can switch to every station listed in the Function App setting **STATIONS** (`SEA,PDX,LAX`). Add a new station's code there as well as creating its app role.
- Only direct members of an assigned group get the role. Members of groups nested inside it don't.
- Admins and people with more than one station pick the station from a dropdown in the header, where the station name is.
- Role changes take effect the next time the person signs out and back in.
- Completed trainees and their submissions show only on the Completed page.