# 3 · Attendance

Day-wise, session-wise attendance for a batch. Each day has two sessions
identified by `mode`: **`lightmode`** and **`brightmode`**. Students are keyed by
**`roll_no` = Torii number** — join to `/roster` for department/branch cuts.

---

## `POST /attendance`

**Request:** `POST /placement-trainings/api/attendance`
```json
{ "batch_id": "6a3d01574748ff3d73afb7f3" }
```
Get `batch_id` from `/batches` or `/attendance/batches`.

**Response** `{ ok, result: [...] }` — one object per student.

| Field | Type | Description |
|---|---|---|
| `roll_no` | string | Torii number (join key to `/roster`). |
| `present` | number | Count of `present` sessions for this student (all days/modes). |
| `absent` | number | Count of `absent` sessions. |
| `attendance` | object[] | Per-session records (see below). |

Each `attendance[]` item:

| Field | Type | Description |
|---|---|---|
| `session` | string | Session id. |
| `date` | string | `dd-mm-yyyy`. |
| `mode` | string | `lightmode` or `brightmode` (the two daily sessions). |
| `status` | string | `present` or `absent`. |

**Example**
```json
{
  "ok": true,
  "result": [
    {
      "roll_no": "27AAB00020",
      "present": 0,
      "absent": 4,
      "attendance": [
        { "session": "6a45e4820975828ee58afcc5", "date": "02-07-2026", "mode": "lightmode", "status": "absent" }
      ]
    }
  ]
}
```
Verified: **127 students** for `PT_AI_READY_2027`, with live per-session records.

> If a batch has no data yet the API returns `{ ok: true, result: [] }` (optionally a `note`).

---

## Analytics recipes

- **Overall batch attendance %:** `Σ present / Σ (present + absent)` over `result`.
- **Per-student %:** `present / (present + absent)`.
- **Day-wise %:** flatten `attendance[]` across students; group by `date`; `present / total`.
- **Mode-wise (lightmode vs brightmode):** group `attendance[]` by `mode`.
- **Branch/department-wise:** map each `roll_no` → department via `/roster`, then group.
- **Batch-wise across all 3 batches:** call `/attendance` for each batch id and aggregate.

All fields are live from the source on every call (no caching on this endpoint).
