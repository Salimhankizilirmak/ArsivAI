import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GIDA-REHBERİ | Kalite Kalibrasyon Portalı',
  description: 'Novexistech On-Premise Kalite Kalibrasyon ve Dijital Kalite Formu Yönetimi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
