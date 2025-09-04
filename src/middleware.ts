import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of protected routes that require authentication
const protectedRoutes = ['/dashboard', '/audits', '/profile', '/settings'];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    path.startsWith(route)
  );

  // Get the auth session cookie (Firebase sets this when user is authenticated)
  // Note: This is a basic check. For production, verify the token server-side
  const session = request.cookies.get('__session');

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if accessing auth pages while logged in
  if ((path === '/login' || path === '/signup' || path === '/register') && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

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
