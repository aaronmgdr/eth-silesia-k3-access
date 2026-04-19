import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Kolektyw3 — Community Space Access',
  description: 'Buy a day pass with USDC or card. Get instant access to Kolektyw3, a community space in the heart of Warsaw.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Providers>
          <div style={{ flex: 1 }}>{children}</div>
        </Providers>
        <Footer />
      </body>
    </html>
  );
}
