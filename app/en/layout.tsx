import '../globals.css'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'PharmaGtN — Gross‑to‑Net analytics for pharmaceutical companies',
  description: 'Automate Gross‑to‑Net (GTN), gain transparency on discounts and rebates, and maximize net margin with secure cloud software.',
  keywords: ['Pharma GTN','Gross-to-Net','pharma pricing','discounts','rebates','net revenue','dashboard'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const org = {
    "@context":"https://schema.org",
    "@type":"Organization",
    "name":"PharmaGtN",
    "url":"https://www.pharmgtn.com",
    "logo":"https://www.pharmgtn.com/images/logo.svg"
  }
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-black text-white px-3 py-2 rounded">Skip to content</a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(org)}} />
      </body>
    </html>
  )
}
