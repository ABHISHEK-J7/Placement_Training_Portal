import { NextResponse } from "next/server";
import { codingStudent } from "@/lib/owlcoder";

export const dynamic = "force-dynamic";

/** Individual Owl Coder student report. body = { result_id }. */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const resultId = (body.result_id || "").trim();
  if (!resultId) return NextResponse.json({ ok: false, error: "Missing result id." }, { status: 400 });

  try {
    const data = await codingStudent(resultId);
    return NextResponse.json({ ok: true, report: data });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not reach the coding assessments source." }, { status: 502 });
  }
}
