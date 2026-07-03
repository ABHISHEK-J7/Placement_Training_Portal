import { NextResponse } from "next/server";
import { collection } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const BACKEND = process.env.TORII_BACKEND_URL || "https://toriiminds.com/backend/api";
const ALLOWED = new Set(["PT_AI_READY_2027", "PT_IT_2027", "PT_NON_IT_2027"]);
const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const upper = (s) => (s || "").trim().toUpperCase();
const branchOf = (r) => (Array.isArray(r.branch) ? r.branch[0] : r.branch) || "";
const CACHE_MS = 5 * 60 * 1000;

async function post(path, body) {
  try {
    const r = await fetch(`${BACKEND}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    return await r.json().catch(() => null);
  } catch { return null; }
}
async function get(path) {
  try { const r = await fetch(`${BACKEND}/${path}`, { cache: "no-store" }); return await r.json().catch(() => null); } catch { return null; }
}

/**
 * Unified student roster keyed by Torii number:
 *   { torii, batch, department, name, usn }
 *
 * The attendance/batch APIs only give Torii numbers, so a student's DEPARTMENT is
 * resolved from (in priority) the imported directory (by Torii) → the assessment
 * API (Torii → branch). This is what lets HODs see attendance/assessment data
 * scoped to their department. Result is dumped into MongoDB (`roster`) and served
 * from there for ~5 min to keep page loads fast.
 */
export async function GET(request) {
  const force = new URL(request.url).searchParams.get("refresh") === "1";

  // Serve cached roster if fresh.
  if (!force) {
    try {
      const col = await collection("roster");
      const newest = await col.find({}).sort({ syncedAt: -1 }).limit(1).toArray();
      if (newest[0] && Date.now() - (newest[0].syncedAt || 0) < CACHE_MS) {
        const list = await col.find({}, { projection: { _id: 0 } }).toArray();
        return NextResponse.json({ ok: true, roster: list, cached: true });
      }
    } catch { /* fall through to rebuild */ }
  }

  // Base roster: Torii + batch from get-batches.
  const batchesData = await get("get-batches");
  const bl = Array.isArray(batchesData) ? batchesData : batchesData?.result || [];
  const scopedBatches = bl.filter((b) => ALLOWED.has(b.batch_name));
  const roster = new Map();
  for (const b of scopedBatches)
    for (const roll of arr(b.student_list)) {
      const t = upper(roll);
      if (t && !roster.has(t)) roster.set(t, { torii: roll, batch: b.batch_name, department: "", name: "", usn: "" });
    }

  // Assessment-derived department + name (authoritative live source by Torii).
  const techs = [...new Set(scopedBatches.flatMap((b) => arr(b.technology)))];
  const grandList = techs.length ? await post("get-grand-assessments-by-technology", { technologyIds: techs }) : null;
  const grand = (Array.isArray(grandList) ? grandList : grandList?.result || []).filter((g) => arr(g.batch_name).some((b) => ALLOWED.has(b)));
  const dailyAll = await get("get-assessments");
  const daily = (Array.isArray(dailyAll) ? dailyAll : dailyAll?.result || []).filter((a) => ALLOWED.has(a.batch_name));
  const calls = [
    ...grand.map((g) => ["get-student-grand-assessment-details", { assessment: g._id, grand_assessment: g._id }]),
    ...daily.map((a) => ["get-student-assessment-details", { assessment: a._id }]),
  ];
  const results = await Promise.all(calls.map(([p, b]) => post(p, b)));
  for (const res of results)
    for (const r of Array.isArray(res) ? res : []) {
      const e = roster.get(upper(r.roll_no));
      if (!e) continue;
      if (r.first_name && !e.name) e.name = r.first_name;
      const br = branchOf(r);
      if (br && !e.department) e.department = br;
    }

  // Owl Coder report carries branch (department) for the FULL assigned roster —
  // the best available live source, so it fills departments the daily/grand
  // assessments haven't covered.
  try {
    const { listCodingTests, codingReport } = await import("@/lib/owlcoder");
    const tests = await listCodingTests();
    if (tests[0]) {
      const rep = await codingReport(tests[0].id);
      for (const s of rep.students || []) {
        const e = roster.get(upper(s.roll_no));
        if (!e) continue;
        if (s.first_name && !e.name) e.name = s.first_name;
        if (s.branch && !e.department) e.department = s.branch;
      }
    }
  } catch { /* owl coder optional */ }

  // Directory (imported Excel) — best source when it carries Torii numbers.
  try {
    const dir = await (await collection("students")).find({}, { projection: { _id: 0 } }).toArray();
    for (const s of dir)
      if (s.torii) {
        const e = roster.get(upper(s.torii));
        if (e) { if (s.usn) e.usn = s.usn; if (s.name) e.name = s.name; if (s.department) e.department = s.department; }
      }
  } catch { /* directory optional */ }

  const list = [...roster.values()];

  // Dump into MongoDB (best effort).
  try {
    if (list.length) {
      const col = await collection("roster");
      const now = Date.now();
      await col.bulkWrite(
        list.map((r) => ({ updateOne: { filter: { torii: r.torii }, update: { $set: { ...r, syncedAt: now } }, upsert: true } })),
        { ordered: false },
      );
    }
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true, roster: list });
}
