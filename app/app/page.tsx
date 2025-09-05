// app/app/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Link from "next/link";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}

function QuickAction({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border bg-white p-4 hover:bg-gray-50 transition-colors block"
    >
      <div className="font-medium">{label}</div>
      <div className="text-sm text-gray-600">{desc}</div>
    </Link>
  );
}

export const dynamic = "force-dynamic";

export default async function AppDashboard() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email || "";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Welkom terug{email ? `, ${email}` : ""}</h1>
            <p className="text-gray-600 text-sm">
              Je portal is actief. Upload je data en start met Waterfall, Consistency en Paralleldruk analyses.
            </p>
          </div>
          <div className="md:ml-auto flex gap-2">
            <form action="/api/stripe/create-portal-session" method="POST">
              <button className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Billing portal</button>
            </form>
            <Link href="/templates" className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm hover:bg-sky-700">
              Templates
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Stat label="GtN datasets" valu
