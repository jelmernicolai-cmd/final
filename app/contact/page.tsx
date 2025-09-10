// app/contact/page.tsx
export const metadata = {
  title: "Contact",
  description: "Neem contact op voor een demo of offerte.",
};

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-12 pb-20">
      <h1 className="text-3xl md:text-4xl font-semibold">Contact</h1>
      <p className="mt-3 text-slate-700">Plan een demo of vraag een offerte aan. We reageren snel.</p>

      <form className="mt-8 space-y-4 rounded-2xl border bg-white p-6"
            action="/api/contact" method="post">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm">Naam</label>
            <input name="name" required className="mt-1 w-full rounded-xl border px-3 py-2" />
          </div>
          <div>
            <label className="text-sm">E-mail</label>
            <input type="email" name="email" required className="mt-1 w-full rounded-xl border px-3 py-2" />
          </div>
        </div>
        <div>
          <label className="text-sm">Bedrijf</label>
          <input name="company" className="mt-1 w-full rounded-xl border px-3 py-2" />
        </div>
        <div>
          <label className="text-sm">Bericht</label>
          <textarea name="message" rows={5} className="mt-1 w-full rounded-xl border px-3 py-2" />
        </div>
        <button className="rounded-xl border px-4 py-2 hover:bg-slate-50">Verzenden</button>
        <p className="text-xs text-slate-500">Door te verzenden ga je akkoord met verwerking van je gegevens t.b.v. opvolging.</p>
      </form>
    </section>
  );
}
