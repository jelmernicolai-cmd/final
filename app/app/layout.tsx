// app/app/layout.tsx
import type { Metadata } from "next";
import "../globals.css";
import PortalSidebar from "@/components/PortalSidebar";
import PortalTopbar from "@/components/PortalTopbar";

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
          <PortalSidebar />
          <div className="min-h-screen bg-white border-l flex flex-col">
            <PortalTopbar />
            <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
