import UploadAndAnalyze from '@/components/UploadAndAnalyze';
import GrossToNetWaterfall from '@/components/charts/GrossToNetWaterfall';
import KpiTiles from '@/components/charts/KpiTiles';
import { mockGtnUploadExample } from '@/lib/sampleData';

export const metadata = { title: 'GTN-waterfall', description: 'Van bruto naar netto per component.' };

export default function GTNPage() {
  // Server component ↔︎ Client component scheiding: geen handlers of react elements als props doorgeven
  const sample = mockGtnUploadExample(); // serialiseerbare data
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 space-y-10">
      <header>
        <h1 className="text-3xl font-semibold">GTN-waterfall</h1>
        <p className="text-gray-700 mt-2 max-w-3xl">
          Upload het GTN-template en krijg direct inzicht in korting, bonussen, fees en netto realisatie.
        </p>
      </header>

      <UploadAndAnalyze
        analysis="gtn"
        templateHref="/templates/gtn-template.xlsx"
        helpText="Verplichte kolommen: Product, Klant, BrutoPrijs, Korting, Bonus, Fee, Aantal."
      />

      <KpiTiles data={sample.kpis} />
      <GrossToNetWaterfall data={sample.waterfall} />
    </section>
  );
}
