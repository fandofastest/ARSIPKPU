import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('auth_token')?.value;

  // Check if it's a public path
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  // If no token and not a public path, redirect to login
  if (!token && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    // Only set 'next' if it's not the root path to keep URLs clean
    if (pathname !== '/') {
      url.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(url);
  }

  // If token exists and trying to access login, redirect to dashboard
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - illustration.png, logo.png (specific assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|illustration.png|logo.png).*)',
  ],
};

