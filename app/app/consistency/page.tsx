import UploadAndAnalyze from "@/components/UploadAndAnalyze";

export default function Page() {
  return (
    <UploadAndAnalyze
      mode="consistency"
      title="Consistency analysis"
      helperText="Upload .xlsx of .csv — gebruik de template met de velden per klant en periode."
      defaultStrict={true}
    />
  );
}
