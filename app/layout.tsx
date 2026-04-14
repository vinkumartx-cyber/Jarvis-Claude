import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppProvider } from '@/components/providers/AppProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'V.OS - Personal Operating System',
  description: 'Voice-first AI personal assistant by Vinesh',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 antialiased`}>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
