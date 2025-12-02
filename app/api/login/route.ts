import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { password } = await req.json();
  const correctPassword = process.env.CES_PASSWORD;

  if (password === correctPassword) {
    // Correct usage for Next 16: cookies() is NOT async
    const cookieStore = cookies();

    cookieStore.set("ces_access", "true", {
      httpOnly: true,
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 12, // 12 hours
      sameSite: "lax"
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
