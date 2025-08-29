export const metadata = {
  title: 'Functionaliteit',
  description: 'GTN-waterfall, consistentie-analyse, paralleldruk en meer—voor farma.',
};

export default function Features() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 space-y-10">
      <header>
        <h1 className="text-3xl font-semibold">Functionaliteit</h1>
        <p className="text-gray-700 mt-2 max-w-3xl">
          Inzichten op basis van uw eigen data, automatisch gevalideerd en omgezet naar GTN-sturing.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div>
          <h2 className="font-semibold text-xl">GTN-waterfall</h2>
          <p className="text-gray-700 mt-2">Van bruto lijstprijs naar netto realisatie inclusief kortingen, bonussen en fees.</p>
          <img src="/images/waterfall.svg" alt="GTN waterfall" className="mt-4 rounded border" />
        </div>
        <div>
          <h2 className="font-semibold text-xl">Consistentie-analyse</h2>
          <p className="text-gray-700 mt-2">Korting% versus inkoopwaarde; detecteer outliers en harmoniseer beleid.</p>
          <img src="/images/consistency-scatter.svg" alt="Consistency scatter" className="mt-4 rounded border" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div>
          <h2 className="font-semibold text-xl">Paralleldruk</h2>
          <p className="text-gray-700 mt-2">Heatmap van verdringing binnen portfolio; stuur korting op product-/klantniveau.</p>
          <img src="/images/heatmap.svg" alt="Parallel pressure heatmap" className="mt-4 rounded border" />
        </div>
        <div>
          <h2 className="font-semibold text-xl">Data-workflow</h2>
          <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
            <li>Standaard templates (CSV/XLSX) + validatie</li>
            <li>Privacy by design (geen PII nodig)</li>
            <li>Export naar dashboard/rapport</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
