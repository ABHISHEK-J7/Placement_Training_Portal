import { NextResponse } from "next/server";
import { codingReport } from "@/lib/owlcoder";

export const dynamic = "force-dynamic";

/** Combined Owl Coder report for one module test. body = { test_id }. */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const testId = (body.test_id || body.id || "").trim();
  if (!testId) return NextResponse.json({ ok: false, error: "Select a test." }, { status: 400 });

  try {
    const { test, stats, students } = await codingReport(testId);
    return NextResponse.json({ ok: true, test, stats, students });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not reach the coding assessments source." }, { status: 502 });
  }
}
