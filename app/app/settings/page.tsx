// app/app/settings/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Settings = {
  locale: "nl-NL" | "en-GB";
  dateFormat: "YYYY-MM" | "DD-MM-YYYY";
  decimals: 0 | 1 | 2;
  theme: "system" | "light" | "dark";
  defaultDash: "waterfall" | "consistency" | "parallel";
  dataMin: boolean;
  notifyUploadOk: boolean;
  notifyUploadFail: boolean;
};

const KEY = "pgtn_settings_v1";

const DEFAULTS: Settings = {
  locale: "nl-NL",
  dateFormat: "YYYY-MM",
  decimals: 0,
  theme: "system",
  defaultDash: "waterfall",
  dataMin: true,
  notifyUploadOk: true,
  notifyUploadFail: true,
};

export default function SimpleSettingsPage() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  // Load from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  function save() {
    localStorage.setItem(KEY, JSON.stringify(s));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function reset() {
    setS(DEFAULTS);
    localStorage.setItem(KEY, JSON.stringify(DEFAULTS));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Instellingen</h1>
          <p className="mt-1 text-sm text-gray-600">
            Simpele voorkeuren voor weergave en privacy. Lokaal opgeslagen in je browser.
          </p>
        </div>
        <Link href="/app" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
          Terug naar Portal
        </Link>
      </div>

      {/* Saved toast */}
      {saved && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          Opgeslagen ✅
        </div>
      )}

      <div className="grid gap-6">
        {/* Weergave */}
        <section className="rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-semibold">Weergave</h2>
          <p className="mt-1 text-sm text-gray-600">Taal, datum- en getalnotatie, thema en standaard dashboard.</p>

          <div className="mt-4 grid gap-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Taal">
                <select
                  value={s.locale}
                  onChange={(e) => setS({ ...s, locale: e.target.value as Settings["locale"] })}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="nl-NL">Nederlands (NL)</option>
                  <option value="en-GB">English (UK)</option>
                </select>
              </Field>

              <Field label="Datumnotatie">
                <select
                  value={s.dateFormat}
                  onChange={(e) => setS({ ...s, dateFormat: e.target.value as Settings["dateFormat"] })}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="YYYY-MM">YYYY-MM</option>
                  <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                </select>
              </Field>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Decimalen">
                <select
                  value={s.decimals}
                  onChange={(e) => setS({ ...s, decimals: Number(e.target.value) as Settings["decimals"] })}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </Field>

              <Field label="Thema">
                <select
                  value={s.theme}
                  onChange={(e) => setS({ ...s, theme: e.target.value as Settings["theme"] })}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="system">Systeem</option>
                  <option value="light">Licht</option>
                  <option value="dark">Donker</option>
                </select>
              </Field>

              <Field label="Standaard dashboard">
                <select
                  value={s.defaultDash}
                  onChange={(e) => setS({ ...s, defaultDash: e.target.value as Settings["defaultDash"] })}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="waterfall">Waterfall</option>
                  <option value="consistency">Consistency</option>
                  <option value="parallel">Parallel</option>
                </select>
              </Field>
            </div>
          </div>
        </section>

        {/* Privacy & notificaties */}
        <section className="rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-semibold">Privacy & notificaties</h2>
          <p className="mt-1 text-sm text-gray-600">Alleen wat nodig is.</p>

          <div className="mt-4 grid gap-3">
            <Toggle
              label="Dataminimalisatie (aanbevolen)"
              checked={s.dataMin}
              onChange={(v) => setS({ ...s, dataMin: v })}
            />
            <div className="grid md:grid-cols-2 gap-3">
              <Toggle
                label="E-mail bij geslaagde upload"
                checked={s.notifyUploadOk}
                onChange={(v) => setS({ ...s, notifyUploadOk: v })}
              />
              <Toggle
                label="E-mail bij uploadfout/validatie"
                checked={s.notifyUploadFail}
                onChange={(v) => setS({ ...s, notifyUploadFail: v })}
              />
            </div>
          </div>
        </section>

        {/* Acties */}
        <section className="rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-semibold">Acties</h2>
          <p className="mt-1 text-sm text-gray-600">Opslaan is lokaal. Later kun je dit koppelen aan je server.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={save} className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700">
              Opslaan
            </button>
            <button onClick={reset} className="rounded-lg border px-4 py-2 hover:bg-gray-50">
              Reset naar standaard
            </button>
          </div>
        </section>

        {/* Kleine hint */}
        <p className="text-xs text-gray-500">
          Tip: Wil je serveropslag en team-brede instellingen? Voeg later een POST naar <code>/api/settings</code> toe en
          lees waarden in je formatters/grafieken.
        </p>
      </div>
    </main>
  );
}

/** Kleine UI helpers */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        className="rounded"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}
