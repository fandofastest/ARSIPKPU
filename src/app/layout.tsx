import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KPU Smart Archive',
  description: 'Sistem arsip pintar dengan pencarian cepat dan klasifikasi otomatis.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
