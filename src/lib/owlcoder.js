/**
 * Owl Coder (coding assessments) integration — server side only.
 * Separate platform at owlcoder.technicalhub.io. It shares the same course/
 * technology/batch ids as the Torii backend, so we resolve the 3 placement
 * batches directly. Module tests are assigned per (technology, batch); there is
 * no "all tests for a batch" endpoint, so we enumerate technologies × batches
 * and cache the result briefly.
 */

const OWL = process.env.OWLCODER_URL || "https://owlcoder.technicalhub.io:3001/api";
const COURSE = "669a2fb7c03fc56b320befa7"; // Placement Training

// Owl Coder assigns coding/SQL tests to its OWN "CODING_*" batches (distinct ids
// from the Torii backend). We map them back to the 3 placement batch names.
export const CODING_BATCHES = {
  PT_AI_READY_2027: "6a3cb50e418f42b929aceb7d", // CODING_AI_READY_ENGINEER_PT_2027
  PT_IT_2027: "6a3cb5a9418f42b929acf280", // CODING_IT_PT_2027
  PT_NON_IT_2027: "6a3cb5f3418f42b929acf8f0", // CODING_NON_IT_PT_2027
};

async function owlPost(path, body, tries = 2) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${OWL}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(12000), // never let one hung call block the whole enumeration
      });
      if (r.ok) return await r.json().catch(() => null);
    } catch {
      /* time out / network — retry once */
    }
  }
  return null;
}

// Owl Coder's `attempted` boolean and `*_result` strings are unreliable (they read
// "Not Attempted" even when a student has section status, submit timestamps and
// scores). Detect real attempts from the actual activity signals instead.
const PASS_PCT = 40;
export function codingAttempted(s) {
  return Boolean(
    Number(s.mcq_section_status) || Number(s.coding_section_status) ||
    s.startedAt || s.mcq_submittedAt || s.coding_submittedAt ||
    Number(s.mcq_total_correct) || Number(s.coding_earned_score) ||
    Number(s.mcq_percentage) || Number(s.coding_percentage),
  );
}

/** Normalize a report student: real `attempted` + results recomputed from scores. */
function normalizeStudent(s, test) {
  const attempted = codingAttempted(s);
  const mcq = Math.round(Number(s.mcq_percentage) || 0);
  const coding = Math.round(Number(s.coding_percentage) || 0);
  const parts = [];
  if (test?.has_mcq) parts.push(mcq);
  if (test?.has_coding) parts.push(coding);
  const overall = parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0;
  const band = (pct) => (pct >= PASS_PCT ? "Pass" : "Fail");
  return {
    ...s,
    mcq_percentage: mcq,
    coding_percentage: coding,
    overall_percentage: overall,
    attempted,
    mcq_result: !test?.has_mcq ? "-" : !attempted ? "Not Attempted" : band(mcq),
    coding_result: !test?.has_coding ? "-" : !attempted ? "Not Attempted" : band(coding),
    overall_result: !attempted ? "Not Attempted" : band(overall),
  };
}

let cache = { at: 0, tests: null };
const CACHE_MS = 5 * 60 * 1000;

/** All coding module tests for the 3 placement batches, with assigned/attempted counts. */
export async function listCodingTests(force = false) {
  if (!force && cache.tests && Date.now() - cache.at < CACHE_MS) return cache.tests;

  const techs = await owlPost("get-technology-by-course-id", { course_id: COURSE });
  const techList = Array.isArray(techs) ? techs : [];
  const batchEntries = Object.entries(CODING_BATCHES);

  // Enumerate module tests across (technology × batch); dedupe by test id.
  const byTest = new Map();
  await Promise.all(
    techList.flatMap((t) =>
      batchEntries.map(async ([bname, bid]) => {
        const tests = await owlPost("get-coding-module-tests-for-report", { course_id: COURSE, technology_id: t._id, batch: bid });
        for (const test of Array.isArray(tests) ? tests : []) {
          const e = byTest.get(test._id) || {
            id: test._id,
            name: test.module_test_name || "Coding Test",
            module: test.module_name || "—",
            technology: t.technology_name || "—",
            hasMcq: !!test.has_mcq,
            hasCoding: !!test.has_coding,
            start: test.start_date_time || "",
            batches: [],
          };
          if (!e.batches.some((b) => b.id === bid)) e.batches.push({ name: bname, id: bid });
          byTest.set(test._id, e);
        }
      }),
    ),
  );

  const tests = [...byTest.values()];
  // Aggregate assigned/attempted per test from the batch reports.
  await Promise.all(
    tests.map(async (t) => {
      let assigned = 0;
      let attempted = 0;
      await Promise.all(
        t.batches.map(async (b) => {
          const rep = await owlPost("get-coding-module-test-report", { test_id: t.id, batch: b.id });
          if (rep?.stats) assigned += rep.stats.total_assigned || 0;
          for (const s of rep?.students || []) if (codingAttempted(s)) attempted += 1; // real signal, not stats.attempted
        }),
      );
      t.assigned = assigned;
      t.attempted = attempted;
    }),
  );

  tests.sort((a, b) => new Date(b.start || 0) - new Date(a.start || 0));
  if (tests.length) cache = { at: Date.now(), tests }; // don't cache a transient empty result
  return tests;
}

/** Combined report for one test across the 3 batches: { test, stats, students }. */
export async function codingReport(testId) {
  const batchEntries = Object.entries(CODING_BATCHES);
  const reports = await Promise.all(
    batchEntries.map(([bname, bid]) => owlPost("get-coding-module-test-report", { test_id: testId, batch: bid }).then((r) => ({ bname, r }))),
  );

  let test = null;
  let totalAssigned = 0;
  let totalViolations = 0;
  const students = [];
  for (const { bname, r } of reports) {
    if (!r) continue;
    if (!test && r.test) test = r.test;
    if (r.stats) { totalAssigned += r.stats.total_assigned || 0; totalViolations += r.stats.total_violations || 0; }
    for (const st of r.students || []) students.push(normalizeStudent({ ...st, batch: bname }, r.test));
  }

  const done = students.filter((s) => s.attempted);
  const passed = students.filter((s) => s.overall_result === "Pass").length;
  const failed = students.filter((s) => s.overall_result === "Fail").length;
  const avg = (fn) => (done.length ? Math.round(done.reduce((a, s) => a + (Number(fn(s)) || 0), 0) / done.length) : 0);
  const stats = {
    total_assigned: totalAssigned || students.length,
    attempted: done.length,
    not_attempted: students.length - done.length,
    passed,
    failed,
    pass_rate: done.length ? Math.round((passed / done.length) * 100) : 0,
    avg_mcq_percentage: avg((s) => s.mcq_percentage),
    avg_coding_percentage: avg((s) => s.coding_percentage),
    total_violations: totalViolations,
  };
  return { test, stats, students };
}

/** Individual student report (the eye-icon modal). */
export async function codingStudent(resultId) {
  return owlPost("get-coding-module-test-student-report", { result_id: resultId });
}
