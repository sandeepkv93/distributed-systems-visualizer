import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import AchievementToast from '@/components/AchievementToast';
import ToastContainer from '@/components/ToastContainer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Distributed Systems Visualizer',
  description: 'Interactive learning platform for distributed systems concepts',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-slate-900 text-white`}>
        <Navigation />
        <main>{children}</main>
        <ToastContainer />
        <AchievementToast />
      </body>
    </html>
  );
}
