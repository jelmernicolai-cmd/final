import UploadAndAnalyze from '@/components/UploadAndAnalyze';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <UploadAndAnalyze
      tool="gtn"
      title="Gross-to-Net Waterfall"
      helperText="Upload .xlsx of .csv — gebruik de template voor de juiste kolommen."
      defaultStrict={true}
    />
  );
}
