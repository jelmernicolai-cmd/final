import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.pharmgtn.com'),
  title: { default: 'PharmaGtN', template: '%s | PharmaGtN' },
  description: 'PharmaGtN helpt farma-fabrikanten hun gross-to-net en kortingsbeleid te optimaliseren.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-screen flex flex-col bg-white text-gray-900">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-black text-white px-3 py-2 rounded">
          Naar inhoud
        </a>
        <Nav />
        <main id="main" className="flex-1">{children}</main>
        <footer className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-gray-600">
            © {new Date().getFullYear()} PharmaGtN
          </div>
        </footer>
      </body>
    </html>
  );
}
