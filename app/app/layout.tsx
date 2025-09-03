import type { Metadata } from "next";
import "../globals.css";
import PortalSidebar from "@/components/PortalSidebar";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";

export const metadata: Metadata = {
  title: "GtN Portal | PharmaGtN",
  description: "Upload data en krijg direct inzicht: Gross-to-Net Waterfall, Consistency, en optimalisatiesuggesties.",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-[260px_1fr]">
          <PortalSidebar />

          <main className="min-h-screen bg-white border-l">
            {/* Topbar */}
            <div className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
              <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
                <Breadcrumbs />
                <Link href="/" className="text-sm rounded-lg border px-3 py-1.5 hover:bg-gray-50">
                  ← Terug naar website
                </Link>
              </div>
            </div>

            <div className="mx-auto max-w-6xl px-4 py-6">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
