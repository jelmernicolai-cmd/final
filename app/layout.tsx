// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.pharmgtn.com'),
  title: {
    default: 'PharmaGtN',
    template: '%s | PharmaGtN',
  },
  description:
    'PharmaGtN helpt farma-fabrikanten hun gross-to-net en kortingsbeleid te optimaliseren.',
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
  // (optioneel) basis SEO:
  alternates: {
    canonical: '/',
    languages: {
      'nl': '/nl',
      'en': '/en',
    },
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className="min-h-screen flex flex-col bg-white text-gray-900">
        {/* Skip link voor toegankelijkheid */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-black text-white px-3 py-2 rounded"
        >
          Naar inhoud
        </a>

        {/* Globale navigatie */}
        <Nav />

        {/* Hoofdinhoud */}
        <main id="main" className="flex-1">
          {children}
        </main>

        {/* Footer (zorg dat components/Footer.tsx bestaat) */}
        <Footer />
      </body>
    </html>
  );
}
