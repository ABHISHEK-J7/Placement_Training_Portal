import { NextResponse } from "next/server";
import { collection } from "@/lib/mongodb";
import { classesForBatch } from "@/lib/feedback";
import { getFeedbackLock } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Public: validate a batch passkey and return its name + classes. */
export async function GET(request) {
  const code = (new URL(request.url).searchParams.get("code") || "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ ok: false, error: "Enter a passkey." }, { status: 400 });
  }
  try {
    const passkeys = await collection("passkeys");
    const pk = await passkeys.findOne({ code }, { projection: { _id: 0 } });
    if (!pk) {
      return NextResponse.json({ ok: false, error: "Invalid passkey." }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      locked: await getFeedbackLock(),
      batchSlug: pk.batchSlug,
      batchName: pk.batchName,
      classes: classesForBatch(pk.batchSlug),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
