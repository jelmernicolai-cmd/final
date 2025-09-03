// app/app/consistency/page.tsx
import UploadAndAnalyze from "@/components/UploadAndAnalyze";

export default function ConsistencyPage() {
  return (
    <UploadAndAnalyze
      mode="consistency"
      title="Consistency analysis"
      helperText="Upload .xlsx of .csv — gebruik de template voor de juiste kolommen."
      defaultStrict={true}
    />
  );
}
