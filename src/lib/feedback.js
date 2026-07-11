import { programs, getProgram } from "@/data/programs";

/**
 * Class-centric trainer-feedback model.
 *
 * A passkey is generated per BATCH (training program). A student enters the
 * batch passcode, then rates EACH class of that batch on five parameters AND
 * leaves a mandatory comment for that class. Submissions are anonymous.
 *
 * Submission document:
 *   { batchSlug, batchName,
 *     classes: [ { class, ratings: {…5}, rating, comment } ],
 *     comment, rating, createdAt }
 *
 * `comment` (top level) is legacy: older records stored a single overall batch
 * comment there. New records leave it "" and carry per-class comments instead.
 *
 * Aggregation is class-centric. All signed-in staff see all feedback.
 */

export const RATING_MAX = 5;

/** The five parameters each class is rated on. */
export const CRITERIA = [
  { key: "classDelivery", label: "Class Delivery" },
  { key: "interaction", label: "Trainer Interaction" },
  { key: "explanation", label: "Explanation" },
  { key: "practical", label: "Practical Knowledge" },
  { key: "doubts", label: "Doubt Clarification" },
];

/** Rating scale labels (1–5). */
export const RATING_LABELS = {
  1: "Poor",
  2: "Average",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

/** Distinct, non-lunch classes for a training program. */
function distinctClasses(program) {
  const seen = [];
  for (const tt of program.timetables) {
    for (const slot of tt.slots) {
      if (slot.activity.toLowerCase() === "lunch") continue;
      if (!seen.includes(slot.activity)) seen.push(slot.activity);
    }
  }
  return seen;
}

/** Batches available for feedback = the training programs + their classes. */
export const FEEDBACK_BATCHES = programs.map((p) => ({
  slug: p.slug,
  name: p.title,
  classes: distinctClasses(p),
}));

export function classesForBatch(slug) {
  const p = getProgram(slug);
  return p ? distinctClasses(p) : [];
}

export function batchName(slug) {
  const p = getProgram(slug);
  return p ? p.title : slug;
}

/** Average each of the five criteria across a set of class entries. */
export function criteriaAverages(entries) {
  const acc = Object.fromEntries(CRITERIA.map((c) => [c.key, { sum: 0, n: 0 }]));
  for (const e of entries) {
    const rt = e.ratings || {};
    for (const c of CRITERIA) {
      const v = Number(rt[c.key]);
      if (Number.isFinite(v) && v > 0) {
        acc[c.key].sum += v;
        acc[c.key].n += 1;
      }
    }
  }
  return CRITERIA.map((c) => ({
    key: c.key,
    label: c.label,
    avg: acc[c.key].n ? acc[c.key].sum / acc[c.key].n : 0,
  }));
}

/** All submissions are visible to any signed-in staff user. */
export function scopeFeedback(user, submissions) {
  return user ? submissions : [];
}

/** One row per batch: responses + average rating. */
export function aggregateBatches(submissions) {
  const map = new Map();
  for (const s of submissions) {
    const b = map.get(s.batchSlug) || { slug: s.batchSlug, name: s.batchName, responses: 0, sum: 0, n: 0 };
    b.responses += 1;
    for (const c of s.classes || []) {
      b.sum += Number(c.rating) || 0;
      b.n += 1;
    }
    map.set(s.batchSlug, b);
  }
  return [...map.values()]
    .map((b) => ({
      slug: b.slug,
      name: b.name,
      responses: b.responses,
      avgRating: b.n ? b.sum / b.n : 0,
    }))
    .sort((a, b) => b.avgRating - a.avgRating);
}

/** Detail for one batch: per-class aggregation + overall comments. */
export function batchDetail(submissions, slug) {
  const mine = submissions.filter((s) => s.batchSlug === slug);
  const name = mine[0]?.batchName || batchName(slug);

  const byClassMap = new Map();
  for (const s of mine) {
    for (const c of s.classes || []) {
      const entry = byClassMap.get(c.class) || { class: c.class, entries: [] };
      entry.entries.push(c);
      byClassMap.set(c.class, entry);
    }
  }
  const byClass = [...byClassMap.values()]
    .map((e) => {
      const ratings = e.entries.map((x) => Number(x.rating) || 0);
      const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      return {
        class: e.class,
        responses: e.entries.length,
        avgRating: avg,
        criteria: criteriaAverages(e.entries),
      };
    })
    .sort((a, b) => b.avgRating - a.avgRating);

  const comments = collectComments(mine);

  const allEntries = mine.flatMap((s) => s.classes || []);
  const overall = allEntries.length
    ? allEntries.reduce((sum, c) => sum + (Number(c.rating) || 0), 0) / allEntries.length
    : 0;

  return { slug, name, responses: mine.length, overall, byClass, comments };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Stable date key (local) for grouping a submission by the day it was given. */
export function dateKey(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Human-readable date label, e.g. "29 Jun 2026". */
export function dateLabel(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Distinct submission dates (newest first) with counts. */
export function distinctDates(submissions) {
  const m = new Map();
  for (const s of submissions) {
    const key = dateKey(s.createdAt);
    if (!key) continue;
    const e = m.get(key) || { key, label: dateLabel(s.createdAt), count: 0 };
    e.count += 1;
    m.set(key, e);
  }
  return [...m.values()].sort((a, b) => b.key.localeCompare(a.key));
}

/** Flatten submissions into one row per class entry (for tables/exports). */
export function flattenEntries(submissions) {
  return submissions.flatMap((s) =>
    (s.classes || []).map((c) => ({
      batchSlug: s.batchSlug,
      batchName: s.batchName,
      class: c.class,
      rating: Number(c.rating) || 0,
      ratings: c.ratings || {},
      comment: c.comment || "",
      createdAt: s.createdAt,
    })),
  );
}

/**
 * All individual comments across submissions, newest first. New records carry a
 * comment per class; legacy records carry a single overall batch comment (shown
 * with class "Overall"). Each row: { class, text, rating, batchName, batchSlug, createdAt }.
 */
export function collectComments(submissions) {
  const out = [];
  for (const s of submissions) {
    let perClass = false;
    for (const c of s.classes || []) {
      const text = (c.comment || "").trim();
      if (!text) continue;
      perClass = true;
      out.push({
        class: c.class,
        text,
        rating: Number(c.rating) || 0,
        batchName: s.batchName,
        batchSlug: s.batchSlug,
        createdAt: s.createdAt,
      });
    }
    const overall = (s.comment || "").trim();
    if (overall && !perClass) {
      out.push({
        class: "Overall",
        text: overall,
        rating: Number(s.rating) || 0,
        batchName: s.batchName,
        batchSlug: s.batchSlug,
        createdAt: s.createdAt,
      });
    }
  }
  return out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/** Distinct class names present in a set of collected comments (for filters). */
export function commentClasses(comments) {
  const seen = [];
  for (const c of comments) if (!seen.includes(c.class)) seen.push(c.class);
  return seen.sort((a, b) => a.localeCompare(b));
}

/** Aggregate by class across all batches: responses + average + criteria. */
export function byClass(submissions) {
  const m = new Map();
  for (const s of submissions) {
    for (const c of s.classes || []) {
      const e = m.get(c.class) || { class: c.class, entries: [] };
      e.entries.push(c);
      m.set(c.class, e);
    }
  }
  return [...m.values()]
    .map((e) => ({
      class: e.class,
      responses: e.entries.length,
      avgRating: e.entries.reduce((a, c) => a + (Number(c.rating) || 0), 0) / e.entries.length,
      criteria: criteriaAverages(e.entries),
    }))
    .sort((a, b) => b.avgRating - a.avgRating);
}

/** Distribution of class ratings into 1–5 buckets (rounded). */
export function ratingDistribution(submissions) {
  const buckets = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const s of submissions) {
    for (const c of s.classes || []) {
      const r = Math.round(Number(c.rating) || 0);
      if (r >= 1 && r <= 5) buckets[r] += 1;
    }
  }
  return buckets;
}

/** Batch × class average-rating matrix. */
export function batchClassMatrix(submissions) {
  const cells = new Map();
  const batches = [];
  const classes = [];
  for (const s of submissions) {
    if (!batches.includes(s.batchName)) batches.push(s.batchName);
    for (const c of s.classes || []) {
      if (!classes.includes(c.class)) classes.push(c.class);
      const key = `${s.batchName}||${c.class}`;
      const cell = cells.get(key) || { sum: 0, n: 0 };
      cell.sum += Number(c.rating) || 0;
      cell.n += 1;
      cells.set(key, cell);
    }
  }
  return {
    batches,
    classes,
    get(batch, klass) {
      const c = cells.get(`${batch}||${klass}`);
      return c && c.n ? c.sum / c.n : null;
    },
  };
}

/** Portal-wide rollups for the metric cards/charts. */
export function feedbackOverview(submissions) {
  const batches = new Set();
  const classes = new Set();
  const entries = [];
  const byBatch = new Map();
  for (const s of submissions) {
    batches.add(s.batchSlug);
    byBatch.set(s.batchName, (byBatch.get(s.batchName) || 0) + 1);
    for (const c of s.classes || []) {
      classes.add(c.class);
      entries.push(c);
    }
  }
  const avg = entries.length
    ? entries.reduce((sum, c) => sum + (Number(c.rating) || 0), 0) / entries.length
    : 0;

  return {
    responses: submissions.length,
    batches: batches.size,
    classes: classes.size,
    avgRating: avg,
    criteria: criteriaAverages(entries),
    responsesByBatch: [...byBatch.entries()].sort((a, b) => b[1] - a[1]),

  };
}
