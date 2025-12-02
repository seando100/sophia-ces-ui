import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json();
  const correctPassword = process.env.CES_PASSWORD;

  if (password === correctPassword) {
    const res = NextResponse.json({ ok: true });

    res.cookies.set("ces_auth", password, {
      httpOnly: true,
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 12 // 12 hours
    });

    return res;
  }

  return new NextResponse("Unauthorized", { status: 401 });
}
