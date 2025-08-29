import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import Nav from '../components/Nav';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.pharmgtn.com'),
  title: { default: 'PharmaGtN', template: '%s | PharmaGtN' },
  description: 'PharmaGtN helpt farmafabrikanten hun gross-to-net en kortingsbeleid te optimaliseren met self-service analyses.',
  openGraph: {
    title: 'PharmaGtN',
    description: 'Optimaliseer gross-to-net en kortingsbeleid. Self-service platform voor farma.',
    url: 'https://www.pharmgtn.com',
    siteName: 'PharmaGtN',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'PharmaGtN',
    url: 'https://www.pharmgtn.com',
    logo: 'https://www.pharmgtn.com/icons/icon-512.png',
  };

  return (
    <html lang="nl">
      <body className="min-h-screen flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-black text-white px-3 py-2 rounded">
          Naar inhoud
        </a>
        <Nav />
        <main id="main" className="flex-1">{children}</main>
        <footer className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-gray-600">
            © {new Date().getFullYear()} PharmaGtN · All rights reserved
          </div>
        </footer>
        <Script id="org-jsonld" type="application/ld+json" strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      </body>
    </html>
  );
}
