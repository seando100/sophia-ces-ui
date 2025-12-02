import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Allow login page always
  if (url.pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  // Protect only /ces (and its children)
  if (url.pathname.startsWith("/ces")) {
    // Since we removed cookies: allow the page to load.
    // The page itself will check sessionStorage client-side.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/ces/:path*", "/login"],
};
