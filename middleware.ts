import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login'];

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? '';
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('auth_token')?.value;

  // Check if it's a public path
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  let isValid = false;
  if (token) {
    try {
      await jwtVerify(token, getSecretKey());
      isValid = true;
    } catch (err) {
      // Invalid or expired token
      isValid = false;
    }
  }

  // If no valid token and not a public path, redirect to login
  if (!isValid && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    if (pathname !== '/' && pathname !== '') {
      url.searchParams.set('next', pathname);
    }
    const response = NextResponse.redirect(url);
    // Force clear the invalid token
    response.cookies.delete('auth_token');
    return response;
  }

  // If valid token exists and trying to access login, redirect to dashboard
  if (isValid && pathname === '/login') {
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
    '/',
    '/((?!api|_next/static|_next/image|favicon.ico|illustration.png|logo.png).*)',
  ],
};


