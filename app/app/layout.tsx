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
      {/* Sidebar – één keer renderen, geen 'mobile' prop */}
      <aside className="border-r bg-white">
        <div className="p-3">
          <Sidebar />
        </div>
      </aside>

      {/* Main */}
      <section className="bg-gray-50">
        {/* Portal topbar */}
        <div className="sticky top-0 z-30 bg-white border-b">
          <div className="px-4 md:px-6 py-3 flex items-center gap-3">
            <div className="text-sm text-gray-600">Ingelogd als</div>
            <div className="text-sm font-medium text-gray-900">{email}</div>
            <span
              className={[
                "ml-auto inline-flex items-center rounded-full px-2.5 py-1 text-xs border",
                hasActiveSub
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-amber-50 text-amber-800 border-amber-200",
              ].join(" ")}
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
