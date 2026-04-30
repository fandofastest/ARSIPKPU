import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, clearAuthCookie } from '@/lib/auth';

// Use a local copy of isSecureAuthCookie since it's not exported from auth.ts
function getIsSecure() {
  const raw = String(process.env.AUTH_COOKIE_SECURE ?? '').trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on') return true;
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') return false;
  return process.env.NODE_ENV === 'production';
}

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Call the shared function to ensure all attributes (especially secure) match exactly
  clearAuthCookie();
  
  // Also explicitly clear via the response object as a fallback
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: getIsSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0)
  });
  
  return response;
}





