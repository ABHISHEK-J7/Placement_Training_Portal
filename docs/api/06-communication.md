# 6 · Communication (Myna)

The "Communication" category = **Myna** module results (upstream:
`myna.toriiminds.com:3001`). Each of the 3 batches has its **own `admin_id`**; the
portal proxy fetches all 3 (across 25 modules), merges into one flat attempts
array (each row tagged with its `batch`), and returns a per-module summary.
**Live and returning data.**

---

## `GET /communication`

**Request:** `GET /placement-trainings/api/communication`
Optional query: `?start=dd-mm-yyyy&end=dd-mm-yyyy` (defaults to a wide window).
Cached ~5 min server-side.

**Response** `{ ok: true, attempts: [...], modules: [...] }`

Each `attempts[]` row (one per attempt; a student can appear many times):

| Field | Type | Description |
|---|---|---|
| `_id` | string | The **user's** ObjectId (repeats across attempts). |
| `first_name` | string | Student name. |
| `email` | string | Email. |
| `gender` | string | May be empty. |
| `roll_no` | string | **Torii number** (e.g. `27AAB00020`). |
| `college` | string | College. |
| `branch` | string | Department (normalized to a string by the proxy; upstream sends an array). |
| `passout_year` | string | Graduation year. |
| `accuracy` | number\|null | Score/accuracy for the attempt (0–100). |
| `duration` | number | Seconds (may be 0/absent for some modules). |
| `attempted_date` | string | `dd-mm-yyyy HH:MM:SS` (IST). |
| `collectionName` | string | Module name (e.g. `Response Selection`, `Typing`) — group by this. |
| `batch` | string | Placement batch (added by the proxy). |

`modules[]` (summary): `{ name, attempts, students }`, sorted by students desc.

**Example**
```json
{ "ok": true,
  "attempts": [
    { "_id": "69954f0a66c183b18fa7ecc6", "first_name": "AFREED BASHA M", "roll_no": "27AAB00020",
      "email": "1nc23cs007@ncetmail.com", "college": "NCET", "branch": "CSE", "accuracy": 100,
      "duration": 0, "attempted_date": "06-04-2026 14:03:34", "collectionName": "Response Selection",
      "batch": "PT_AI_READY_2027" }
  ],
  "modules": [ { "name": "Response Selection", "attempts": 3549, "students": 205 } ] }
```
Verified **02-07-2026**: **9,297 attempts across 20 modules** (Response Selection 205 students,
Passage Comprehension 195, Reading Comprehension 148, …). Per batch: AI_READY 6575 · IT 2298 · NON_IT 424.

> If Myna is unreachable the proxy returns `{ ok:false, error, attempts:[], modules:[] }` (503).
> Myna is IP-whitelisted on port 3001 — reachable only from a whitelisted host/server.

---

## Upstream contract (built into the proxy)

`POST https://myna.toriiminds.com:3001/api/get-admin-wise-result-by-date`
```json
{ "admin_id": "<per-batch>", "start_date": "dd-mm-yyyy", "end_date": "dd-mm-yyyy", "module_ids": [ /* 25 */ ] }
```

**Per-batch `admin_id`** (only this changes per batch):

| Batch | admin_id |
|---|---|
| PT_AI_READY_2027 | `6a3dfa986aa431f082087a00` |
| PT_IT_2027 | `6a3dfb3f6aa431f082087a08` |
| PT_NON_IT_2027 | `6a3dfd2f6aa431f08208934d` |

**Module ids (25, same for all batches):**
```
6756877792b3362d52c4b17e  Response Selection      6756bc0e92b3362d52c4b29a  Retell a Story
6756a2c592b3362d52c4b1fb  Passage Comprehension   6756bc8092b3362d52c4b29f  Answer Questions
6756a6ee92b3362d52c4b237  Sentence Completion     6756be6092b3362d52c4b2ae  Listen & Repeat
6756a85892b3362d52c4b23c  Reading Comprehension   6756c1a692b3362d52c4b2b7  Readout
6756ae0392b3362d52c4b248  Email Writing           6756c28f92b3362d52c4b2bc  SpeakOut
6756aee792b3362d52c4b24d  Summary Opinion         6756c4fd92b3362d52c4b2c1  Questionnaire
6756af8392b3362d52c4b258  Dictation               6863ab4f68f59ccf1ca582c0  WordFlow
6756b11b92b3362d52c4b268  Passage Reconstruction  698ef42e38b013caf0f7c234  (module)
6756b22b92b3362d52c4b275  Typing                  698ef55d38b013caf0f7d5dc  (module)
6756b98792b3362d52c4b286  Sentence Build          699c312f9159637c336bf822  (module)
6756ba4592b3362d52c4b28b  Short Answer            69a69165588636f72f608bf6  Image Description
6756bad092b3362d52c4b290  Give Your Opinion       69a9212018ee0ff302f0f1d7  (module)
6756bb7492b3362d52c4b295  Speaking Situation
```
(Module names come from each row's `collectionName`; the last few ids weren't named in the source doc.)

Optional env overrides: `MYNA_URL`, `MYNA_START_DATE`, `MYNA_END_DATE` (dd-mm-yyyy).

---

## Analytics recipes

- **Per-module participation:** group `attempts` by `collectionName` → unique `_id` count.
- **Proficiency by module / department / batch:** average `accuracy` grouped by
  `collectionName`, `branch` (normalize per README), and/or `batch`.
- **Improvement over time:** a student's `accuracy` series across `attempted_date` per module.
- **Attempts-per-student:** count rows per `_id` (multiple attempts allowed).
