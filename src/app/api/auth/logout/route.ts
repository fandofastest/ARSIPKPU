import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, clearAuthCookie } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Call the shared function to ensure all attributes (especially secure) match exactly
  clearAuthCookie();
  
  // Also explicitly clear via the response object as a fallback
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // The clearAuthCookie function handles the env var
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0)
  });
  
  return response;
}




