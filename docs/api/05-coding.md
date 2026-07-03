# 5 · Coding & SQL (Owl Coder)

The "Coding" and "SQL" categories are **Owl Coder** module tests (upstream:
`owlcoder.technicalhub.io`). One list endpoint, one report endpoint (per test), and
one per-student report. Coding vs SQL is a UI split by `technology` (`/sql/i`).
Students are keyed by **`roll_no` = Torii number**; `branch` = department.

---

## `GET /coding/tests`

All Owl Coder module tests for the 3 placement batches, with assigned/attempted
counts. Cached ~5 min. (`?refresh=1` forces a rebuild.)

**Response** `{ ok, tests: [...] }`

| Field | Type | Description |
|---|---|---|
| `id` | string | Test id → pass to `/coding/report`. |
| `name` | string | Module test name (e.g. `INTRO-SQL`, `Pre Assessment`). |
| `module` | string | Module (e.g. `Introduction to SQL`). |
| `technology` | string | e.g. `SQL`, `Problem Solving`. (`SQL` → SQL category, else Coding.) |
| `hasMcq` | boolean | Test includes an MCQ section. |
| `hasCoding` | boolean | Test includes a coding section. |
| `start` | string | ISO start datetime. |
| `batches` | object[] | `[{ name, id }]` batches the test is assigned to. |
| `assigned` | number | Total students assigned. |
| `attempted` | number | Total students who attempted (0 = not taken yet). |

**Example**
```json
{ "ok": true, "tests": [
  { "id": "6a45ec616ba53f0be9bb7bef", "name": "INTRO-SQL", "module": "Introduction to SQL",
    "technology": "SQL", "hasMcq": true, "hasCoding": false, "start": "2026-07-02T05:30:00.000Z",
    "batches": [ {"name":"PT_IT_2027","id":"6a3d020d4748ff3d73afda62"}, … ],
    "assigned": 296, "attempted": 0 } ] }
```
Verified: **2 tests** (INTRO-SQL, Pre Assessment). `attempted: 0` = assigned but not yet taken.

---

## `POST /coding/report`

Combined report for one test across all 3 batches.

**Request:** `POST /placement-trainings/api/coding/report`
```json
{ "test_id": "6a45ec616ba53f0be9bb7bef" }
```

**Response** `{ ok, test, stats, students: [...] }`

`stats`:

| Field | Type | Description |
|---|---|---|
| `total_assigned` | number | Students assigned. |
| `attempted` / `not_attempted` | number | Attempt counts. |
| `passed` / `failed` | number | Result counts. |
| `pass_rate` | number | `passed/attempted` × 100. |
| `avg_mcq_percentage` / `avg_coding_percentage` | number | Averages over attempted. |
| `total_violations` | number | Proctoring flags. |

Each `students[]` row:

| Field | Type | Description |
|---|---|---|
| `_id` | string | Result id → pass to `/coding/student`. |
| `roll_no` | string | Torii number. |
| `first_name` | string | Name. |
| `college` | string | College. |
| `branch` | string | Department. |
| `mcq_total_correct` / `mcq_total_questions` | number | MCQ counts. |
| `mcq_percentage` | number | MCQ %. |
| `mcq_result` | string | `Pass` / `Fail` / `Not Attempted` / `-`. |
| `coding_earned_score` / `coding_total_score` | number | Coding score. |
| `coding_percentage` | number | Coding %. |
| `coding_result` | string | `Pass` / `Fail` / `-`. |
| `overall_result` | string | `Pass` / `Fail` / `Not Attempted`. |
| `attempted` | boolean | Whether attempted. |
| `violations` | number | Flags. |
| `batch` | string | Batch name (added by the proxy). |

**Example (student row)**
```json
{ "_id": "6a45ec9b6ba53f0be9bb7c17", "roll_no": "27AAB00020", "first_name": "Afreed Basha M",
  "college": "NCET", "branch": "CSE", "mcq_percentage": 0, "coding_percentage": 0,
  "mcq_result": "Not Attempted", "overall_result": "Not Attempted", "attempted": false,
  "violations": 0, "batch": "PT_AI_READY_2027" }
```
Verified: **296 students** returned (all `Not Attempted` until the test is taken).

---

## `POST /coding/student`

Full individual report (for a drill-down).

**Request:** `POST /placement-trainings/api/coding/student` → `{ "result_id": "<students[]._id>" }`

**Response** `{ ok, report: { student, test, summary, mcq_result, coding_result } }`
- `summary`: `overall_result`, `mcq_percentage`, `coding_percentage`, `mcq_result`, `coding_result`, `violations`, `already_submitted_count`.
- `mcq_result`: `total_correct`, `total_questions`, `skipped_questions`, `wrong_questions`, `duration`, `submittedAt`, `all_questions[]`.
- `coding_result`: `total_problems`, `total_score`, `earned_score`, `submittedAt`, `submissions[]`.

---

## Analytics recipes

- **Attempt / pass rates:** from `stats`, or count `students[].overall_result`.
- **Avg MCQ / coding %:** average over `attempted` students.
- **By department:** group `students[]` by `branch` (normalize).
- **SQL vs Coding split:** filter `/coding/tests` on `technology` matching `/sql/i`.
