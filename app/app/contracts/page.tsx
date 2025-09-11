import ContractDashboard from "@/components/contracts/ContractDashboard";

export const metadata = {
  title: "Contract Performance",
  description: "Vergelijk groei per contract t.o.v. totale geaggregeerde groei.",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Contract Performance</h1>
      <p className="mt-1 text-sm text-gray-500">
        Bekijk hoe individuele contracten (klant of klant+SKU) presteren en bijdragen aan de totale groei.
      </p>
      <div className="mt-6">
        <ContractDashboard />
      </div>
    </div>
  );
}
