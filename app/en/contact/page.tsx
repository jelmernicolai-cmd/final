// app/en/contact/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Contact | PharmaGtN",
  description:
    "Contact PharmaGtN for demos, licences and enterprise options.",
};

export default function ContactEN() {
  return (
    <main>
      <section className="bg-gradient-to-b from-sky-50 to-white border-b">
        <div className="mx-auto max-w-5xl px-4 py-12 md:py-16 text-center">
          <h1 className="text-3xl md:text-5xl font-bold">Contact</h1>
          <p className="mt-4 text-gray-700">
            Book a demo or ask a question. We typically reply within one business day.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 grid md:grid-cols-3 gap-6">
        <div className="rounded-2xl border p-6 bg-white">
          <h2 className="font-semibold">E-mail</h2>
          <p className="mt-2 text-sm text-gray-700">
            Sales & support:
            <br />
            <a className="text-sky-700 underline break-all" href="mailto:sales@pharmgtn.com">
              sales@pharmgtn.com
            </a>
          </p>
        </div>
        <div className="rounded-2xl border p-6 bg-white">
          <h2 className="font-semibold">Book a demo</h2>
          <p className="mt-2 text-sm text-gray-700">
            Get a live walkthrough of the GtN Portal using your use case.
          </p>
          <div className="mt-4">
            <Link href="/pricing" className="inline-block bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700">
              View licence & book
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border p-6 bg-white">
          <h2 className="font-semibold">Documentation</h2>
          <p className="mt-2 text-sm text-gray-700">
            Download Excel templates and the onboarding guide.
          </p>
          <div className="mt-4">
            <Link href="/templates" className="inline-block border px-4 py-2 rounded-lg hover:bg-gray-50">
              Go to templates
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 border-t">
        <div className="mx-auto max-w-5xl px-4 py-12 grid md:grid-cols-2 gap-6">
          {[
            {
              q: "How fast can we go live?",
              a: "Self-service: 1–2 days with our templates. Enterprise integrations on request.",
            },
            {
              q: "Do you process PII/health data?",
              a: "No. Only transaction/price data at product/customer-segment level (data minimisation).",
            },
            {
              q: "EU hosting supported?",
              a: "Yes. EU hosting option with encryption in transit and at rest.",
            },
            {
              q: "Can we sign an NDA?",
              a: "Absolutely. Send your standard NDA; we typically sign within 2 business days.",
            },
          ].map((item) => (
            <div key={item.q} className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">{item.q}</h3>
              <p className="mt-2 text-sm text-gray-700">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
