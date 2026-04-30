import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function HomePage() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  
  if (!token) {
    redirect('/login');
  }
  
  redirect('/dashboard');
}


