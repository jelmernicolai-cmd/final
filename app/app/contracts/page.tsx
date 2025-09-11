// app/app/contracts/page.tsx
import UploadAndDashboard from "../../../components/contracts/UploadAndDashboard";

export const metadata = {
  title: "Contract Performance",
  description: "Vergelijk groei per contract t.o.v. totale geaggregeerde groei.",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Contract Performance</h1>
      <p className="mt-1 text-sm text-gray-500">
        Upload je CSV en bekijk groei per contract vs. totaal, inclusief outperformance en bijdrage.
      </p>
      <div className="mt-6">
        <UploadAndDashboard />
      </div>
    </div>
  );
}
