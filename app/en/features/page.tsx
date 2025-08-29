import Image from "next/image";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Features | PharmaGtN",
  description:
    "Discover how PharmaGtN helps pharma manufacturers optimize gross-to-net, pricing strategies, and margins with transparent analytics.",
};

const features = [
  { title: "End-to-End Gross-to-Net Insight", description: "Transparent waterfall across discounts, rebates, and price components.", icon: "/images/icons/waterfall.png" },
  { title: "Scenario Modeling & Forecasting", description: "Simulate pricing/discount changes and forecast impact on net revenue and margins.", icon: "/images/icons/scenario.png" },
  { title: "Consistency & Compliance", description: "Automatic input validation and consistent reporting per channel and customer.", icon: "/images/icons/compliance.png" },
  { title: "Parallel Pressure Analysis", description: "Understand parallel trade and locate pressure points with portfolio heatmaps.", icon: "/images/icons/heatmap.png" },
  { title: "Frictionless Uploads", description: "Upload Excel/CSV using templates and get interactive dashboards instantly.", icon: "/images/icons/dashboard.png" },
];

export default function FeaturesPageEN() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <header className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Features that Deliver Measurable Results</h1>
        <p className="text-lg text-gray-600">From insight to action—PharmaGtN translates data into margin.</p>
        <div className="mt-2 text-xs text-gray-400">FEATURES EN v2</div>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((f, i) => (
          <div key={i} className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition">
            {f.icon && (
              <div className="mb-4">
                <Image src={f.icon} alt={f.title} width={48} height={48} className="mx-auto" />
              </div>
            )}
            <h2 className="text-xl font-semibold mb-2 text-center">{f.title}</h2>
            <p className="text-gray-600 text-sm text-center">{f.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to accelerate your GTN optimization?</h2>
        <p className="text-gray-600 mb-6">Request a short demo and see how quickly PharmaGtN turns raw data into action.</p>
        <a href="/en/contact" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition">
          Request a demo
        </a>
      </div>
    </section>
  );
}
