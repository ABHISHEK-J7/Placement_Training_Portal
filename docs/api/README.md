# Torii Placement Portal — API Documentation

This folder documents every data API the Placement Training portal exposes, so an
analytics team can pull **attendance, assessments (Aptitude / Coding / SQL /
Communication) and student** data and build any report (batch-wise, branch-wise,
department-wise, per-student, over time).

All endpoints below are **server-side proxy APIs** hosted by the portal itself.
Prefer these over the raw upstream services — they are CORS-free, consistently
shaped, department-normalized, and some are cached. (The raw upstreams are noted
per file for reference only; several are IP-restricted.)

---

## Base URL

```
https://toriiminds.com/placement-trainings/api
```

Local dev: `http://localhost:<port>/placement-trainings/api`

## Conventions

- **Format:** JSON. Requests that take a body use `Content-Type: application/json`.
- **Envelope:** most responses are `{ "ok": true, ...payload }`. On failure,
  `{ "ok": false, "error": "…" }` with a 4xx/5xx status.
- **Auth:** these data endpoints are currently open within the app network (no
  token). Do not expose them publicly without adding auth.
- **Dates:** attendance uses `dd-mm-yyyy`; daily assessments use `dd-mm-yyyy HH:mm`;
  grand/coding use ISO 8601. Myna uses `dd-mm-yyyy`.

## The two student identifiers (important)

| Identifier | Example | Where it's used |
|---|---|---|
| **Torii number** | `27AAB00020` | The `roll_no` in **attendance**, **assessments**, **coding**. This is the join key across all activity data. |
| **USN** | `1NC23CS007` | The university seat number in the **directory**. |

The **Roster** endpoint (`/roster`) maps `Torii → { department, name, usn }`, and is
the bridge for anything keyed by Torii number. Attendance/assessment/coding rows
carry `roll_no` = the Torii number.

## Department normalization

Departments appear in a few codings across sources. Treat these as the **same** department:

| Canonical | Also seen as |
|---|---|
| CSE - DS | `DS` |
| CSE - AI ML | `AIML` |
| CIVIL | `CE` |
| CSE | `CSE` |
| ECE | `ECE` |
| ISE | `ISE` |

## The 3 placement batches

Everything is scoped to these batches:

| batch_name | batch id |
|---|---|
| `PT_AI_READY_2027` | `6a3d01574748ff3d73afb7f3` |
| `PT_IT_2027` | `6a3d020d4748ff3d73afda62` |
| `PT_NON_IT_2027` | `6a3d01c44748ff3d73afd0d5` |

> **Strictly scoped.** Every endpoint here returns data for **only these 3 batches** —
> assessment catalogs are batch-filtered server-side, and assessment/communication
> student results are filtered to the 3-batch roster. No other batch's data is ever
> surfaced.

---

## Endpoint index

| # | Domain | File | Key endpoints |
|---|---|---|---|
| 1 | Students & Roster | [01-students-roster.md](01-students-roster.md) | `GET /students`, `GET /roster` |
| 2 | Batches | [02-batches.md](02-batches.md) | `GET /batches`, `GET /attendance/batches` |
| 3 | Attendance | [03-attendance.md](03-attendance.md) | `POST /attendance` |
| 4 | Assessments (Aptitude) | [04-assessments.md](04-assessments.md) | `GET /assessments`, `POST /assessments/details` |
| 5 | Coding & SQL (Owl Coder) | [05-coding.md](05-coding.md) | `GET /coding/tests`, `POST /coding/report`, `POST /coding/student` |
| 6 | Communication (Myna) | [06-communication.md](06-communication.md) | `GET /communication` |

---

## Live data status (verified)

Checked against production data on **02-07-2026**:

| Endpoint | Returns data? | Notes |
|---|---|---|
| `GET /students` | ✅ 296 rows | directory (USN + Torii + dept + batch) |
| `GET /roster` | ✅ 296 rows | Torii → department (full coverage) |
| `GET /batches` | ✅ 3 batches | live student counts |
| `GET /attendance/batches` | ✅ 3 batches | — |
| `POST /attendance` | ✅ 127/batch | live present/absent per session (lightmode/brightmode) |
| `GET /assessments?type=daily` | ✅ 6 | aptitude/MCQ tests (3 batches only) |
| `GET /assessments?type=grand` | ✅ 1 | the pre-assessment (90 attempted) |
| `POST /assessments/details` | ✅ 90 attempts | real scores (3-batch roster only) |
| `GET /coding/tests` | ✅ 2 tests | INTRO-SQL, Pre Assessment (assigned rosters; 0 attempted so far) |
| `POST /coding/report` | ✅ 296 students | per-student MCQ/coding results |
| `GET /communication` | ✅ 9,297 attempts | 20 modules, 3 batches only (per-batch admin_id). Needs server IP whitelisted on Myna port 3001. |

## Analytics recipes (quick reference)

- **Batch-wise attendance %** — for each batch id, `POST /attendance` → sum `present` and
  `present+absent` over students → `present / (present+absent)`.
- **Branch/department-wise attendance** — join each attendance `roll_no` to `/roster`
  (Torii → department), group by normalized department.
- **Day-wise / mode-wise attendance** — expand each student's `attendance[]`; group by
  `date` and/or `mode` (`lightmode` / `brightmode`), count `status === "present"`.
- **Assessment performance by department** — `POST /assessments/details` → group by
  `branch` (normalize), average `total_score`, `correct/(correct+wrong)` accuracy.
- **Coding pass/attempt rates** — `POST /coding/report` → `stats` gives assigned/attempted/
  passed; `students[]` gives per-student mcq%/coding% and `branch` for department cuts.
- **Communication proficiency** — `GET /communication` → group by `collectionName` (module)
  and `branch`; average `accuracy`.

See each file for exact fields and examples.
