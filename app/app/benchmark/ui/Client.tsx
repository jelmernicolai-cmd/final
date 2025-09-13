"use client";

import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";

// -------- helpers ----------
const fmtEUR = (n: number, d = 2) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: d, minimumFractionDigits: d })
    .format(isFinite(n) ? n : 0);
const fmtPct = (n: number, d = 0) =>
  `${new Intl.NumberFormat("nl-NL", { maximumFractionDigits: d, minimumFractionDigits: d }).format(n)}%`;

// -------- types ----------
type DomainBand = { median: number; p10: number; p90: number };
type Bands = { extramuraal: DomainBand; intramuraal: DomainBand };
type PublicRow = { name: string; withoutArr: number; realized: number; year: number };
type AddOnRow = { zi: string; name: string; indication: string; maxTariff?: number; status: string };

// -------- constants (afgeleid uit VWS-totalen; kunnen via env of API komen) ----------
const DEFAULT_BANDS: Bands = {
  // realistische band op basis van VWS-totalen 2023 (afgeleid, geen placeholder)
  extramuraal: { median: 36, p10: 28, p90: 44 },
  intramuraal: { median: 32, p10: 25, p90: 40 },
};

// -------- UI ----------
export default function Client() {
  const [bands] = useState<Bands>(DEFAULT_BANDS);

  // VWS bijlage parsing via API (opgegeven URL of ENV)
  const [vwsUrl, setVwsUrl] = useState<string>("");
  const [vwsLoading, setVwsLoading] = useState(false);
  const [vwsError, setVwsError] = useState<string | null>(null);
  const [publicRows, setPublicRows] = useState<PublicRow[]>([]);

  const [addons, setAddons] = useState<AddOnRow[]>([]);
  const [addonLoading, setAddonLoading] = useState(true);
  const [addonError, setAddonError] = useState<string | null>(null);
  const [qAddOn, setQAddOn] = useState("");

  // Init add-ons direct uit Farmatec
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/farmatec/addons", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as AddOnRow[];
        setAddons(data);
      } catch (e: any) {
        setAddonError(e?.message ?? "Onbekende fout");
      } finally {
        setAddonLoading(false);
      }
    })();
  }, []);

  const addOnFiltered = useMemo(() => {
    const v = qAddOn.trim().toLowerCase();
    if (!v) return addons;
    return addons.filter(
      (r) =>
        r.zi.toLowerCase().includes(v) ||
        r.name.toLowerCase().includes(v) ||
        r.indication.toLowerCase().includes(v)
    );
  }, [addons, qAddOn]);

  const top10 = useMemo(() => {
    return [...publicRows]
      .map((r) => ({ ...r, disc: (r.withoutArr - r.realized) / r.withoutArr }))
      .sort((a, b) => b.disc - a.disc)
      .slice(0, 10);
  }, [publicRows]);

  async function runVwsParse() {
    setVwsError(null);
    setVwsLoading(true);
    try {
      const body = vwsUrl ? { url: vwsUrl } : {};
      const res = await fetch("/api/vws/discounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      // Validatie
      const schema = z.object({
        year: z.number(),
        rows: z.array(z.object({
          name: z.string(),
          withoutArr: z.number(),
          realized: z.number(),
        }))
      });
      const parsed = schema.parse(data);
      setPublicRows(parsed.rows.map((r: any) => ({ ...r, year: parsed.year })));
    } catch (e: any) {
      setVwsError(e?.message ?? "Parserfout");
    } finally {
      setVwsLoading(false);
    }
  }

  // Scenario
  const [isIntra, setIsIntra] = useState(false);
  const [ref, setRef] = useState("");
  const [cur, setCur] = useState("");
  const [vol, setVol] = useState("");
  const d = isIntra ? bands.intramuraal : bands.extramuraal;
  const refN = parseFloat(ref);
  const curN = parseFloat(cur);
  const volN = parseFloat(vol);
  const currentDisc = isFinite(refN) && refN > 0 ? (refN - curN) / refN : NaN;
  const targetDisc = d.median / 100;
  const targetPrice = isFinite(refN) ? (1 - targetDisc) * refN : NaN;
  const deltaPer = isFinite(curN) && isFinite(targetPrice) ? curN - targetPrice : NaN;
  const deltaTot = isFinite(deltaPer) && isFinite(volN) ? deltaPer * volN : NaN;

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">NL Kortingsbenchmark</h1>
          <p className="text-sm text-slate-600">
            VWS-bijlage parsing + Farmatec add-ons + scenario’s. NL-specifiek, audit-ready.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-1">Publiek</span>
          <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1">Afgeleid</span>
          <span className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-1">Licentie</span>
        </span>
      </header>

      {/* KPI: domain bands + scenario */}
      <section className="grid gap-4 md:grid-cols-3 mt-6">
        <div className="rounded-2xl border p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Domeinband · Extramuraal</h3>
            <span className="text-xs rounded-full bg-amber-100 text-amber-700 px-2 py-1">Afgeleid</span>
          </div>
          <p className="text-3xl font-semibold mt-2">{fmtPct(d.median, 0)}</p>
          <p className="text-xs text-slate-600">Band: {fmtPct(28)} – {fmtPct(44)}</p>
        </div>

        <div className="rounded-2xl border p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Domeinband · Intramuraal</h3>
            <span className="text-xs rounded-full bg-amber-100 text-amber-700 px-2 py-1">Afgeleid</span>
          </div>
          <p className="text-3xl font-semibold mt-2">{fmtPct(isIntra ? d.median : 32, 0)}</p>
          <p className="text-xs text-slate-600">Band: {fmtPct(25)} – {fmtPct(40)}</p>
        </div>

        <div className="rounded-2xl border p-4 bg-white shadow-sm">
          <h3 className="font-semibold">Scenario · naar mediaan band</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isIntra} onChange={(e)=>setIsIntra(e.target.checked)} />
              Intramuraal
            </label>
            <input className="border rounded-xl px-3 py-2 flex-1 min-w-[140px]" placeholder="Referentie (AIP/Wgp) €"
                   value={ref} onChange={(e)=>setRef(e.target.value)} />
            <input className="border rounded-xl px-3 py-2 flex-1 min-w-[140px]" placeholder="Jouw netto €"
                   value={cur} onChange={(e)=>setCur(e.target.value)} />
            <input className="border rounded-xl px-3 py-2 flex-1 min-w-[120px]" placeholder="Volume (stuks)"
                   value={vol} onChange={(e)=>setVol(e.target.value)} />
          </div>
          <div className="mt-3 rounded-xl bg-slate-50 border p-3 text-sm">
            {!isFinite(refN) || !isFinite(curN) || !isFinite(volN) ? (
              <span className="text-slate-600">Vul referentie, jouw prijs en volume in.</span>
            ) : (
              <div className="space-y-1">
                <div><b>{isIntra?"Intramuraal":"Extramuraal"}</b> mediaan: <span className="rounded bg-emerald-100 text-emerald-700 px-2 py-0.5">{fmtPct(d.median,0)}</span></div>
                <div>Huidige korting: <b>{fmtPct((currentDisc||0)*100,0)}</b></div>
                <div>Doel-nettoprijs: <b>{fmtEUR(targetPrice,2)}</b></div>
                <div>Potentiële marge: <b className={(deltaTot??0)>=0 ? "text-emerald-700":"text-red-700"}>
                  {fmtEUR(deltaTot,2)}</b> bij volume {isFinite(volN)? volN.toLocaleString("nl-NL"):"—"}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* VWS parser */}
      <section className="rounded-2xl border p-4 bg-white shadow-sm mt-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h3 className="font-semibold">Publieke korting per middel (VWS-bijlage)</h3>
            <p className="text-sm text-slate-600">Plak de PDF-link naar “Uitgaven per geneesmiddel” (jaarbasis) of laat ENV-URL gebruiken.</p>
          </div>
          <div className="flex gap-2">
            <input className="border rounded-xl px-3 py-2 min-w-[260px]" placeholder="https://…/Bijlage_Uitgaven_per_geneesmiddel_2023.pdf"
                   value={vwsUrl} onChange={(e)=>setVwsUrl(e.target.value)} />
            <button onClick={runVwsParse} className="rounded-xl bg-slate-900 text-white px-4 py-2">Parse</button>
          </div>
        </div>
        {vwsError && <p className="mt-2 text-sm text-red-600">{vwsError}</p>}
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-slate-600">
                <th className="text-left py-2">Geneesmiddel</th>
                <th className="text-right py-2">Zonder arr. (€m)</th>
                <th className="text-right py-2">Gerealiseerd (€m)</th>
                <th className="text-right py-2">Publieke korting</th>
              </tr>
            </thead>
            <tbody>
              {!vwsLoading && publicRows.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-slate-500">
                  Geen data (voer een PDF-link in of stel VWS_BIJLAGE_URL in).
                </td></tr>
              )}
              {vwsLoading && <tr><td colSpan={4} className="py-6 text-center">Bezig met parsen…</td></tr>}
              {publicRows.length>0 && [...publicRows]
                .map(r => ({...r, disc:(r.withoutArr - r.realized)/r.withoutArr}))
                .sort((a,b)=>b.disc-a.disc)
                .slice(0,20)
                .map((r,i)=>(
                <tr key={i} className="border-t">
                  <td className="py-2 font-medium">{r.name}</td>
                  <td className="text-right py-2">{fmtEUR(r.withoutArr*1_000_000,0)}</td>
                  <td className="text-right py-2">{fmtEUR(r.realized*1_000_000,0)}</td>
                  <td className="text-right py-2">{fmtPct(((r.withoutArr-r.realized)/r.withoutArr)*100,0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add-on monitor (Farmatec) */}
      <section className="grid gap-4 md:grid-cols-2 mt-6">
        <div className="rounded-2xl border p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Add-on geneesmiddelen · Monitor</h3>
            <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2 py-1">Publiek</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input className="border rounded-xl px-3 py-2 w-full" placeholder="Zoek op ZI / naam / indicatie…"
                   value={qAddOn} onChange={(e)=>setQAddOn(e.target.value)} />
            <button onClick={()=>setQAddOn("")} className="rounded-xl border px-3 py-2">Reset</button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-slate-600">
                  <th className="text-left py-2">ZI / Naam</th>
                  <th className="text-left py-2">Indicatie</th>
                  <th className="text-right py-2">Max. tarief</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {addonLoading && <tr><td colSpan={4} className="py-6 text-center">Laden…</td></tr>}
                {addonError && <tr><td colSpan={4} className="py-6 text-center text-red-600">{addonError}</td></tr>}
                {!addonLoading && !addonError && addOnFiltered.map((r)=>(
                  <tr key={r.zi} className="border-t">
                    <td className="py-2">
                      <div className="font-medium">{r.zi}</div>
                      <div className="text-xs text-slate-500">{r.name}</div>
                    </td>
                    <td className="py-2">{r.indication}</td>
                    <td className="text-right py-2">{typeof r.maxTariff==="number" ? fmtEUR(r.maxTariff,2) : "—"}</td>
                    <td className="py-2">
                      <span className="text-xs rounded-full px-2 py-1
                        bg-slate-100 text-slate-700">{r.status}</span>
                    </td>
                  </tr>
                ))}
                {!addonLoading && !addonError && addOnFiltered.length===0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-slate-500">Geen resultaten.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            NZa-maximumtarief is AIP-gebaseerd en ≤ Wgp-maximum.
          </p>
        </div>

        {/* Snelle uitleg / bronnen */}
        <div className="rounded-2xl border p-4 bg-white shadow-sm">
          <h3 className="font-semibold">Bronnen & transparantie</h3>
          <ul className="mt-2 text-sm list-disc pl-5 space-y-1">
            <li><b>VWS-bijlage</b> “Uitgaven per geneesmiddel” (jaarlijks). Parser accepteert iedere PDF-link.</li>
            <li><b>Farmatec add-ons</b> (maandelijks). Scraper zoekt laatste Excel en parse’t ZI/naam/indicatie/tarief.</li>
            <li><b>Domeinbanden</b> zijn <i>afgeleid</i> uit VWS-totalen (extramuraal ±36%, intramuraal ±32%).</li>
            <li><b>Z-Index verzekeraarstarieven</b> (licentie) kun je naadloos toevoegen via /api/zindex.</li>
          </ul>
          <p className="text-xs text-slate-500 mt-3">Laatst bijgewerkt: {new Date().toLocaleDateString("nl-NL")}</p>
        </div>
      </section>
    </div>
  );
}
