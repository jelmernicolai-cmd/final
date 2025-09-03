// app/app/layout.tsx
'use client';

import '@/app/globals.css';
import { PortalProvider } from '@/components/portal/PortalProvider';
import Sidebar from '@/components/portal/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalProvider>
      <div className="min-h-[calc(100vh-0px)] bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 md:grid-cols-[260px,1fr] gap-6">
          {/* Left task pane */}
          <aside className="md:sticky md:top-4 h-fit">
            <Sidebar />
          </aside>

          {/* Main workspace */}
          <section className="min-h-[60vh]">{children}</section>
        </div>
      </div>
    </PortalProvider>
  );
}
