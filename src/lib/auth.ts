import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export type JwtUser = {
  userId: string;
  name: string;
  phone: string;
  role: 'admin' | 'staff' | 'viewer';
};

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET env var');
}

const secretKey = new TextEncoder().encode(JWT_SECRET);

export const AUTH_COOKIE_NAME = 'auth_token';

export async function signAuthToken(payload: JwtUser, expiresIn: string = '7d') {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

export async function verifyAuthToken(token: string): Promise<JwtUser> {
  const { payload } = await jwtVerify(token, secretKey);
  return payload as unknown as JwtUser;
}

export function setAuthCookie(token: string) {
  cookies().set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });
}

export function clearAuthCookie() {
  cookies().set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });
}

export async function requireAuth(req?: NextRequest): Promise<JwtUser> {
  const token = req ? req.cookies.get(AUTH_COOKIE_NAME)?.value : cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }
  return await verifyAuthToken(token);
}
