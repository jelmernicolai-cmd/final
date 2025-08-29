import '../globals.css';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata = {
  metadataBase: new URL('https://www.pharmgtn.com'),
  title: {
    default: 'PharmaGtN | Gross-to-Net optimization for pharma',
    template: '%s | PharmaGtN',
  },
  description: 'Data-driven tools to optimize discounts, contracts and gross-to-net. Target ROI: €100,000+.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "PharmaGtN",
    "url": "https://www.pharmgtn.com",
    "logo": "https://www.pharmgtn.com/images/logo.svg"
  };

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-black text-white px-3 py-2 rounded">
          Skip to content
        </a>
        <Nav />
        <main id="main" className="flex-1">{children}</main>
        <Footer />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      </body>
    </html>
  );
}
