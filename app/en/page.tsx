// app/en/page.tsx
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Make Gross-to-Net Transparent & Actionable | PharmaGtN",
  description:
    "PharmaGtN gives pharma manufacturers clear GTN waterfalls, discount consistency checks and parallel pressure insights. Upload data, get decisions.",
};

export default function HomeEN() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">
              Turn <span className="underline decoration-sky-300">Gross-to-Net</span> into decisions.
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              One portal for pricing & discounts across hospitals, pharmacies and wholesalers.
              Upload your data, get actionable insights and improve ROI.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/pricing" className="bg-sky-600 text-white px-5 py-3 rounded-lg hover:bg-sky-700">
                Try PharmaGtN
              </Link>
              <Link href="/en/features" className="px-5 py-3 rounded-lg border hover:bg-gray-50">
                See features
              </Link>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              ROI promise: at least €100,000 in additional value from discount policy optimization.
            </p>
          </div>
          <div className="relative">
            <Image
              src="/images/hero-dashboard.png"
              alt="PharmaGtN dashboard overview"
              width={1200}
              height={800}
              className="w-full rounded-xl border shadow-sm"
              priority
            />
          </div>
        </div>
      </section>

      {/* The remaining sections mirror the NL page, adapted to English copy */}
      {/* ...for brevity you can duplicate the NL blocks and translate headings & text */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <div className="rounded-2xl border bg-white p-8 md:p-10">
          <h2 className="text-2xl md:text-3xl font-bold">Ready to optimise your GTN?</h2>
          <p className="mt-3 text-gray-700">
            Start with the GtN Portal and make your discount policy provably consistent and profitable.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link href="/pricing" className="bg-sky-600 text-white px-5 py-3 rounded-lg hover:bg-sky-700">
              Buy licence
            </Link>
            <Link href="/contact" className="px-5 py-3 rounded-lg border hover:bg-gray-50">
              Book a demo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
