export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Features | PharmaGtN",
  description: "Discover how PharmaGtN helps pharma manufacturers optimize discounts, pricing and gross-to-net.",
};

const features = [
  { title: "End-to-End Gross-to-Net Insight", description: "Transparent waterfall from gross to net by segment and product." },
  { title: "Scenario Modeling & Forecasting", description: "Simulate policy options and see impact on net revenue and margins." },
  { title: "Consistency & Compliance", description: "Automatic detection of discount outliers by channel and customer segment." },
  { title: "Parallel Pressure Analysis", description: "Understand internal cannibalization with simple portfolio heatmaps." },
  { title: "Frictionless Uploads", description: "Upload Excel/CSV and instantly get interactive dashboards." },
  { title: "Audit Trail", description: "Every change documented for governance and insight." },
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
