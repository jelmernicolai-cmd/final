import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Link from "next/link";

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">Billing & Subscription</h1>
      {!session ? (
        <p className="mt-4 text-gray-700">
          Log eerst in om te abonneren. <Link href="/login" className="underline">Login</Link>
        </p>
      ) : (
        <div className="mt-6 space-x-3">
          <form action="/api/stripe/create-checkout-session" method="POST" className="inline">
            <button className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700">
              Abonneer (€2.500/jaar)
            </button>
          </form>
          <form action="/api/stripe/create-portal-session" method="POST" className="inline">
            <button className="rounded-lg border px-4 py-2 hover:bg-gray-50">
              Beheer abonnement
            </button>
          </form>
          <p className="mt-4 text-sm text-gray-500">Ingelogd als: {email}</p>
        </div>
      )}
    </div>
  );
}
