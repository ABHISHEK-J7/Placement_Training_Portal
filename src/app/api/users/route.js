import { NextResponse } from "next/server";
import { collection } from "@/lib/mongodb";
import { hashPassword } from "@/lib/password";
import { ADMIN_CREDENTIAL } from "@/lib/roles";

export const dynamic = "force-dynamic";

/** List users (no password hashes). */
export async function GET() {
  try {
    const users = await collection("users");
    const list = await users
      .find({}, { projection: { _id: 0, password: 0, usernameLower: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    return NextResponse.json({ ok: true, users: list });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}

/** Create a user. */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const username = (body.username || "").trim();
  const name = (body.name || "").trim();
  const password = body.password || "";
  const role = body.role;
  const department = role === "hod" ? body.department : null;

  if (!username || !name || !password || !role) {
    return NextResponse.json({ ok: false, error: "All fields are required." }, { status: 400 });
  }
  if (role === "hod" && !department) {
    return NextResponse.json({ ok: false, error: "Select a department for the HOD." }, { status: 400 });
  }
  if (username.toLowerCase() === ADMIN_CREDENTIAL.username.toLowerCase()) {
    return NextResponse.json({ ok: false, error: "That username is reserved." }, { status: 409 });
  }

  try {
    const users = await collection("users");
    const exists = await users.findOne({ usernameLower: username.toLowerCase() });
    if (exists) {
      return NextResponse.json({ ok: false, error: "That username already exists." }, { status: 409 });
    }
    await users.insertOne({
      username,
      usernameLower: username.toLowerCase(),
      name,
      password: hashPassword(password),
      role,
      department,
      createdAt: Date.now(),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
