# 2 · Batches

Two views of the 3 placement batches. Use `/batches` for authoritative student
counts + the full roster of Torii numbers; use `/attendance/batches` when you need
the batch `id` to query attendance (both return the same ids).

---

## `GET /batches`

Live batch roster, synced from the source and persisted in MongoDB.

**Request:** `GET /placement-trainings/api/batches`

**Response** `{ ok, batches: [...] }`

| Field | Type | Description |
|---|---|---|
| `id` | string | Batch id (use in `POST /attendance`, coding endpoints). |
| `name` | string | `PT_AI_READY_2027` / `PT_IT_2027` / `PT_NON_IT_2027`. |
| `studentCount` | number | Number of students in the batch (live). |
| `rolls` | string[] | Full list of Torii numbers in the batch. |
| `course` | string | e.g. `Placement Training`. |
| `year` | string | e.g. `2027`. |
| `trainer` | string | Primary trainer. |
| `syncedAt` | number | Epoch ms of last sync. |

**Example**
```json
{
  "ok": true,
  "batches": [
    { "id": "6a3d01574748ff3d73afb7f3", "name": "PT_AI_READY_2027", "studentCount": 127,
      "rolls": ["27AAB00020", "27AAB02063", "…"], "course": "Placement Training",
      "year": "2027", "trainer": "Sri Satya Sudhir Reddy", "syncedAt": 1782994866513 }
  ]
}
```
Verified: **3 batches**.

---

## `GET /attendance/batches`

Batch list optimized for the attendance picker.

**Request:** `GET /placement-trainings/api/attendance/batches`

**Response** `{ ok, batches: [...] }`

| Field | Type | Description |
|---|---|---|
| `id` | string | Batch id → pass to `POST /attendance`. |
| `name` | string | Batch name. |
| `year` | string | Year. |
| `course` | string | Course name. |
| `technologies` | string[] | e.g. `["Placement-Coding","Placement-AI-Ready","Placement-Aptitude","Placement-Communication"]`. |
| `trainer` | string | Trainer. |
| `studentCount` | number | Students in batch. |

**Example**
```json
{ "ok": true, "batches": [
  { "id": "6a3d01574748ff3d73afb7f3", "name": "PT_AI_READY_2027", "year": "2027",
    "course": "Placement Training", "technologies": ["Placement-Coding","Placement-AI-Ready","Placement-Aptitude","Placement-Communication"],
    "trainer": "Sri Satya Sudhir Reddy", "studentCount": 127 } ] }
```
Verified: **3 batches**.
