// app/app/gtn/page.tsx
import UploadAndAnalyze from "@/components/UploadAndAnalyze";

export default function GtnPage() {
  return (
    <UploadAndAnalyze
      mode="waterfall"
      title="Gross-to-Net Waterfall"
      helperText="Upload .xlsx of .csv — gebruik de template voor de juiste kolommen."
      defaultStrict={true}
    />
  );
}
