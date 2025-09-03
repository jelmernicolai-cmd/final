// app/en/templates/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Templates | PharmaGtN",
  description:
    "Download Excel templates for self-service upload: prices, discounts, volumes and waterfall mapping.",
};

const files = [
  { name: "PharmaGtN_Products.xlsx", href: "/templates/PharmaGtN_Products.xlsx", size: "22 KB" },
  { name: "PharmaGtN_Customers.xlsx", href: "/templates/PharmaGtN_Customers.xlsx", size: "18 KB" },
  { name: "PharmaGtN_Transactions.xlsx", href: "/templates/PharmaGtN_Transactions.xlsx", size: "28 KB" },
  { name: "PharmaGtN_WaterfallMapping.xlsx", href: "/templates/PharmaGtN_WaterfallMapping.xlsx", size: "16 KB" },
  { name: "PharmaGtN_Onboarding.pdf", href: "/templates/PharmaGtN_Onboarding.pdf", size: "120 KB" },
];

export default function TemplatesEN() {
  return (
    <main>
      <section className="bg-gradient-to-b from-sky-50 to-white border-b">
        <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
          <h1 className="text-3xl md:text-5xl font-bold">Templates</h1>
          <p className="mt-4 text-gray-700">
            Use these templates to upload your data to the <strong>GtN Portal</strong>.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-2xl border bg-white divide-y">
          {files.map((f) => (
            <div key={f.name} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{f.name}</div>
                <div className="text-xs text-gray-500">{f.size}</div>
              </div>
              <a href={f.href} className="px-4 py-2 rounded-lg border hover:bg-gray-50">
                Download
              </a>
            </div>
          ))}
        </div>

        <div className="mt-8 text-sm text-gray-700">
          <p>
            Minimum fields: <strong>ProductID</strong>, <strong>CustomerID</strong>, <strong>Period</strong>,
            <strong> Volume</strong>, <strong>GrossPrice</strong>, <strong>Discount/Bonus/Fees</strong>.
          </p>
          <p className="mt-2">
            Need help? <Link href="/en/contact" className="text-sky-700 underline">Contact us</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
