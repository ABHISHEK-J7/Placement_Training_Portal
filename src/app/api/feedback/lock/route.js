import { NextResponse } from "next/server";
import { getFeedbackLock, setFeedbackLock } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Read the current lock state. */
export async function GET() {
  try {
    return NextResponse.json({ ok: true, locked: await getFeedbackLock() });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}

/** Set the lock state (admin). body = { locked: boolean } */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  try {
    const locked = await setFeedbackLock(!!body.locked);
    return NextResponse.json({ ok: true, locked });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
