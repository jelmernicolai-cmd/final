import Image from "next/image";

export const metadata = {
  title: "Features | PharmaGtN",
  description:
    "Discover how PharmaGtN helps pharma manufacturers optimize gross-to-net, pricing strategies, and margins with transparent analytics and fast scenario modeling.",
};

const features = [
  {
    title: "End-to-End Gross-to-Net Insight",
    description:
      "Analyze all discounts, rebates, and price components in a transparent waterfall model. Immediately see where margin leaks occur and where optimization opportunities exist.",
    icon: "/images/icons/waterfall.png",
  },
  {
    title: "Scenario Modeling & Forecasting",
    description:
      "Simulate pricing and discount scenarios and instantly forecast impact on net revenue and margins. Make decisions with data, not gut feeling.",
    icon: "/images/icons/scenario.png",
  },
  {
    title: "Consistency & Compliance",
    description:
      "Enforce internal consistency and support compliance by validating your input data automatically. Reduce reporting risk and rework.",
    icon: "/images/icons/compliance.png",
  },
  {
    title: "Parallel Pressure Analysis",
    description:
      "Understand how parallel trade dynamics impact price formation. Use portfolio heatmaps to identify pressure points and adjust discounts with confidence.",
    icon: "/images/icons/heatmap.png",
  },
  {
    title: "Frictionless Uploads, Instant Insights",
    description:
      "No heavy implementation. Upload Excel or CSV in the standard template and get interactive dashboards and charts within seconds.",
    icon: "/images/icons/dashboard.png",
  },
];

export default function FeaturesPageEN() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <header className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Features that Deliver Measurable Results
        </h1>
        <p className="text-lg text-gray-600">
          PharmaGtN helps pharma manufacturers optimize{" "}
          <strong>gross-to-net</strong> and discount policies. From insight to
          action—our tools translate data into margin.
        </p>
      </header>

      {/* Features grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((f, i) => (
          <div
            key={i}
            className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition"
          >
            {f.icon && (
              <div className="mb-4">
                <Image
                  src={f.icon}
                  alt={f.title}
                  width={48}
                  height={48}
                  className="mx-auto"
                />
              </div>
            )}
            <h2 className="text-xl font-semibold mb-2 text-center">{f.title}</h2>
            <p className="text-gray-600 text-sm text-center">{f.description}</p>
          </div>
        ))}
      </div>

      {/* SEO section with specific use cases */}
      <section className="mt-16 grid md:grid-cols-2 gap-8">
        <div className="rounded-xl border p-6">
          <h3 className="text-lg font-semibold mb-2">Why it matters</h3>
          <p className="text-sm text-gray-600">
            GTN optimization directly impacts earnings. With consistent discount
            policies per channel and customer segment, you avoid margin erosion
            and uncover pricing headroom in your portfolio.
          </p>
        </div>
        <div className="rounded-xl border p-6">
          <h3 className="text-lg font-semibold mb-2">Typical outcomes</h3>
          <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
            <li>Transparent GTN waterfall by product, customer, and channel</li>
            <li>Comparable discount logic across hospitals, pharmacies, wholesalers</li>
            <li>Faster pricing decisions via prebuilt scenarios</li>
            <li>Reduced leakage and improved net revenue</li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">
          Ready to accelerate your Gross-to-Net optimization?
        </h2>
        <p className="text-gray-600 mb-6">
          Request a short demo and see how quickly PharmaGtN turns raw data into
          actionable insights.
        </p>
        <a
          href="/en/contact"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
        >
          Request a demo
        </a>
      </div>
    </section>
  );
}
