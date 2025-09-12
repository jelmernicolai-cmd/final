// app/app/contracts/page.tsx
import Link from "next/link";
import UploadAndDashboard from "../../../components/contracts/UploadAndDashboard";

export const metadata = {
  title: "Contract Performance",
  description: "Vergelijk groei per contract t.o.v. totale geaggregeerde groei.",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* HERO */}
      <header className="rounded-2xl border bg-white p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Contract Performance</h1>
            <p className="mt-1 text-sm text-gray-600">
              Upload je dataset en zie direct welke contracten sneller groeien dan het totaal, inclusief bijdrage en outperformance.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
            >
              <FileIcon className="h-4 w-4" /> Download template
            </Link>
            <Link
              href="/security"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-3 py-2 text-sm text-white hover:opacity-95"
            >
              <ShieldIcon className="h-4 w-4" /> Data & beveiliging
            </Link>
          </div>
        </div>
      </header>

      {/* BODY */}
      <section className="grid gap-4 lg:grid-cols-12">
        {/* Left: Upload + Dashboard */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border bg-white p-4 md:p-5">
            <h2 className="text-base md:text-lg font-semibold">Upload & Analyse</h2>
            <p className="mt-1 text-sm text-gray-600">
              Ondersteund: <b>Excel/CSV</b>. Vereiste kolommen: <code>customer</code>, <code>sku</code>, <code>units</code>,{" "}
              <code>claim_amount</code> (uitbetaalde korting), <code>revenue</code>, <code>period</code>.
            </p>
            <div className="mt-4">
              <UploadAndDashboard />
            </div>
          </div>
        </div>

        {/* Right: Help & Uitleg */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border bg-white p-4 md:p-5">
            <h3 className="text-sm font-semibold">Hoe werkt het?</h3>
            <ul className="mt-2 space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <Dot /> <span><b>Upload</b> je bestand (één tab of CSV). We valideren kolomnamen en periodes automatisch.</span>
              </li>
              <li className="flex gap-2">
                <Dot /> <span><b>Groei per contract</b> wordt vergeleken met de <b>geaggregeerde totale groei</b>.</span>
              </li>
              <li className="flex gap-2">
                <Dot /> <span>Zie <b>out/under-performance</b>, aandeel in totale groei en trend per klant/SKU.</span>
              </li>
              <li className="flex gap-2">
                <Dot /> <span><b>Exporteer</b> resultaten naar Excel (contractlist, benchmark, top movers).</span>
              </li>
            </ul>
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              Tip: Periodes mogen <code>MM-YYYY</code> of <code>YYYY-MM</code> zijn (bijv. <i>03-2025</i>).
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4 md:p-5">
            <h3 className="text-sm font-semibold">Dataveiligheid</h3>
            <p className="mt-2 text-sm text-gray-700">
              Verwerking gebeurt client-side; er wordt <b>geen bedrijfsdata opgeslagen</b> op de server. Exports zijn lokaal.
            </p>
            <Link href="/security" className="mt-3 inline-flex items-center gap-2 text-sm text-sky-700 hover:underline">
              Meer over beveiliging <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-2xl border bg-white p-4 md:p-5">
            <h3 className="text-sm font-semibold">Veelvoorkomende fouten</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
              <li>Ontbrekende kolomnaam (bijv. <code>period</code> of <code>claim_amount</code>).</li>
              <li>Onjuiste datumnotatie (zet om naar <code>MM-YYYY</code> of <code>YYYY-MM</code>).</li>
              <li>Lege rijen/tweede leeg tabblad in Excel.</li>
            </ul>
            <Link href="/templates" className="mt-3 inline-flex items-center gap-2 text-sm text-sky-700 hover:underline">
              Gebruik de voorbeeld-template <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}

/* ===== Kleine inline iconen (geen dependency) ===== */
function FileIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path d="M4 2h7l5 5v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1.5V7h3.5L11 3.5z" />
    </svg>
  );
}
function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2 4 6v6c0 5 3.4 9.7 8 10 4.6-.3 8-5 8-10V6l-8-4z" />
    </svg>
  );
}
function ArrowRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path d="M10.293 3.293a1 1 0 011.414 0L17 8.586a2 2 0 010 2.828l-5.293 5.293a1 1 0 01-1.414-1.414L13.586 12H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 010-1.414z"/>
    </svg>
  );
}
function Dot(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 8 8" aria-hidden {...props} className={"h-2 w-2 fill-current text-sky-600 mt-1 " + (props.className || "")}>
      <circle cx="4" cy="4" r="4" />
    </svg>
  );
}
