import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();

  // Delete the cookie by overwriting with empty value + maxAge: 0
  cookieStore.set({
    name: "ces_access",
    value: "",
    httpOnly: true,
    secure: true,
    path: "/",
    maxAge: 0
  });

  return NextResponse.json({ success: true });
}
