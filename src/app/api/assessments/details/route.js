import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND = process.env.TORII_BACKEND_URL || "https://toriiminds.com/backend/api";

/**
 * Per-assessment student results. body = { assessment, type? }.
 *   type "grand" → get-student-grand-assessment-details
 *   else         → get-student-assessment-details
 * Upstream returns a bare array of:
 *   { roll_no, first_name, college, branch:[…], total_score, total_time,
 *     correct_answer_count, wrong_answer_count }
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const assessment = (body.assessment || body.id || "").trim();
  if (!assessment) {
    return NextResponse.json({ ok: false, error: "Select an assessment." }, { status: 400 });
  }
  const endpoint = body.type === "grand" ? "get-student-grand-assessment-details" : "get-student-assessment-details";
  // Send both key names so the grand endpoint matches whichever it expects.
  const payload = body.type === "grand" ? { assessment, grand_assessment: assessment } : { assessment };

  try {
    const res = await fetch(`${BACKEND}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    const result = Array.isArray(data) ? data : data?.result || [];
    return NextResponse.json({ ok: true, result });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not reach the assessments source." }, { status: 502 });
  }
}
