import { NextResponse } from "next/server";
import { collection } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function DELETE(_request, { params }) {
  try {
    const passkeys = await collection("passkeys");
    await passkeys.deleteOne({ code: decodeURIComponent(params.code).toUpperCase() });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
