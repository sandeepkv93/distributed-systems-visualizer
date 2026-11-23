import type { Metadata } from 'next';
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import AchievementToast from '@/components/AchievementToast';
import ToastContainer from '@/components/ToastContainer';
import VisualizerShell from '@/components/VisualizerShell';

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
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
