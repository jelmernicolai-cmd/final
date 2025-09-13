"use client";

import React, { useEffect, useMemo, useState } from "react";

const fmtEUR = (n: number, d = 2) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: d, minimumFractionDigits: d })
    .format(isFinite(n) ? n : 0);
const fmtPct = (n: number, d = 0) =>
  `${new Intl.NumberFormat("nl-NL", { maximumFractionDigits: d, minimumFractionDigits: d }).format(n)}%`;

type DomainBand = { median: number; p10: number; p90: number };
type Bands = { extramuraal: DomainBand; intramuraal: DomainBand };
type PublicRow = { name: string; withoutArr: number; realized: number; year: number };
type AddOnRow = { zi: string; name: string; indication: string; maxTariff?: number; status: string };

const BANDS_2023: Bands = {
  extramuraal: { median: 36, p10: 28, p90: 44 },
  intramuraal: { median: 32, p10: 25, p90: 40 },
};

export default function Client() {
  const [bands] = useState(BANDS_2023);

  // VWS bijlage → publieke kortingen
  const [vwsUrl, setVwsUrl] = useState("");
  const [vwsLoading, setVwsLoading] = useState(false);
  const [vwsError, setVwsError] = useState<string | null>(null);
  const [publicRows, setPublicRows] = useState<PublicRow[]>([]);

  // Farmatec add-ons (live scraping)
  const [addons, setAddons] = useState<AddOnRow[]>([]);
  const [addonLoading, setAddonLoading] = useState(true);
  const [addonError, setAddonError] = useState<string | null>(null);
  const [qAddOn, setQAddOn] = useState("");

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
      const res = await fetch("/api/discounts", { // <- let op: route-naam
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const payload = await res.json();
      // zeer eenvoudige check (ipv zod)
      if (!payload || typeof payload.year !== "number" || !Array.isArray(payload.rows)) {
        throw new Error("Onverwacht antwoord van parser.");
      }
      const rows = payload.rows
        .filter((r: any) => r && typeof r.name === "string" && typeof r.withoutArr === "number" && typeof r.realized === "number")
        .map((r: any) => ({ ...r, year: payload.year })) as PublicRow[];
      setPublicRows(rows);
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
            Publieke VWS-kortingen per middel · Farmatec add-ons · Scenario’s met jouw referentie (geen Z-Index nodig).
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-1">Publiek</span>
          <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1">Afgeleid</span>
        </span>
      </header>

      {/* KPI + Scenario */}
      <section className="grid gap-4 md:grid-cols-3 mt-6">
        <Card title="Domeinband · Extramuraal" badge="Afgeleid">
          <p className="text-3xl font-semibold">{fmtPct(d.median, 0)}</p>
          <p className="text-xs text-slate-600">Band: {fmtPct(28)} – {fmtPct(44)}</p>
        </Card>
        <Card title="Domeinband · Intramuraal" badge="Afgeleid">
          <p className="text-3xl font-semibold">{fmtPct(32, 0)}</p>
          <p className="text-xs text-slate-600">Band: {fmtPct(25)} – {fmtPct(40)}</p>
        </Card>
        <Card title="Scenario · naar mediaan band">
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isIntra} onChange={(e)=>setIsIntra(e.target.checked)} />
              Intramuraal
            </label>
            <input className="border rounded-xl px-3 py-2 flex-1 min-w-[140px]" placeholder="Referentie (AIP/Wgp/Deal) €"
              value={ref} onChange={(e)=>setRef(e.target.value)} />
            <input className="border rounded-xl px-3 py-2 flex-1 min-w-[140px]" placeholder="Jouw netto €"
              value={cur} onChange={(e)=>setCur(e.target.value)} />
            <input className="border rounded-xl px-3 py-2 flex-1 min-w-[120px]" placeholder="Volume (stuks)"
              value={vol} onChange={(e)=>setVol(e.target.value)} />
          </div>
          <div className="mt-3 rounded-xl bg-slate-50 border p-3 text-sm">
            {!isFinite(refN) || !isFinite(curN) || !isFinite(volN)
              ? <span className="text-slate-600">Vul referentie, jouw prijs en volume in.</span>
              : <div className="space-y-1">
                  <div><b>{isIntra? "Intramuraal":"Extramuraal"}</b> mediaan: <span className="rounded bg-emerald-100 text-emerald-700 px-2 py-0.5">{fmtPct(d.median,0)}</span></div>
                  <div>Huidige korting: <b>{fmtPct((currentDisc||0)*100,0)}</b></div>
                  <div>Doel-nettoprijs: <b>{fmtEUR(targetPrice,2)}</b></div>
                  <div>Potentiële marge: <b className={(deltaTot??0)>=0 ? "text-emerald-700":"text-red-700"}>{fmtEUR(deltaTot,2)}</b> bij volume {isFinite(volN)? volN.toLocaleString("nl-NL"):"—"}</div>
                </div>}
          </div>
        </Card>
      </section>

      {/* VWS-parser */}
      <Card className="mt-6" title="Publieke korting per middel (VWS-bijlage)" badge="Publiek"
        subtitle="Plak de officiële PDF-link; of stel VWS_BIJLAGE_URL in.">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <input className="border rounded-xl px-3 py-2 min-w-[260px]"
            placeholder="https://…/Bijlage_Uitgaven_per_geneesmiddel_2023.pdf"
            value={vwsUrl} onChange={(e)=>setVwsUrl(e.target.value)} />
          <button onClick={runVwsParse} className="rounded-xl bg-slate-900 text-white px-4 py-2">Parse</button>
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
              {vwsLoading && <tr><td colSpan={4} className="py-6 text-center">Bezig met parsen…</td></tr>}
              {!vwsLoading && publicRows.length===0 && (
                <tr><td colSpan={4} className="py-6 text-center text-slate-500">Geen data. Voer een PDF-link in.</td></tr>
              )}
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
      </Card>

      {/* Farmatec add-ons */}
      <section className="grid gap-4 md:grid-cols-2 mt-6">
        <Card title="Add-on geneesmiddelen · monitor" badge="Publiek">
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
                    <td className="py-2"><span className="text-xs rounded-full px-2 py-1 bg-slate-100 text-slate-700">{r.status}</span></td>
                  </tr>
                ))}
                {!addonLoading && !addonError && addOnFiltered.length===0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-slate-500">Geen resultaten.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-2">NZa-maximumtarief is AIP-gebaseerd en ≤ Wgp-maximum.</p>
        </Card>

        <Card title="Bronnen & transparantie">
          <ul className="mt-2 text-sm list-disc pl-5 space-y-1">
            <li><b>VWS-bijlage</b> “Uitgaven per geneesmiddel” (PDF) → publieke korting per middel.</li>
            <li><b>Farmatec add-ons</b> (Excel) → ZI/naam/indicatie/max-tarief waar beschikbaar.</li>
            <li><b>Domeinbanden</b> = afgeleid uit VWS-totalen (extra ±36%, intra ±32%).</li>
            <li><b>Scenario’s</b> werken met jouw eigen referentie (AIP/Wgp/Deal).</li>
          </ul>
          <p className="text-xs text-slate-500 mt-3">Laatst bijgewerkt: {new Date().toLocaleDateString("nl-NL")}</p>
        </Card>
      </section>
    </div>
  );
}

function Card({ title, subtitle, badge, className, children }:{
  title: string; subtitle?: string; badge?: string; className?: string; children: React.ReactNode
}) {
  return (
    <section className={`rounded-2xl border p-4 bg-white shadow-sm ${className||""}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-slate-600">{subtitle}</p>}
        </div>
        {badge && <span className="text-xs rounded-full bg-slate-100 text-slate-700 px-2 py-1">{badge}</span>}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}
