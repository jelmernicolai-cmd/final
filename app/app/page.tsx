import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Link from "next/link";

export default async function PortalHome() {
  const session = await getServerSession(authOptions);
  const hasSub = (session?.user as any)?.hasActiveSub === true;

  if (!hasSub) {
    return (
      <div className="rounded-xl border p-6 bg-yellow-50">
        <h1 className="text-xl font-semibold">Abonnement vereist</h1>
        <p className="mt-2 text-gray-700">
          Er is geen actief abonnement gevonden voor <strong>{session?.user?.email}</strong>.
        </p>
        <p className="mt-2">
          Ga naar <Link href="/billing" className="underline">Billing</Link> om je abonnement te starten of te beheren.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Portal overzicht</h1>
      <p className="text-gray-700">Kies een analyse in het menu links om te starten.</p>
      {/* hier kun je tiles zetten naar /app/waterfall en /app/consistency */}
    </div>
  );
}
