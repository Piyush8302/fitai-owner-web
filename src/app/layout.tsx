import type { Metadata, Viewport } from 'next';
import './globals.css';
import SWRegister from '@/components/SWRegister';

export const metadata: Metadata = {
  title: 'FitAI Gym Owner',
  description: 'Manage your gym — members, attendance, fees, cashbook, staff & reports.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FitAI Owner',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#6C63FF',
  viewportFit: 'cover',
  // Keyboard opens over the page instead of resizing it — stops bottom sheets
  // from jumping around while typing (Android Chrome).
  interactiveWidget: 'resizes-visual',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SWRegister />
        <div className="mx-auto max-w-md min-h-dvh">{children}</div>
      </body>
    </html>
  );
}
