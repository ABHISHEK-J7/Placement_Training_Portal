import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND = process.env.TORII_BACKEND_URL || "https://toriiminds.com/backend/api";

// Only these batches are exposed in the attendance picker.
const ALLOWED_BATCHES = new Set(["PT_AI_READY_2027", "PT_IT_2027", "PT_NON_IT_2027"]);

/** Proxy the external batches list (avoids CORS; centralizes the integration). */
export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/get-batches`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "Batches source error." }, { status: 502 });
    }
    const data = await res.json();
    const batches = (Array.isArray(data) ? data : [])
      .filter((b) => ALLOWED_BATCHES.has(b.batch_name))
      .map((b) => ({
        id: b._id,
        name: b.batch_name,
        year: b.year ?? null,
        course: b.course_name ?? null,
        technologies: b.technology_names ?? [],
        trainer: b.primary_trainer ?? null,
        studentCount: Array.isArray(b.student_list) ? b.student_list.length : 0,
      }))
      .filter((b) => b.id && b.name)
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ ok: true, batches });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not reach the batches source." }, { status: 502 });
  }
}
