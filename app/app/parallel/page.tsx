import UploadAndAnalyze from '@/components/UploadAndAnalyze';
import ParallelPressureHeatmap from '@/components/charts/ParallelPressureHeatmap';
import KpiTiles from '@/components/charts/KpiTiles';
import { mockParallelExample } from '@/lib/sampleData';

export const metadata = { title: 'Paralleldruk', description: 'Verdringing binnen portfolio visualiseren.' };

export default function ParallelPressurePage() {
  const sample = mockParallelExample();
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 space-y-10">
      <header>
        <h1 className="text-3xl font-semibold">Paralleldruk</h1>
        <p className="text-gray-700 mt-2 max-w-3xl">
          Heatmap toont waar producten elkaar verdringen; optimaliseer korting gericht.
        </p>
      </header>

      <UploadAndAnalyze
        analysis="parallel"
        templateHref="/templates/parallel-template.xlsx"
        helpText="Verplichte kolommen: Product, Klant, NettoPrijs, Volume."
      />

      <KpiTiles data={sample.kpis} />
      <ParallelPressureHeatmap data={sample.heatmap} />
    </section>
  );
}
