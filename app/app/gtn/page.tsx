import UploadAndAnalyze from "@/components/UploadAndAnalyze";

export default function Page() {
  return (
    <UploadAndAnalyze
      mode="gtn"
      title="Gross-to-Net Waterfall"
      helperText="Upload .xlsx of .csv — gebruik de template voor de juiste kolommen."
      defaultStrict={true}
    />
  );
}
