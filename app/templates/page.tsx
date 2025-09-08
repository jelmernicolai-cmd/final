// app/templates/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Templates | PharmaGtN",
  description:
    "Download Excel-templates voor self-service upload: prijzen, kortingen, volumes en waterfall-mapping.",
};

const files = 
  
  { name: "PharmaGtN_Producten.xlsx", href: "/templates/PharmaGtN_Producten.xlsx", size: "22 KB" },
  { name: "NL_Farma_Waterfall_Consistency_Template.xlsx", 
    href: "/templates/NL_Farma_Waterfall_Consistency_Template.xlsx", 
    size: "~250 KB" 
  { name: "PharmaGtN_Onboarding.pdf", href: "/templates/PharmaGtN_Onboarding.pdf", size: "120 KB" },
];

export default function TemplatesNL() {
  return (
    <main>
      <section className="bg-gradient-to-b from-sky-50 to-white border-b">
        <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
          <h1 className="text-3xl md:text-5xl font-bold">Templates</h1>
          <p className="mt-4 text-gray-700">
            Gebruik deze templates om je data te uploaden naar de <strong>GtN Portal</strong>.
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
            Minimale velden: <strong>ProductID</strong>, <strong>KlantID</strong>, <strong>Periode</strong>,
            <strong> Volume</strong>, <strong>Brutoprijs</strong>, <strong>Korting/Bonus/Fees</strong>.
          </p>
          <p className="mt-2">
            Hulp nodig? <Link href="/contact" className="text-sky-700 underline">Neem contact op</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
