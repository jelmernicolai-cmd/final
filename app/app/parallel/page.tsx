// app/app/parallel/page.tsx
import UploadAndAnalyze from "@/components/UploadAndAnalyze";

export default function ParallelPage() {
  return (
    <UploadAndAnalyze
      mode="parallel"
      title="Parallel Pressure Analyse"
      helperText="Identificeer interne prijsdruk tussen portfolio-producten."
      defaultStrict={false} // mag losser starten
    />
  );
}
