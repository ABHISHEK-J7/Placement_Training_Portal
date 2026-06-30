import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND = process.env.TORII_BACKEND_URL || "https://toriiminds.com/backend/api";

/**
 * Proxy day-wise batch attendance. body = { batch_id }
 * Upstream returns { result: [ { roll_no, attendance: [{session,date,mode,status}], present, absent } ] }
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const batchId = (body.batch_id || "").trim();
  if (!batchId) {
    return NextResponse.json({ ok: false, error: "Select a batch." }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND}/get-day-wise-batch-attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batch_id: batchId }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (data && Array.isArray(data.result)) {
      return NextResponse.json({ ok: true, result: data.result });
    }
    // Upstream returns { error: "No students found for this batch" } etc.
    return NextResponse.json({ ok: true, result: [], note: data?.error || null });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not reach the attendance source." }, { status: 502 });
  }
}
