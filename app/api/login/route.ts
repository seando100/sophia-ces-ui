import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { password } = await req.json();
  const correctPassword = process.env.CES_PASSWORD;

  if (password === correctPassword) {
    // Set correct cookie
    cookies().set("ces_access", "true", {
      httpOnly: true,
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 12 // 12 hours
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
