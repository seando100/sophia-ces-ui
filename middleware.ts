import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const password = process.env.CES_PASSWORD;
  const cookie = req.cookies.get("ces_auth");

  const isLoggedIn = cookie?.value === password;

  // Allow access to the login page and static assets
  if (req.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  // Protect the CES demo route
  if (req.nextUrl.pathname.startsWith("/ces")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Everything else is allowed
  return NextResponse.next();
}
