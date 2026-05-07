import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SIPADU HUKUM',
  description: 'Sistem Informasi Terpadu produk Hukum'
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
