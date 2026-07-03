import { NextResponse } from "next/server";
import { listCodingTests } from "@/lib/owlcoder";

export const dynamic = "force-dynamic";

/** Owl Coder module tests for the 3 placement batches (cached ~5 min). */
export async function GET(request) {
  const force = new URL(request.url).searchParams.get("refresh") === "1";
  try {
    const tests = await listCodingTests(force);
    return NextResponse.json({ ok: true, tests });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not reach the coding assessments source.", tests: [] }, { status: 502 });
  }
}
