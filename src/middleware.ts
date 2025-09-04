import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of protected routes that require authentication
const protectedRoutes = ['/dashboard', '/audits', '/profile', '/settings'];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // For now, let's disable the middleware auth checks
  // The client-side auth will handle redirects
  // This prevents the signup redirect issue
  
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
