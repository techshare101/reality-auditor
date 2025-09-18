import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Matcher config to specify which paths middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon files and other static assets
     */
    '/((?!api|_next/static|_next/image|favicon|.*\.ico|.*\.png|.*\.svg|.*\.webmanifest).*)',
  ],
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public routes
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Allow client-side redirects to handle auth for other routes
  return NextResponse.next();
}
