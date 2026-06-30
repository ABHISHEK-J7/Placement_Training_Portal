import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { collection } from "@/lib/mongodb";
import { FEEDBACK_BATCHES } from "@/lib/feedback";

export const dynamic = "force-dynamic";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function genCode(len = 6) {
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** List all passkeys. */
export async function GET() {
  try {
    const passkeys = await collection("passkeys");
    const list = await passkeys
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    return NextResponse.json({ ok: true, passkeys: list });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}

/** Create a passkey for a trainer + class. */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const batchSlug = (body.batchSlug || "").trim();
  let code = (body.code || "").trim().toUpperCase();

  const batch = FEEDBACK_BATCHES.find((b) => b.slug === batchSlug);
  if (!batch) {
    return NextResponse.json({ ok: false, error: "Choose a valid batch." }, { status: 400 });
  }

  try {
    const passkeys = await collection("passkeys");

    if (code) {
      const dup = await passkeys.findOne({ code });
      if (dup) {
        return NextResponse.json({ ok: false, error: "That passkey is already in use." }, { status: 409 });
      }
    } else {
      // Generate a unique code.
      for (let i = 0; i < 8; i++) {
        const candidate = genCode();
        if (!(await passkeys.findOne({ code: candidate }))) {
          code = candidate;
          break;
        }
      }
    }

    const passkey = { code, batchSlug: batch.slug, batchName: batch.name, createdAt: Date.now() };
    await passkeys.insertOne({ ...passkey });
    return NextResponse.json({ ok: true, passkey });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
