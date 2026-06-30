import { NextResponse } from "next/server";
import { collection } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const normUsn = (u) => (u || "").trim().toUpperCase();

/** List the student directory (usn → name + department). */
export async function GET() {
  try {
    const students = await collection("students");
    const list = await students.find({}, { projection: { _id: 0 } }).toArray();
    return NextResponse.json({ ok: true, students: list });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}

/** Import directory rows. body = { students: [{ name, usn, department }] }. Upserts by USN. */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const rows = (body.students || [])
    .map((r) => ({
      usn: normUsn(r.usn),
      torii: normUsn(r.torii),
      name: (r.name || "").trim(),
      department: (r.department || "").trim(),
      batch: (r.batch || "").trim(),
    }))
    .filter((r) => r.usn && r.department);

  if (rows.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No valid rows. Expecting USN + Department (Name optional)." },
      { status: 400 },
    );
  }

  try {
    const students = await collection("students");
    const ops = rows.map((r) => ({
      updateOne: {
        filter: { usn: r.usn },
        update: { $set: { usn: r.usn, torii: r.torii, name: r.name, department: r.department, batch: r.batch } },
        upsert: true,
      },
    }));
    const res = await students.bulkWrite(ops, { ordered: false });
    return NextResponse.json({
      ok: true,
      added: res.upsertedCount ?? 0,
      updated: res.modifiedCount ?? 0,
      total: rows.length,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}

/** Clear the directory. */
export async function DELETE() {
  try {
    const students = await collection("students");
    await students.deleteMany({});
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
