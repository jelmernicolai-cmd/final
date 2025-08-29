import UploadAndAnalyze from '@/components/UploadAndAnalyze';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <UploadAndAnalyze
      tool="consistency"
      title="Consistency Analyse"
      helperText="Zet kortingpercentages uit tegen inkoopwaarde en borg consistentie."
      defaultStrict={true}
    />
  );
}
