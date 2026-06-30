import { NextResponse } from "next/server";
import { collection } from "@/lib/mongodb";
import { RATING_MAX, CRITERIA, classesForBatch } from "@/lib/feedback";
import { getFeedbackLock } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** List all feedback submissions (for the staff dashboard). */
export async function GET() {
  try {
    const fb = await collection("feedback");
    const records = await fb.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ ok: true, records });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}

/**
 * Public: submit one batch feedback (passkey-gated, anonymous).
 * body = { code, classes: [{ class, ratings:{…5} }], comment }
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (await getFeedbackLock()) {
    return NextResponse.json(
      { ok: false, locked: true, error: "Feedback is locked. Please ask the admin to unlock it." },
      { status: 423 },
    );
  }

  const code = (body.code || "").trim().toUpperCase();
  const comment = (body.comment || "").trim();
  const incomingClasses = Array.isArray(body.classes) ? body.classes : [];

  if (!code) {
    return NextResponse.json({ ok: false, error: "Missing passkey." }, { status: 400 });
  }
  if (!comment) {
    return NextResponse.json({ ok: false, error: "A final comment is required." }, { status: 400 });
  }

  try {
    const passkeys = await collection("passkeys");
    const pk = await passkeys.findOne({ code });
    if (!pk) {
      return NextResponse.json({ ok: false, error: "Invalid passkey." }, { status: 401 });
    }

    const expected = classesForBatch(pk.batchSlug);
    if (incomingClasses.length !== expected.length) {
      return NextResponse.json({ ok: false, error: "Please rate every class." }, { status: 400 });
    }

    // Validate each class entry: known class + all five criteria (1..5).
    const classes = [];
    for (const c of incomingClasses) {
      const className = (c.class || "").trim();
      if (!expected.includes(className)) {
        return NextResponse.json({ ok: false, error: `Unknown class "${className}".` }, { status: 400 });
      }
      const ratings = {};
      for (const crit of CRITERIA) {
        const v = Number((c.ratings || {})[crit.key]);
        if (!Number.isFinite(v) || v < 1 || v > RATING_MAX) {
          return NextResponse.json(
            { ok: false, error: `Rate "${crit.label}" for ${className}.` },
            { status: 400 },
          );
        }
        ratings[crit.key] = v;
      }
      const rating = CRITERIA.reduce((s, crit) => s + ratings[crit.key], 0) / CRITERIA.length;
      classes.push({ class: className, ratings, rating });
    }

    const overall = classes.reduce((s, c) => s + c.rating, 0) / classes.length;

    const fb = await collection("feedback");
    await fb.insertOne({
      batchSlug: pk.batchSlug,
      batchName: pk.batchName,
      classes,
      comment,
      rating: overall,
      code,
      createdAt: Date.now(),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
