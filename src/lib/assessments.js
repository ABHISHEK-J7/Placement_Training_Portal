/**
 * Assessment analytics adapter (real Torii backend).
 *
 * Two data sources (proxied server-side):
 *  - GET  /api/assessments          → catalog: [{ id, topic, module, technology,
 *      course, batch, level, testType, college, questions, start, end }]
 *  - POST /api/assessments/details  → per-assessment student results:
 *      [{ roll_no, first_name, college, branch:[…], total_score, total_time,
 *         correct_answer_count, wrong_answer_count }]
 *
 * The catalog is categorised every way (technology/module/topic/batch/level/
 * test type/college/time). Per-assessment results drive the score analytics.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Parse an assessment date into { ts, dateLabel, monthKey, monthLabel }.
 * Handles daily "DD-MM-YYYY HH:mm" and grand ISO "2026-07-01T03:30:00.000Z".
 */
export function parseDateTime(s) {
  if (!s) return { ts: 0, dateLabel: "", monthKey: "", monthLabel: "" };
  const str = String(s);

  // ISO (grand tests)
  if (str.includes("T")) {
    const d = new Date(str);
    if (Number.isNaN(d.getTime())) return { ts: 0, dateLabel: str, monthKey: "", monthLabel: "" };
    const dd = d.getDate();
    const mm = d.getMonth() + 1;
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return {
      ts: d.getTime(),
      dateLabel: `${String(dd).padStart(2, "0")} ${MONTHS[mm - 1]} ${yyyy} · ${hh}:${min}`,
      monthKey: `${yyyy}-${String(mm).padStart(2, "0")}`,
      monthLabel: `${MONTHS[mm - 1]} ${yyyy}`,
    };
  }

  // "DD-MM-YYYY HH:mm" (daily tests)
  const [datePart, timePart = ""] = str.split(" ");
  const [dd, mm, yyyy] = datePart.split("-").map(Number);
  if (!yyyy) return { ts: 0, dateLabel: str, monthKey: "", monthLabel: "" };
  const ts = new Date(yyyy, (mm || 1) - 1, dd || 1).getTime();
  return {
    ts,
    dateLabel: `${String(dd).padStart(2, "0")} ${MONTHS[(mm || 1) - 1]} ${yyyy}${timePart ? ` · ${timePart}` : ""}`,
    monthKey: `${yyyy}-${String(mm).padStart(2, "0")}`,
    monthLabel: `${MONTHS[(mm || 1) - 1]} ${yyyy}`,
  };
}

const LEVEL_LABEL = { any: "Any", easy: "Easy", medium: "Medium", hard: "Hard" };
export const levelLabel = (l) => LEVEL_LABEL[l] || l || "—";

const TYPE_LABEL = { ai: "AI", general: "General", certification: "Certification" };
export const typeLabel = (t) => TYPE_LABEL[t] || t || "—";

/** [ [label, count], … ] sorted by count desc, for any categorical key. */
export function groupCount(list, keyFn) {
  const m = new Map();
  for (const x of list) {
    const k = keyFn(x) || "—";
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** Headline rollups for the catalog. */
export function assessmentsOverview(list) {
  const set = (fn) => new Set(list.map(fn).filter(Boolean));
  return {
    total: list.length,
    batches: set((a) => a.batch).size,
    technologies: set((a) => a.technology).size,
    modules: set((a) => a.module).size,
    topics: set((a) => a.topic).size,
    questions: list.reduce((s, a) => s + (a.questions || 0), 0),
  };
}

/** Assessment count per month, chronological. */
export function timelineByMonth(list) {
  const m = new Map();
  for (const a of list) {
    const { monthKey, monthLabel } = parseDateTime(a.start);
    if (!monthKey) continue;
    const e = m.get(monthKey) || { key: monthKey, label: monthLabel, count: 0 };
    e.count += 1;
    m.set(monthKey, e);
  }
  return [...m.values()].sort((a, b) => a.key.localeCompare(b.key)).map((e) => [e.label, e.count]);
}

/** Batch × Technology count matrix. */
export function batchTechMatrix(list) {
  const cells = new Map();
  const batches = [];
  const techs = [];
  for (const a of list) {
    if (!batches.includes(a.batch)) batches.push(a.batch);
    if (!techs.includes(a.technology)) techs.push(a.technology);
    const k = `${a.batch}||${a.technology}`;
    cells.set(k, (cells.get(k) || 0) + 1);
  }
  return {
    batches: batches.sort(),
    techs: techs.sort(),
    get: (b, t) => cells.get(`${b}||${t}`) || 0,
  };
}

/* ──────────────────────────── per-assessment results ─────────────────────── */

export const scoreNum = (r) => Number(r.total_score) || 0;
export const timeNum = (r) => Number(r.total_time) || 0;
export const correctNum = (r) => Number(r.correct_answer_count) || 0;
export const wrongNum = (r) => Number(r.wrong_answer_count) || 0;
export const studentBranch = (r) => (Array.isArray(r.branch) ? r.branch[0] : r.branch) || "";

/** Accuracy over attempted questions (0–100). */
export function accuracy(r) {
  const attempted = correctNum(r) + wrongNum(r);
  return attempted ? Math.round((correctNum(r) / attempted) * 100) : 0;
}

/** HOD sees only their branch; everyone else sees all. */
export function scopeResults(user, rows, seesAll) {
  if (!user) return [];
  if (seesAll) return rows;
  return rows.filter((r) => studentBranch(r) === user.department);
}

/** Enrich a result row with directory USN/name (joined by Torii number = roll_no). */
export function enrichResults(rows, dirMap) {
  return rows.map((r) => {
    const info = dirMap?.get((r.roll_no || "").trim().toUpperCase()) || {};
    return {
      torii: r.roll_no,
      usn: info.usn || "",
      name: r.first_name || info.name || "",
      branch: studentBranch(r) || info.department || "",
      college: r.college || "",
      score: scoreNum(r),
      time: timeNum(r),
      correct: correctNum(r),
      wrong: wrongNum(r),
      accuracy: accuracy(r),
    };
  });
}

/** Summary stats over enriched result rows. `questions` = assessment question count. */
export function resultStats(rows, questions) {
  const n = rows.length;
  if (!n) return { attempts: 0, avgScore: 0, maxScore: 0, minScore: 0, avgAccuracy: 0, avgTime: 0, passRate: 0, passCount: 0 };
  const sum = (fn) => rows.reduce((s, r) => s + fn(r), 0);
  const passCount = rows.filter((r) =>
    questions ? r.correct / questions >= 0.4 : r.score > 0,
  ).length;
  return {
    attempts: n,
    avgScore: Math.round((sum((r) => r.score) / n) * 10) / 10,
    maxScore: Math.max(...rows.map((r) => r.score)),
    minScore: Math.min(...rows.map((r) => r.score)),
    avgAccuracy: Math.round(sum((r) => r.accuracy) / n),
    avgTime: Math.round(sum((r) => r.time) / n),
    passRate: Math.round((passCount / n) * 100),
    passCount,
  };
}

/** Score histogram into readable bands. */
export function scoreDistribution(rows) {
  const b = { Negative: 0, "0": 0, "1–5": 0, "6–10": 0, "11–20": 0, "21+": 0 };
  for (const r of rows) {
    const s = r.score;
    if (s < 0) b["Negative"] += 1;
    else if (s === 0) b["0"] += 1;
    else if (s <= 5) b["1–5"] += 1;
    else if (s <= 10) b["6–10"] += 1;
    else if (s <= 20) b["11–20"] += 1;
    else b["21+"] += 1;
  }
  return Object.entries(b).filter(([, v]) => v > 0);
}

/** Accuracy buckets (0–100). */
export function accuracyDistribution(rows) {
  const b = { "0–24%": 0, "25–49%": 0, "50–74%": 0, "75–100%": 0 };
  for (const r of rows) {
    const a = r.accuracy;
    if (a < 25) b["0–24%"] += 1;
    else if (a < 50) b["25–49%"] += 1;
    else if (a < 75) b["50–74%"] += 1;
    else b["75–100%"] += 1;
  }
  return Object.entries(b).filter(([, v]) => v > 0);
}

/** Per-branch performance. */
export function byBranch(rows) {
  const m = new Map();
  for (const r of rows) {
    const k = r.branch || "—";
    const e = m.get(k) || { branch: k, students: 0, score: 0, acc: 0 };
    e.students += 1;
    e.score += r.score;
    e.acc += r.accuracy;
    m.set(k, e);
  }
  return [...m.values()]
    .map((e) => ({
      branch: e.branch,
      students: e.students,
      avgScore: Math.round((e.score / e.students) * 10) / 10,
      avgAccuracy: Math.round(e.acc / e.students),
    }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

/** Top N performers (score, then accuracy, then time). */
export function topPerformers(rows, n = 5) {
  return [...rows]
    .sort((a, b) => b.score - a.score || b.accuracy - a.accuracy || a.time - b.time)
    .slice(0, n);
}

/** Format seconds → "m:ss". */
export function fmtTime(sec) {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
