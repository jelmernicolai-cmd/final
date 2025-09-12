// app/app/pricing/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Prijsbeheer",
  description: "Beheer AIP-lijstprijzen en genereer klant-specifieke GIP-prijslijsten.",
};

export default function PricingAdminPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Prijsbeheer</h1>
          <p className="mt-1 text-sm text-gray-600">
            Upload/bewerk je AIP-lijst (SKU’s) en genereer GIP-lijsten per klant. Data blijft privé per account.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/templates#pricing" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
            Templates
          </Link>
          <Link href="/contact" className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-700">
            Hulp nodig?
          </Link>
        </div>
      </header>

      {/* Placeholder cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">AIP-master</div>
          <div className="mt-1 text-lg font-semibold">Lijstprijzen</div>
          <p className="mt-2 text-sm text-gray-600">
            Beheer SKU, productnaam, verpakkingsgrootte, ZI-nummer, registratienummer en AIP.
          </p>
          <div className="mt-3">
            <Link href="/app/pricing/aip" className="inline-flex items-center rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
              Openen
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">GIP per klant</div>
          <div className="mt-1 text-lg font-semibold">Prijslijsten</div>
          <p className="mt-2 text-sm text-gray-600">
            Genereer GIP op basis van AIP minus groothandelskorting. Exporteer naar Excel.
          </p>
          <div className="mt-3">
            <Link href="/app/pricing/gip" className="inline-flex items-center rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
              Openen
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Automatische updates</div>
          <div className="mt-1 text-lg font-semibold">Wgp/Farmatec</div>
          <p className="mt-2 text-sm text-gray-600">
            (Toekomstig) Automatisch nieuwe AIP’s op basis van registratienummer-mapping.
          </p>
          <div className="mt-3">
            <button className="inline-flex items-center rounded-lg border px-3 py-2 text-sm text-gray-400 cursor-not-allowed">
              Binnenkort beschikbaar
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
