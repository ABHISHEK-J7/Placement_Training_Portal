import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND = process.env.TORII_BACKEND_URL || "https://toriiminds.com/backend/api";
const ALLOWED = new Set(["PT_AI_READY_2027", "PT_IT_2027", "PT_NON_IT_2027"]);

const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const joinNames = (v) => arr(v).filter(Boolean).join(", ");

/**
 * Assessment catalog proxy. `?type=grand` returns the grand tests; otherwise the
 * daily tests. Both are mapped to ONE unified shape so the UI is identical:
 *   { id, title, topic, module, technology, batch, batchList[], level, testType,
 *     college, questions, start, duration, topicCount, isGrand }
 *
 * Daily  → get-assessments (single-value fields).
 * Grand  → get-grand-assessments-by-technology (array fields; spans batches/topics).
 *          We fetch the technology IDs of the 3 placement batches and query by them.
 *
 * NOTE: get-assessments-list-by-topic returns HTTP 500 for every input (server bug);
 * get-assessments is a superset, so we use it and group on the client.
 */
export async function GET(request) {
  const type = new URL(request.url).searchParams.get("type") === "grand" ? "grand" : "daily";
  try {
    return type === "grand" ? await grand() : await daily();
  } catch {
    return NextResponse.json({ ok: false, error: "Could not reach the assessments source." }, { status: 502 });
  }
}

async function daily() {
  const res = await fetch(`${BACKEND}/get-assessments`, { cache: "no-store" });
  const data = await res.json().catch(() => null);
  const raw = Array.isArray(data) ? data : data?.result || data?.data || [];
  // Only the 3 placement batches — never surface other batches.
  const list = raw.filter((a) => ALLOWED.has(a.batch_name));
  const assessments = list.map((a) => ({
    id: a._id,
    title: a.topic_name || "—",
    topic: a.topic_name || "—",
    module: a.module_name || "—",
    technology: a.technology_name || "—",
    batch: a.batch_name || "—",
    batchList: [a.batch_name].filter(Boolean),
    level: a.level || "any",
    testType: a.test_type || "—",
    college: a.college || "—",
    questions: Number(a.questions_count) || 0,
    start: a.start_date_time || "",
    duration: null,
    topicCount: 1,
    isGrand: false,
  }));
  return NextResponse.json({ ok: true, assessments });
}

async function grand() {
  // 1) collect technology IDs of the 3 placement batches
  const bRes = await fetch(`${BACKEND}/get-batches`, { cache: "no-store" });
  const bData = await bRes.json().catch(() => null);
  const batches = Array.isArray(bData) ? bData : bData?.result || [];
  const techIds = [
    ...new Set(
      batches.filter((b) => ALLOWED.has(b.batch_name)).flatMap((b) => arr(b.technology)).filter(Boolean),
    ),
  ];
  if (techIds.length === 0) return NextResponse.json({ ok: true, assessments: [] });

  // 2) fetch grand tests for those technologies
  const gRes = await fetch(`${BACKEND}/get-grand-assessments-by-technology`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ technologyIds: techIds }),
    cache: "no-store",
  });
  const gData = await gRes.json().catch(() => null);
  const list = Array.isArray(gData) ? gData : gData?.result || gData?.data || [];

  // 3) keep only tests that touch one of the 3 batches; map to the unified shape
  const assessments = list
    .map((a) => {
      const inScopeBatches = arr(a.batch_name).filter((b) => ALLOWED.has(b));
      return {
        id: a._id,
        title: a.assessment_name || joinNames(a.topic_name) || "Grand Test",
        topic: joinNames(a.topic_name) || "—",
        module: joinNames(a.module_name) || "—",
        technology: joinNames(a.technology_name) || "—",
        batch: inScopeBatches.join(", ") || joinNames(a.batch_name),
        batchList: inScopeBatches,
        level: a.level || "any",
        testType: a.test_type || "—",
        college: a.college || "—",
        questions: Number(a.questions_count) || 0,
        start: a.start_date_time || "",
        duration: a.duration ?? null,
        topicCount: arr(a.topic_name).length,
        isGrand: true,
      };
    })
    .filter((a) => a.batchList.length > 0);

  return NextResponse.json({ ok: true, assessments });
}
