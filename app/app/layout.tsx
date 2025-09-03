// app/app/layout.tsx
import type { Metadata } from "next";
import "../globals.css";
import PortalSidebar from "@/components/PortalSidebar";

export const metadata: Metadata = {
  title: "GtN Portal | PharmaGtN",
  description:
    "Upload data en krijg direct inzicht: Gross-to-Net Waterfall, Consistency, en optimalisatiesuggesties.",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-[260px_1fr]">
          {/* Sidebar (client) */}
          <PortalSidebar />

          {/* Main content */}
          <main className="min-h-screen bg-white border-l">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
