// app/app/layout.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Sidebar from "@/components/portal/Sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email || "gebruiker";

  const hasActiveSub = Boolean((session?.user as any)?.hasActiveSub);

  return (
    <div className="min-h-[calc(100vh-56px)] grid md:grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="hidden md:block border-r bg-white">
        <Sidebar />
      </aside>

      {/* Mobile sidebar (boven content) */}
      <div className="md:hidden border-b bg-white sticky top-0 z-30">
        <Sidebar mobile />
      </div>

      {/* Main */}
      <section className="min-h-full">
        {/* Portal header */}
        <div className="px-4 md:px-6 py-4 border-b bg-white/70 backdrop-blur flex items-center gap-3 sticky top-0 z-20">
          <div className="font-semibold">GtN Portal</div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-gray-600">{email}</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${
                hasActiveSub
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              {hasActiveSub ? "Actief abonnement" : "Geen actief abonnement"}
            </span>
          </div>
        </div>

        <div className="p-4 md:p-6">{children}</div>
      </section>
    </div>
  );
}
