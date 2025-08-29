export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Functionaliteiten | PharmaGtN",
  description: "Ontdek hoe PharmaGtN farma-fabrikanten helpt om gross-to-net, prijsstrategie en marges te verbeteren.",
};

const features = [
  { title: "Volledige Gross-to-Net Inzicht", description: "Transparant waterfall-model van bruto naar netto per segment en product." },
  { title: "Scenario Analyse & Forecasting", description: "Simuleer beleidsopties en zie het effect op netto-omzet en marge." },
  { title: "Consistentie & Compliance", description: "Automatische signalering van afwijkende kortingen per kanaal en klantsegment." },
  { title: "Parallelle Druk Analyse", description: "Begrijp interne kannibalisatie met eenvoudige portfolio-heatmaps." },
  { title: "Snelle Uploads", description: "Upload Excel/CSV en krijg direct interactieve dashboards." },
  { title: "Audit Trail", description: "Elke wijziging gedocumenteerd voor inzicht en governance." },
];

export default function FeaturesPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <header className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Functionaliteiten die resultaat opleveren</h1>
        <p className="text-lg text-gray-600">
          PharmaGtN helpt farma-fabrikanten hun <strong>kortingsbeleid</strong> en <strong>gross-to-net</strong> strategie te optimaliseren.
        </p>
        <div className="mt-2 text-xs text-gray-400">FEATURES NL v2</div>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((f, i) => (
          <div key={i} className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition">
            <h2 className="text-xl font-semibold mb-2 text-center">{f.title}</h2>
            <p className="text-gray-600 text-sm text-center">{f.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Klaar om uw GTN te versnellen?</h2>
        <p className="text-gray-600 mb-6">Vraag een demo aan en ervaar hoe snel u van data naar actie gaat.</p>
        <a href="/contact" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition">
          Vraag een demo aan
        </a>
      </div>
    </section>
  );
}
