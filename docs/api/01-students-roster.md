# 1 · Students & Roster

Two endpoints describe the student population. **Students** is the imported
directory (keyed by USN). **Roster** is the live, authoritative Torii→department
mapping used to attribute all activity data (attendance/assessments/coding).

---

## `GET /students`

The student directory (imported from Excel, stored in MongoDB).

**Request:** `GET /placement-trainings/api/students`

**Response** `{ ok, students: [...] }`

| Field | Type | Description |
|---|---|---|
| `usn` | string | University seat number (e.g. `1NC23CS007`). Primary key. |
| `torii` | string | Torii number (e.g. `27AAB00020`) — join key to attendance/assessments. May be empty if not imported. |
| `name` | string | Student name. |
| `department` | string | Department (e.g. `CSE`, `CSE - DS`, `CIVIL`). |
| `batch` | string | One of the 3 placement batches. |

**Example**
```json
{
  "ok": true,
  "students": [
    { "usn": "1NC23CS007", "torii": "27AAB00020", "name": "Afreed Basha M", "department": "CSE", "batch": "PT_AI_READY_2027" }
  ]
}
```
Verified: **296 rows**.

---

## `GET /roster`

The unified **Torii → { department, name, usn }** roster. Departments are resolved
live from the assessment/coding APIs and the directory, so this has **full
department coverage** even for students not yet in the imported Excel. This is the
correct source for attributing attendance/coding (which are keyed by Torii number)
to a department. Cached ~5 min server-side.

**Request:** `GET /placement-trainings/api/roster` (add `?refresh=1` to force a rebuild)

**Response** `{ ok, roster: [...] }`

| Field | Type | Description |
|---|---|---|
| `torii` | string | Torii number = the `roll_no` used in attendance/assessment/coding. |
| `department` | string | Department (normalize per README). |
| `name` | string | Student name. |
| `usn` | string | USN, when known from the directory. |
| `batch` | string | Placement batch. |

**Example**
```json
{
  "ok": true,
  "roster": [
    { "torii": "27AAB02063", "department": "DS", "name": "Darshan G K", "usn": "1NC23CD011", "batch": "PT_AI_READY_2027" }
  ]
}
```
Verified: **296 rows, all with a department**.

**Analytics use:** build a lookup `torii → department` from this once, then join it
to any attendance/assessment/coding row's `roll_no` to get branch/department cuts.
