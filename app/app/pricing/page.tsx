// app/app/pricing/page.tsx
import PricingManager from "@/components/pricing/PricingManager";

export const metadata = {
  title: "Pricing (AIP & GIP)",
  description: "Beheer lijstprijzen (AIP) en genereer GIP-lijsten per klant.",
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Pricing</h1>
        <p className="text-sm text-gray-600">
          Beheer je AIP-master (lijstprijzen) en genereer klant-specifieke GIP-lijsten op basis van groothandelskorting.
        </p>
      </header>
      <PricingManager />
    </div>
  );
}
