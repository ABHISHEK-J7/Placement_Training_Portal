# 4 · Assessments — Aptitude (Daily & Grand)

The portal's "Aptitude" category = MCQ assessments from the Torii backend. Two
kinds: **daily** tests and **grand** tests (comprehensive, multi-topic/multi-batch,
e.g. the pre-assessment). A catalog endpoint lists them; a details endpoint returns
per-student scores. Students are keyed by **`roll_no` = Torii number**; `branch` =
department.

---

## `GET /assessments?type=daily|grand`

Catalog of assessments, unified shape for both kinds.

**Request:** `GET /placement-trainings/api/assessments?type=daily`
(`type` = `daily` (default) or `grand`)

**Response** `{ ok, assessments: [...] }`

| Field | Type | Description |
|---|---|---|
| `id` | string | Assessment id → pass to `/assessments/details`. |
| `title` | string | Daily: topic name. Grand: assessment name. |
| `topic` | string | Topic (grand: comma-joined list of topics). |
| `module` | string | Module name. |
| `technology` | string | e.g. `Placement-Aptitude`, `Placements`. |
| `batch` | string | Batch name(s) (grand: comma-joined). |
| `batchList` | string[] | Batch names this assessment belongs to. |
| `level` | string | `any` / `easy` / `medium` / `hard`. |
| `testType` | string | `ai` / `general` / `certification`. |
| `college` | string | College, or `—`. |
| `questions` | number | Question count. |
| `start` | string | Start datetime (`dd-mm-yyyy HH:mm` daily, ISO grand). |
| `duration` | number\|null | Minutes (grand); null for daily. |
| `topicCount` | number | Number of topics (grand). |
| `isGrand` | boolean | true for grand tests. |

> The catalog is **server-side filtered to the 3 placement batches only** — no other
> batch is ever returned. Verified: **6 daily**, **1 grand**. Student results
> (`/details`) are likewise restricted to the 3-batch roster.

**Grand example**
```json
{ "id": "6a43637758f85dacb9dc2bee", "title": "PREASSESSMENT_01_07_2026",
  "topic": "Percentages & Ratio-Proportion, Profit & Loss, …", "module": "Aptitude",
  "technology": "Placement-Aptitude", "batch": "PT_AI_READY_2027, PT_NON_IT_2027, PT_IT_2027",
  "batchList": ["PT_AI_READY_2027","PT_NON_IT_2027","PT_IT_2027"], "level": "hard",
  "testType": "general", "college": "—", "questions": 40, "start": "01-07-2026 13:00",
  "duration": 40, "topicCount": 12, "isGrand": true }
```

---

## `POST /assessments/details`

Per-student results for one assessment.

**Request:** `POST /placement-trainings/api/assessments/details`
```json
{ "assessment": "6a43637758f85dacb9dc2bee", "type": "grand" }
```
(`type` = `daily` or `grand`, matching the catalog it came from.)

**Response** `{ ok, result: [...] }` — one object per attempt.

| Field | Type | Description |
|---|---|---|
| `roll_no` | string | Torii number. |
| `first_name` | string | Student name. |
| `college` | string | College. |
| `branch` | string[] | Department(s) — usually one, e.g. `["DS"]`. |
| `section` | any | Section (often empty). |
| `total_score` | string | Net score (may be negative — negative marking). |
| `total_time` | string | Time taken (seconds). |
| `correct_answer_count` | number | Correct answers. |
| `wrong_answer_count` | number | Wrong answers. |

**Example**
```json
{ "ok": true, "result": [
  { "roll_no": "27AAB02070", "first_name": "Gangothri S", "college": "NCET",
    "branch": ["DS"], "section": [], "total_score": "14", "total_time": "24935.58",
    "correct_answer_count": 14, "wrong_answer_count": 26 } ] }
```
Verified: **90 attempts** for the grand pre-assessment (daily tests vary; some 0 until taken).

> Empty `result: []` means nobody has attempted that assessment yet — not an error.

---

## Analytics recipes

- **Attempts per assessment:** `result.length`.
- **Avg score / accuracy:** average `total_score`; accuracy = `correct/(correct+wrong)`.
- **By department:** group by `branch[0]` (normalize per README).
- **Pass rate:** define pass (e.g. `correct/questions ≥ 0.4`) and compute share.
- **Score distribution / time analysis:** bucket `total_score`, `total_time`.
