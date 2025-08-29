import Link from 'next/link';

export const metadata = {
  title: 'Datagedreven GTN-optimalisatie',
  description: 'Optimaliseer kortingen en contracten richting ziekenhuizen, apotheken en groothandels. Doel-ROI: €100.000+.',
};

export default function Home() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl font-semibold leading-tight">
            Maximaliseer <span className="text-blue-600">Gross-to-Net</span> met transparante kortingen
          </h1>
          <p className="mt-4 text-lg text-gray-700">
            PharmaGtN helpt farmafabrikanten hun commerciële beleid te stroomlijnen: consistente kortingen,
            eerlijke prijsstelling en minder marge-erosie—alles in één platform.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/pricing" className="rounded bg-blue-600 px-5 py-3 text-white hover:bg-blue-700">Bekijk prijzen</Link>
            <Link href="/features" className="rounded border px-5 py-3 hover:bg-gray-50">Bekijk features</Link>
          </div>
          <p className="mt-3 text-sm text-gray-500">ROI-doel: minimaal €100.000 per jaar door optimalisatie van korting en GTN.</p>
        </div>
        <div className="relative">
          <img src="/images/hero-graph.svg" alt="GTN dashboard visual" className="w-full h-auto" />
        </div>
      </div>

      <div className="mt-16 grid md:grid-cols-3 gap-6">
        {[
          {t:'GTN-waterfall',d:'Volledige decompositie van bruto naar netto per segment.'},
          {t:'Consistentie-analyse',d:'Vergelijk korting% vs. inkoopwaarde om beleid te rationaliseren.'},
          {t:'Paralleldruk',d:'Signalen waar portfolio-producten elkaar verdringen; stuur korting gericht.'},
        ].map((c)=>(
          <div key={c.t} className="rounded border p-5">
            <h3 className="font-semibold">{c.t}</h3>
            <p className="text-sm text-gray-700 mt-2">{c.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
