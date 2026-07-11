import { NextResponse } from "next/server";
import { collection } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const norm = (t) => (t || "").trim().toUpperCase();

/**
 * Per-student active/inactive status, keyed by TORII NUMBER (the universal join
 * key across attendance/assessments/coding). We only persist students whose
 * status has been set; everyone else is active by default. GET returns the list
 * of inactive Torii numbers so the client can treat the rest as active.
 */
export async function GET() {
  try {
    const col = await collection("studentStatus");
    const docs = await col.find({ active: false }, { projection: { _id: 0, torii: 1 } }).toArray();
    return NextResponse.json({ ok: true, inactive: docs.map((d) => d.torii).filter(Boolean) });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}

/**
 * Update status. Three modes:
 *   { torii, active }                        → toggle one student
 *   { continuing: [...], allTorii: [...] }   → mark the continuing list active,
 *                                              everyone else in allTorii inactive
 *   { reset: true }                          → clear all (everyone active again)
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  try {
    const col = await collection("studentStatus");
    const now = Date.now();
    const by = (body.updatedBy || "").toString().slice(0, 120);

    if (body.reset === true) {
      await col.deleteMany({});
      return NextResponse.json({ ok: true, inactive: [] });
    }

    // Bulk continuing-list apply.
    if (Array.isArray(body.allTorii)) {
      const keep = new Set((body.continuing || []).map(norm).filter(Boolean));
      const all = [...new Set(body.allTorii.map(norm).filter(Boolean))];
      const ops = all.map((torii) => ({
        updateOne: {
          filter: { torii },
          update: { $set: { torii, active: keep.has(torii), updatedAt: now, updatedBy: by } },
          upsert: true,
        },
      }));
      if (ops.length) await col.bulkWrite(ops, { ordered: false });
      const inactive = all.filter((t) => !keep.has(t));
      return NextResponse.json({ ok: true, inactive, active: keep.size, total: all.length });
    }

    // Single toggle.
    const torii = norm(body.torii);
    if (!torii) {
      return NextResponse.json({ ok: false, error: "Missing torii." }, { status: 400 });
    }
    const active = body.active !== false; // default active unless explicitly false
    await col.updateOne(
      { torii },
      { $set: { torii, active, updatedAt: now, updatedBy: by } },
      { upsert: true },
    );
    return NextResponse.json({ ok: true, torii, active });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
