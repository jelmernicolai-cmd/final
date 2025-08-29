import UploadAndAnalyze from '@/components/UploadAndAnalyze';
import ConsistencyScatter from '@/components/charts/ConsistencyScatter';
import KpiTiles from '@/components/charts/KpiTiles';
import { mockConsistencyExample } from '@/lib/sampleData';

export const metadata = { title: 'Consistentie-analyse', description: 'Korting% vs. inkoopwaarde per account.' };

export default function ConsistencyPage() {
  const sample = mockConsistencyExample();
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 space-y-10">
      <header>
        <h1 className="text-3xl font-semibold">Consistentie-analyse</h1>
        <p className="text-gray-700 mt-2 max-w-3xl">
          Toets of korting% stijgt met volume/inkoopwaarde en identificeer outliers.
        </p>
      </header>

      <UploadAndAnalyze
        analysis="consistency"
        templateHref="/templates/consistency-template.xlsx"
        helpText="Verplichte kolommen: Klant, InkoopWaarde, KortingPerc."
      />

      <KpiTiles data={sample.kpis} />
      <ConsistencyScatter data={sample.scatter} />
    </section>
  );
}
