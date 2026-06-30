import { NextResponse } from "next/server";
import { collection } from "@/lib/mongodb";
import { verifyPassword } from "@/lib/password";
import { ADMIN_CREDENTIAL } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const username = (body.username || "").trim();
  const password = body.password || "";

  if (!username || !password) {
    return NextResponse.json({ ok: false, error: "Enter your username and password." }, { status: 400 });
  }

  // Built-in administrator.
  if (username === ADMIN_CREDENTIAL.username && password === ADMIN_CREDENTIAL.password) {
    return NextResponse.json({
      ok: true,
      user: { username, name: "Administrator", role: "admin", department: null },
    });
  }

  try {
    const users = await collection("users");
    const found = await users.findOne({ usernameLower: username.toLowerCase() });
    if (found && verifyPassword(password, found.password)) {
      return NextResponse.json({
        ok: true,
        user: {
          username: found.username,
          name: found.name,
          role: found.role,
          department: found.department ?? null,
        },
      });
    }
    return NextResponse.json({ ok: false, error: "Invalid username or password." }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error. Try again." }, { status: 500 });
  }
}
