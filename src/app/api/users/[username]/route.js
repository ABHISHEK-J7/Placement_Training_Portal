import { NextResponse } from "next/server";
import { collection } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function DELETE(_request, { params }) {
  try {
    const users = await collection("users");
    await users.deleteOne({ usernameLower: decodeURIComponent(params.username).toLowerCase() });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
