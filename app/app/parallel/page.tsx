import UploadAndAnalyze from '@/components/UploadAndAnalyze';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <UploadAndAnalyze
      tool="parallel"
      title="Parallel Pressure Analyse"
      helperText="Identificeer interne prijsdruk tussen portfolio-producten."
      defaultStrict={false} // mag losser starten
    />
  );
}
