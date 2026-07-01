import { NextResponse } from "next/server";
import { collection } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const BACKEND = process.env.TORII_BACKEND_URL || "https://toriiminds.com/backend/api";
const ALLOWED = new Set(["PT_AI_READY_2027", "PT_IT_2027", "PT_NON_IT_2027"]);
const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

/**
 * Batch roster — sourced LIVE from the backend, dumped into MongoDB, then served
 * from MongoDB. This makes the batch student counts dynamic (they match the
 * attendance roster: student_list length) and persisted, instead of relying on
 * the manually-imported directory Excel (which can be stale).
 */
export async function GET() {
  let live = [];
  try {
    const res = await fetch(`${BACKEND}/get-batches`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    const list = Array.isArray(data) ? data : data?.result || [];
    live = list
      .filter((b) => ALLOWED.has(b.batch_name))
      .map((b) => ({
        id: b._id,
        name: b.batch_name,
        studentCount: Array.isArray(b.student_list) ? b.student_list.length : Number(b.batch_count) || 0,
        rolls: arr(b.student_list),
        course: b.course_name || "Placement Training",
        year: b.year || "",
        trainer: b.primary_trainer || "",
      }))
      .filter((b) => b.id && b.name);
  } catch {
    live = [];
  }

  // Dump the live data into MongoDB (upsert by batch id).
  if (live.length) {
    try {
      const col = await collection("batches");
      await col.bulkWrite(
        live.map((b) => ({
          updateOne: { filter: { id: b.id }, update: { $set: { ...b, syncedAt: Date.now() } }, upsert: true },
        })),
        { ordered: false },
      );
    } catch {
      /* if the dump fails, still serve live below */
    }
  }

  // Serve from MongoDB; fall back to the live payload if Mongo is unavailable.
  try {
    const col = await collection("batches");
    const stored = await col.find({ name: { $in: [...ALLOWED] } }, { projection: { _id: 0 } }).toArray();
    if (stored.length) {
      stored.sort((a, b) => a.name.localeCompare(b.name));
      return NextResponse.json({ ok: true, batches: stored });
    }
  } catch {
    /* fall through to live */
  }
  live.sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ ok: true, batches: live });
}
