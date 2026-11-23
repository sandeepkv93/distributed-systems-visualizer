import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import Navigation from '@/components/Navigation';
import AchievementToast from '@/components/AchievementToast';
import ToastContainer from '@/components/ToastContainer';
import VisualizerShell from '@/components/VisualizerShell';

const newsreader = localFont({
  src: [
    {
      path: './fonts/newsreader-latin-normal.woff2',
      weight: '400 600',
      style: 'normal',
    },
    {
      path: './fonts/newsreader-latin-italic.woff2',
      weight: '400 600',
      style: 'italic',
    },
  ],
  variable: '--font-serif',
  display: 'swap',
});

const ibmPlexSans = localFont({
  src: [
    {
      path: './fonts/ibm-plex-sans-latin.woff2',
      weight: '400 700',
      style: 'normal',
    },
  ],
  variable: '--font-sans',
  display: 'swap',
});

const ibmPlexMono = localFont({
  src: [
    {
      path: './fonts/ibm-plex-mono-400.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/ibm-plex-mono-500.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/ibm-plex-mono-600.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Distributed Systems Atlas — Interactive Protocol Monograph',
  description:
    'An interactive field manual and live telemetry bench for exploring 22 foundational distributed systems protocols step by step.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      <body className="font-sans antialiased bg-[var(--paper)] text-[var(--ink)] selection:bg-[#D9441E] selection:text-[#FAF7F1]">
        <Navigation />
        <VisualizerShell>{children}</VisualizerShell>
        <ToastContainer />
        <AchievementToast />
      </body>
    </html>
  );
}
