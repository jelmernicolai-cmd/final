// app/app/settings/page.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const metadata = {
  title: "Instellingen | PharmaGtN",
  description:
    "Beheer je profiel, organisatie, voorkeuren, notificaties en integraties voor de PharmaGtN Portal.",
};

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-2xl border bg-white p-6">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
        </div>
        <a href={`#${id}`} className="text-xs text-gray-400 hover:text-gray-600">#</a>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  id,
  children,
  hint,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { name?: string | null; email?: string | null } | undefined;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Instellingen</h1>
          <p className="mt-1 text-sm text-gray-600">
            Beheer je profiel, organisatie, voorkeuren, notificaties en integraties.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app" className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">
            Terug naar Portal
          </Link>
          <Link href="/billing" className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">
            Billing & licentie
          </Link>
        </div>
      </div>

      {!session ? (
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-gray-700">Log eerst in om instellingen te beheren.</p>
          <div className="mt-4 flex gap-3">
            <Link href="/login" className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700">
              Inloggen
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[220px,1fr]">
          {/* Sidebar */}
          <nav className="rounded-2xl border bg-white p-4 text-sm sticky top-4 h-fit">
            <ul className="space-y-2">
              <li><a className="hover:underline" href="#profiel">Profiel</a></li>
              <li><a className="hover:underline" href="#organisatie">Organisatie</a></li>
              <li><a className="hover:underline" href="#voorkeuren">Voorkeuren</a></li>
              <li><a className="hover:underline" href="#notificaties">Notificaties</a></li>
              <li><a className="hover:underline" href="#data-privacy">Data & privacy</a></li>
              <li><a className="hover:underline" href="#integraties">Integraties</a></li>
              <li><a className="hover:underline" href="#billing">Billing</a></li>
              <li><a className="hover:underline text-red-600" href="#danger">Danger zone</a></li>
            </ul>
          </nav>

          {/* Content */}
          <div className="grid gap-6">
            {/* Profiel */}
            <Section
              id="profiel"
              title="Profiel"
              subtitle="Je naam en inloggegevens. E-mail is je account-ID."
            >
              <form action="/api/settings/profile" method="POST" className="grid gap-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Naam" id="name">
                    <input
                      id="name"
                      name="name"
                      defaultValue={user?.name ?? ""}
                      className="w-full rounded-lg border px-3 py-2"
                      required
                    />
                  </Field>

                  <Field label="E-mail" id="email" hint="Aanpassen via support of SSO.">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={user?.email ?? ""}
                      className="w-full rounded-lg border px-3 py-2 bg-gray-50"
                      readOnly
                    />
                  </Field>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <Field label="Taal" id="locale" hint="Interface-taal">
                    <select id="locale" name="locale" className="w-full rounded-lg border px-3 py-2">
                      <option value="nl-NL">Nederlands (NL)</option>
                      <option value="en-GB">English (UK)</option>
                    </select>
                  </Field>

                  <Field label="Tijdzone" id="tz">
                    <select id="tz" name="timezone" className="w-full rounded-lg border px-3 py-2" defaultValue="Europe/Amsterdam">
                      <option value="Europe/Amsterdam">Europe/Amsterdam</option>
                      <option value="Europe/Brussels">Europe/Brussels</option>
                      <option value="Europe/Berlin">Europe/Berlin</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </Field>

                  <Field label="Thema" id="theme">
                    <select id="theme" name="theme" className="w-full rounded-lg border px-3 py-2">
                      <option value="system">Systeem</option>
                      <option value="light">Licht</option>
                      <option value="dark">Donker</option>
                    </select>
                  </Field>
                </div>

                <div className="flex gap-3">
                  <button className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700" type="submit">
                    Opslaan
                  </button>
                  <Link href="/login" className="rounded-lg border px-4 py-2 hover:bg-gray-50">
                    Wachtwoord wijzigen / SSO
                  </Link>
                </div>
              </form>
            </Section>

            {/* Organisatie */}
            <Section
              id="organisatie"
              title="Organisatie"
              subtitle="Naam en defaults voor je juridische entiteit."
            >
              <form action="/api/settings/org" method="POST" className="grid gap-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Organisatienaam" id="orgName">
                    <input id="orgName" name="orgName" className="w-full rounded-lg border px-3 py-2" required />
                  </Field>
                  <Field label="Entiteit-code" id="entityCode" hint="Bijv. NL01 of BE-Consumer">
                    <input id="entityCode" name="entityCode" className="w-full rounded-lg border px-3 py-2" />
                  </Field>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <Field label="Land" id="country">
                    <select id="country" name="country" className="w-full rounded-lg border px-3 py-2">
                      <option value="NL">Nederland</option>
                      <option value="BE">België</option>
                      <option value="DE">Duitsland</option>
                      <option value="EU">EU</option>
                    </select>
                  </Field>
                  <Field label="BTW/VAT nr." id="vat">
                    <input id="vat" name="vat" className="w-full rounded-lg border px-3 py-2" />
                  </Field>
                  <Field label="Standaard valuta" id="currency">
                    <select id="currency" name="currency" className="w-full rounded-lg border px-3 py-2" defaultValue="EUR">
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="USD">USD</option>
                    </select>
                  </Field>
                </div>

                <button className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700" type="submit">
                  Opslaan
                </button>
              </form>
            </Section>

            {/* Voorkeuren */}
            <Section
              id="voorkeuren"
              title="Voorkeuren"
              subtitle="Weergave van getallen, data en grafieken."
            >
              <form action="/api/settings/preferences" method="POST" className="grid gap-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <Field label="Getalnotatie" id="numberFormat" hint="Bijv. 1.234,56 of 1,234.56">
                    <select id="numberFormat" name="numberFormat" className="w-full rounded-lg border px-3 py-2" defaultValue="nl-NL">
                      <option value="nl-NL">nl-NL (1.234,56)</option>
                      <option value="en-GB">en-GB (1,234.56)</option>
                    </select>
                  </Field>
                  <Field label="Datumnotatie" id="dateFormat">
                    <select id="dateFormat" name="dateFormat" className="w-full rounded-lg border px-3 py-2" defaultValue="YYYY-MM">
                      <option value="YYYY-MM">YYYY-MM</option>
                      <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </Field>
                  <Field label="Decimalen" id="decimals" hint="Aantal decimalen in tabellen">
                    <select id="decimals" name="decimals" className="w-full rounded-lg border px-3 py-2" defaultValue="0">
                      <option value="0">0</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                    </select>
                  </Field>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <Field label="Default dashboard" id="defaultDash">
                    <select id="defaultDash" name="defaultDash" className="w-full rounded-lg border px-3 py-2">
                      <option value="waterfall">Waterfall</option>
                      <option value="consistency">Consistency</option>
                      <option value="parallel">Parallel</option>
                    </select>
                  </Field>
                  <Field label="Toon uitleg-tooltips" id="tooltips">
                    <select id="tooltips" name="tooltips" className="w-full rounded-lg border px-3 py-2" defaultValue="on">
                      <option value="on">Aan</option>
                      <option value="off">Uit</option>
                    </select>
                  </Field>
                </div>

                <button className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700" type="submit">
                  Opslaan
                </button>
              </form>
            </Section>

            {/* Notificaties */}
            <Section
              id="notificaties"
              title="Notificaties"
              subtitle="Kies welke e-mails je wilt ontvangen."
            >
              <form action="/api/settings/notifications" method="POST" className="grid gap-4">
                <fieldset className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input id="n_upload_ok" name="upload_ok" type="checkbox" className="rounded" defaultChecked />
                    <label htmlFor="n_upload_ok" className="text-sm">Upload succesvol</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="n_upload_fail" name="upload_fail" type="checkbox" className="rounded" defaultChecked />
                    <label htmlFor="n_upload_fail" className="text-sm">Upload mislukt / validatie-fout</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="n_digest" name="weekly_digest" type="checkbox" className="rounded" />
                    <label htmlFor="n_digest" className="text-sm">Wekelijkse samenvatting</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="n_anomaly" name="anomaly_alerts" type="checkbox" className="rounded" />
                    <label htmlFor="n_anomaly" className="text-sm">Anomalie-detectie alerts</label>
                  </div>
                </fieldset>

                <button className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700" type="submit">
                  Opslaan
                </button>
              </form>
            </Section>

            {/* Data & privacy */}
            <Section
              id="data-privacy"
              title="Data & privacy"
              subtitle="Minimaliseer data en beheer audit logging."
            >
              <form action="/api/settings/privacy" method="POST" className="grid gap-4">
                <fieldset className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input id="min" name="data_minimization" type="checkbox" className="rounded" defaultChecked />
                    <label htmlFor="min" className="text-sm">Dataminimalisatie (aanbevolen)</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="audit" name="audit_logging" type="checkbox" className="rounded" />
                    <label htmlFor="audit" className="text-sm">Audit logging</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="pseudo" name="pseudonymize" type="checkbox" className="rounded" defaultChecked />
                    <label htmlFor="pseudo" className="text-sm">Pseudonimiseer klantnamen</label>
                  </div>
                </fieldset>

                <div className="flex flex-wrap gap-3">
                  <a
                    href="/api/export?scope=account"
                    className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Download mijn gegevens
                  </a>
                  <a
                    href="/api/export?scope=org"
                    className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Download organisatiegegevens
                  </a>
                </div>

                <button className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700" type="submit">
                  Opslaan
                </button>
              </form>
            </Section>

            {/* Integraties */}
            <Section
              id="integraties"
              title="Integraties & API"
              subtitle="Configureer webhooks en API-sleutels."
            >
              <div className="grid gap-6">
                <form action="/api/integrations/webhook" method="POST" className="grid gap-4">
                  <Field label="Webhook URL" id="wh_url" hint="Ontvang events (upload, export, scenario) op jouw endpoint.">
                    <input id="wh_url" name="url" placeholder="https://example.com/webhooks/pharmagtn" className="w-full rounded-lg border px-3 py-2" />
                  </Field>
                  <div className="flex gap-3">
                    <button className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700" type="submit">
                      Opslaan
                    </button>
                    <form action="/api/integrations/webhook/test" method="POST">
                      <button className="rounded-lg border px-4 py-2 hover:bg-gray-50" type="submit">
                        Stuur testevent
                      </button>
                    </form>
                  </div>
                </form>

                <div className="rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">API-sleutels</h3>
                      <p className="text-sm text-gray-600">Gebruik voor geautomatiseerde uploads of exports.</p>
                    </div>
                    <form action="/api/keys/create" method="POST">
                      <button className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50" type="submit">
                        Nieuwe key genereren
                      </button>
                    </form>
                  </div>
                  {/* Optioneel: lijst met bestaande keys via server-render */}
                  <p className="mt-3 text-sm text-gray-500">Nog geen API-sleutels.</p>
                </div>
              </div>
            </Section>

            {/* Billing */}
            <Section
              id="billing"
              title="Billing"
              subtitle="Beheer facturen, betaalmethode en opzegging via Stripe Portal."
            >
              <div className="flex flex-wrap gap-3">
                <Link href="/billing" className="rounded-lg border px-4 py-2 hover:bg-gray-50">
                  Ga naar Billing
                </Link>
                <form action="/api/stripe/create-portal-session" method="POST">
                  <button className="rounded-lg border px-4 py-2 hover:bg-gray-50" type="submit">
                    Open Stripe Portal
                  </button>
                </form>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Facturen en betaalmethode beheer je in Stripe. Opzeggen kan via de Portal.
              </p>
            </Section>

            {/* Danger zone */}
            <Section
              id="danger"
              title="Danger zone"
              subtitle="Onomkeerbare acties. Wees voorzichtig."
            >
              <div className="grid gap-4">
                <form action="/api/cache/purge" method="POST" className="rounded-xl border p-4">
                  <h3 className="font-medium">Cache leeghalen</h3>
                  <p className="text-sm text-gray-600">
                    Verwijder lokale cache, bijvoorbeeld bij weergaveproblemen.
                  </p>
                  <button className="mt-3 rounded-lg border px-4 py-2 text-sm hover:bg-gray-50" type="submit">
                    Leeg cache
                  </button>
                </form>

                <form action="/api/account/delete" method="POST" className="rounded-xl border p-4">
                  <h3 className="font-medium text-red-700">Account verwijderen</h3>
                  <p className="text-sm text-gray-600">
                    Dit verwijdert je account en (optioneel) je data volgens het dataminimalisatiebeleid.
                  </p>
                  <div className="mt-2">
                    <label htmlFor="confirm" className="text-sm">Typ <span className="font-mono">VERWIJDER</span> om te bevestigen</label>
                    <input id="confirm" name="confirm" className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="VERWIJDER" />
                  </div>
                  <button className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700" type="submit">
                    Verwijder account
                  </button>
                </form>
              </div>
            </Section>
          </div>
        </div>
      )}
    </main>
  );
}
