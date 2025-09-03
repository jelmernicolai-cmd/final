// app/app/layout.tsx
import type { Metadata } from "next";
import PortalSidebar from "@/components/PortalSidebar";

export const metadata: Metadata = {
  title: "GtN Portal | PharmaGtN",
  description:
    "Upload data en krijg direct inzicht: Gross-to-Net Waterfall, Consistency, en optimalisatiesuggesties.",
};

// Belangrijk: GEEN <html>/<body> hier renderen – dat doet app/layout.tsx.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Grid: sidebar + hoofdcontent */}
      <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-[260px_1fr]">
        {/* Sidebar (client component) */}
        <aside className="border-r bg-white md:sticky md:top-14 md:h-[calc(100vh-56px)] md:overflow-y-auto">
          {/* top-14 = hoogte van je hoofd-nav (h-14). 
             Als je ooit de hoofd-navhoogte wijzigt, pas dit aan. */}
          <PortalSidebar />
        </aside>

        {/* Content */}
        <main
          role="main"
          className="min-h-screen bg-white"
        >
          {/* Wat lucht rondom de inhoud */}
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
