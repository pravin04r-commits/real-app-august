import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'R.E.A.L. — Your relationship gets its own universe',
    template: '%s · R.E.A.L.',
  },
  description:
    "Relationships Ex's Artificial Language. A couples-only universe: streaks, Sparks, dares, roadmaps and one shared story. Built for exactly two people.",
  applicationName: 'R.E.A.L.',
  authors: [{ name: 'Pravin R. Nair', url: 'https://nairsolutions.org' }],
  keywords: ['couples app', 'relationship tracker', 'R.E.A.L.', 'N.A.I.R. Solutions'],
  openGraph: {
    title: 'R.E.A.L. — Where your relationship gets its own universe',
    description: 'Streaks, Sparks, dares and one shared story. Built for exactly two people.',
    siteName: 'R.E.A.L.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#080810',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
