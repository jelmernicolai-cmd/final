// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Nav from "@/components/Nav.client";

// ⚠️ Gebruik de nieuwe footer uit /components/ui/Footer.tsx
import Footer from "@/components/ui/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.pharmgtn.com"),
  title: { default: "PharmaGtN", template: "%s | PharmaGtN" },
  description:
    "PharmaGtN helpt farma-fabrikanten hun gross-to-net en kortingsbeleid te optimaliseren.",
  viewport: { width: "device-width", initialScale: 1 },
};

export const metadata = {
  title: "PharmGtN",
  description: "Gross-to-Net portal voor farma",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-screen flex flex-col bg-white text-gray-900">
        <AuthProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-black text-white px-3 py-2 rounded"
          >
            Naar inhoud
          </a>

          <Nav />
          <main id="main" className="flex-1">
            {children}
          </main>

          {/* Nieuwe, professionele footer */}
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
