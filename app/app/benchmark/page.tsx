// app/benchmark/page.tsx
import Client from "./ui/Client";

export const metadata = {
  title: "PharmGtN · NL Kortingsbenchmark",
  description:
    "Publieke kortingen uit VWS-bijlagen + Farmatec add-ons + scenario’s. Audit-ready, NL-specifiek.",
};

export default function Page() {
  return <Client />;
}
