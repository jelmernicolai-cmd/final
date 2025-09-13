"use client";

import React, { useEffect, useMemo, useState } from "react";

/** ---------- Types & helpers ---------- */
type PublicRow = { name: string; withoutArr: number; realized: number; year: number };
type AddOnRow = { zi: string; name: string; indication: string; maxTariff?: number; status: string };

const fmtEUR = (n: number, d = 2) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: d, minimumFractionDigits: d })
    .format(isFinite(n) ? n : 0);
const fmtPct = (n: number, d = 1) =>
  `${new Intl.NumberFormat("nl-NL", { maximumFractionDigits: d, minimumFractionDigits: d }).format(n)}%`;

function nlNum(s: string) {
  const norm = s.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const v = parseFloat(norm);
  return isFinite(v) ? v : NaN;
}

/** ---------- Component ---------- */
export default function Client() {
  /** --- 1) VWS-bijlage (publieke korting “zonder” vs “gerealiseerd”) --- */
  const [vwsUrl, setVwsUrl] = useState("");
  const [vwsLoading, setVwsLoading] = useState(false);
  const [vwsError, setVwsError] = useState<string | null>(null);
  const [publicRows, setPublicRows] = useState<PublicRow[]>([]);
  const vwsStats = useMemo(() => {
    const rows = publicRows
      .map(r => ({ ...r, disc: (r.withoutArr - r.realized) / r.withoutArr }))
      .filter(r => isFinite(r.disc) && r.disc >= 0 && r.disc <= 1);
    const avg = rows.length ? rows.reduce((s, r) => s + r.disc, 0) / rows.length : NaN;
    const top = [...rows].sort((a,b)=>b.disc-a.disc).slice(0,10);
    return { avg, top };
  }, [publicRows]);

  async function runVwsParse() {
    setVwsError(null); setVwsLoading(true);
    try {
      const body = vwsUrl ? { url: vwsUrl } : {};
      const res = await fetch("/api/discounts", { method: "POST", headers: { "content-type":"application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await res.text());
      const payload = await res.json();
      if (!payload || typeof payload.year !== "number" || !Array.isArray(payload.rows)) throw new Error("Onverwacht antwoord.");
      const rows = payload.rows
        .filter((r: any) => r && typeof r.name==="string" && typeof r.withoutArr==="number" && typeof r.realized==="number")
        .map((r:any)=>({ ...r, year: payload.year })) as PublicRow[];
      setPublicRows(rows);
    } catch(e:any) {
      setVwsError(e?.message ?? "Parserfout");
    } finally { setVwsLoading(false); }
  }

  /** --- 2) Farmatec add-ons (NZa add-on max inzicht) --- */
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
      } catch (e:any) {
        setAddonError(e?.message ?? "Onbekende fout");
      } finally {
        setAddonLoading(false);
      }
    })();
  }, []);
  const addOnFiltered = useMemo(() => {
    const v = qAddOn.trim().toLowerCase();
    if (!v) return addons;
    return addons.filter(r =>
      r.zi.toLowerCase().includes(v) ||
      r.name.toLowerCase().includes(v) ||
      r.indication.toLowerCase().includes(v)
    );
  }, [addons, qAddOn]);

  /** --- 3) Prijs-stapelen calculators (extramuraal & intramuraal) --- */
  // Algemene inputs
  const [aip, setAip] = useState("");      // lijstprijs excl. btw
  const [wgp, setWgp] = useState("");      // Wgp maximum (excl. btw input voor eenvoud)
  const aipN = nlNum(aip), wgpN = nlNum(wgp);

  // Extramuraal specifieke knoppen
  const [prefDiscPct, setPrefDiscPct] = useState("0"); // preferentie/contractkorting op declaratiegrondslag (%)
  const [clawPct, setClawPct] = useState("0");         // afroming inkoopvoordeel/clawback (% van declaratiegrondslag)
  const [clawAbs, setClawAbs] = useState("0");         // of vast bedrag per receptregel (€)
  const [gvsLimit, setGvsLimit] = useState("");        // optioneel: GVS limiet (excl. btw) ter weergave eigen bijdrage
  const [packSize, setPackSize] = useState("1");       // aantal receptregels (packs) voor berekening absolute clawback

  // Intramuraal specifieke knoppen
  const [intraTenderPct, setIntraTenderPct] = useState("0"); // tender/rebate t.o.v. AIP (excl. btw)
  const [vwsPct, setVwsPct] = useState("0");                 // publieke VWS-effect (% van “zonder”); invulbaar of prefill uit VWS-parser

  // Berekeningen EXTRAMURAAL
  const baseEx = Math.min(isFinite(aipN)?aipN:NaN, isFinite(wgpN)?wgpN:Infinity); // declaratiegrondslag ex btw
  const prefN = baseEx * (1 - (nlNum(prefDiscPct)/100 || 0));
  const clawN = Math.max(0, prefN * (nlNum(clawPct)/100 || 0)) + (nlNum(clawAbs) || 0) * (nlNum(packSize) || 0);
  const exNetToPharma = isFinite(prefN) ? Math.max(0, prefN - clawN) : NaN; // wat resteert richting fabrikant vóór btw
  const exVat = exNetToPharma * 0.09; // btw 9% op middel
  const exNetConsumerInclVat = isFinite(prefN) ? prefN * 1.09 : NaN; // consument/declarabel incl. btw (zonder zorgprestatie)
  const gvsN = nlNum(gvsLimit);
  const exEigenBijdrage = isFinite(gvsN) && isFinite(prefN) && gvsN>0 ? Math.max(0, prefN - gvsN) : 0;

  // Berekeningen INTRAMURAAL
  // NZa add-on max: AIP + btw, begrensd door Wgp (als Wgp lager is dan AIP+btw)
  const aipInclVat = isFinite(aipN) ? aipN * 1.09 : NaN;
  const maxDeclarabelIntra = Math.min(
    isFinite(aipInclVat)?aipInclVat:NaN,
    isFinite(wgpN)?wgpN:Infinity
  );
  const intraTender = (nlNum(intraTenderPct)/100 || 0);
  const intraVws = (nlNum(vwsPct)/100 || 0);
  const intraNetToPharma = isFinite(aipN) ? aipN * (1 - intraTender) * (1 - intraVws) : NaN;

  /** --- 4) UI --- */
  return (
    <div className="mx-auto max-w-7xl px-3 md:px-6 py-6 md:py-10 space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">NL Prijs-stapelen & Kortingsbenchmark</h1>
          <p className="text-sm text-slate-600">Maak de keten van lijstprijs → netto bij fabrikant zichtbaar. Inclusief preferentie & <b>afroming/clawback</b> (extramuraal) en tender/VWS (intramuraal).</p>
        </div>
      </header>

      {/* Grafische flow (responsief, horizontale scroll toegestaan) */}
      <section className="rounded-2xl border bg-white shadow-sm p-4">
        <div className="text-sm text-slate-700 mb-2">Ketenoverzicht (beleid/contract):</div>
        <div className="-mx-2 overflow-x-auto">
          <div className="min-w-[900px] px-2">
            <FlowDiagram />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Extramuraal: <i>min(AIP, Wgp)</i> → preferentie/contract → <b>afroming/clawback</b> (%, of € per receptregel) → netto richting fabrikant. Intramuraal: NZa add-on max = min(AIP×1,09, Wgp), netto inkoop via tender/rebate; VWS-effect zichtbaar als “zonder vs gerealiseerd”.
        </p>
      </section>

      {/* Prijs-stapelen calculators */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* EXTRAMURAAL */}
        <Card title="Extramuraal · Prijs-stapelen (met clawback/afroming)">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="AIP (excl. btw) €" value={aip} onChange={setAip} />
            <Input label="Wgp-maximum (excl. btw) €" value={wgp} onChange={setWgp} />
            <Input label="Preferentiekorting % (verzekeraar)" value={prefDiscPct} onChange={setPrefDiscPct} />
            <Input label="Afroming/clawback % (verzekeraar)" value={clawPct} onChange={setClawPct} />
            <Input label="Afroming/clawback € per receptregel" value={clawAbs} onChange={setClawAbs} />
            <Input label="Aantal receptregels (packs)" value={packSize} onChange={setPackSize} />
            <Input label="GVS-limiet (optioneel) €" value={gvsLimit} onChange={setGvsLimit} />
          </div>

          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <KPI label="Declaratiegrondslag (excl. btw)" value={isFinite(baseEx)? fmtEUR(baseEx): "—"} />
            <KPI label="Na preferentie (excl. btw)" value={isFinite(prefN)? fmtEUR(prefN): "—"} />
            <KPI label="Afroming/clawback (totaal)" value={isFinite(clawN)? fmtEUR(clawN): "—"} />
            <KPI label="Netto richting fabrikant (excl. btw)" value={isFinite(exNetToPharma)? fmtEUR(exNetToPharma): "—"} />
            <KPI label="Declarabel incl. btw (consument)" value={isFinite(exNetConsumerInclVat)? fmtEUR(exNetConsumerInclVat): "—"} />
            <KPI label="BTW (9%)" value={isFinite(exVat)? fmtEUR(exVat): "—"} />
            <KPI label="Eigen bijdrage (bij 1A, optioneel)" value={isFinite(exEigenBijdrage)? fmtEUR(exEigenBijdrage): "—"} />
            <KPI label="‘Ketenvastplakker’ (pref + afroming)" value={isFinite(prefN) && isFinite(exNetToPharma) ? fmtEUR(prefN - exNetToPharma) : "—"} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            * Historisch was er een wettelijke clawback (≈6,82% met een maximum per recept); nu vindt afroming van inkoopvoordeel vooral contractueel plaats via verzekeraar-apotheek afspraken en preferentiebeleid. Bronverwijzingen: zie bronnenblok onderaan.
          </p>
        </Card>

        {/* INTRAMURAAL */}
        <Card title="Intramuraal · Prijs-stapelen (add-on, tender, VWS)">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="AIP (excl. btw) €" value={aip} onChange={setAip} />
            <Input label="Wgp-maximum (excl. btw) €" value={wgp} onChange={setWgp} />
            <Input label="Tender/rebate % (ziekenhuis/inkoop)" value={intraTenderPct} onChange={setIntraTenderPct} />
            <Input label="VWS-effect % (zonder→gerealiseerd)" value={vwsPct} onChange={setVwsPct} />
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <KPI label="AIP incl. btw (9%)" value={isFinite(aipInclVat)? fmtEUR(aipInclVat): "—"} />
            <KPI label="NZa add-on max (declarabel)" value={isFinite(maxDeclarabelIntra)? fmtEUR(maxDeclarabelIntra): "—"} />
            <KPI label="Netto richting fabrikant (na tender & VWS)" value={isFinite(intraNetToPharma)? fmtEUR(intraNetToPharma): "—"} />
            <KPI label="‘Ketenvastplakker’ (tender + VWS)" value={isFinite(aipN) && isFinite(intraNetToPharma) ? fmtEUR(aipN - intraNetToPharma) : "—"} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            * NZa: add-on maximum is gebaseerd op AIP (verwerkt met btw in tarief) en nooit hoger dan Wgp-max. Netto inkoop lager door tender/rebate; VWS-afspraken drukken additioneel de uitgaven (publiek zichtbaar als “gerealiseerd”). Zie bronnenblok.
          </p>
        </Card>
      </section>

      {/* VWS parser + Add-on monitor */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="Publieke korting per middel (VWS-bijlage)">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <input className="border rounded-xl px-3 py-2 min-w-[260px] flex-1"
              placeholder="https://…/Uitgaven_per_geneesmiddel_20XX.pdf"
              value={vwsUrl} onChange={(e)=>setVwsUrl(e.target.value)} />
            <button onClick={runVwsParse} className="rounded-xl bg-slate-900 text-white px-4 py-2 w-full sm:w-auto">Parse</button>
          </div>
          {vwsError && <p className="mt-2 text-sm text-red-600">{vwsError}</p>}
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-slate-600">
                  <th className="text-left py-2">Geneesmiddel</th>
                  <th className="text-right py-2">Zonder (€m)</th>
                  <th className="text-right py-2">Gerealiseerd (€m)</th>
                  <th className="text-right py-2">Impliciet %</th>
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
          <p className="text-xs text-slate-500 mt-2">* Gebruik deze publieke reductie als indicatie; echte nettoprijzen volgen uit contracten.</p>
        </Card>

        <Card title="Add-on geneesmiddelen (Farmatec/NZa)">
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
                  <th className="text-right py-2">Max. tarief (indien bekend)</th>
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
          <p className="text-xs text-slate-500 mt-2">* NZa publiceert add-on maxima (basis AIP + btw, begrensd door Wgp); publicatie loopt via Staatscourant/Z-Index.</p>
        </Card>
      </section>

      {/* Bronnenblok */}
      <section className="rounded-2xl border bg-white shadow-sm p-4">
        <h3 className="font-semibold">Bronnen (clawback, preferentie, NZa, VWS)</h3>
        <ul className="mt-2 text-sm list-disc pl-5 space-y-1">
          <li><a className="text-sky-700 underline" target="_blank" rel="noreferrer" href="https://www.sfk.nl/publicatie/2008/pw-artikel/bijbetaler-profiteert-niet-van-clawback">SFK over clawback (6,82% + max per recept)</a></li>
          <li><a className="text-sky-700 underline" target="_blank" rel="noreferrer" href="https://www.tweedekamer.nl/downloads/document?id=2011D26842">Kamerstuk: vergoeding AIP minus clawback; contractafspraken</a></li>
          <li><a className="text-sky-700 underline" target="_blank" rel="noreferrer" href="https://www.cooperatievgz.nl/zorgaanbieders/farmaceutische-zorg/beleid/preferentiebeleid/inkoopprocedure-preferentiebeleid">VGZ: preferentie-inkoop (prijzen niet publiek)</a></li>
          <li><a className="text-sky-700 underline" target="_blank" rel="noreferrer" href="https://www.nza.nl/documenten/vragen-en-antwoorden/hoe-worden-tarieven-vastgesteld">NZa: add-on maxima, publicatie via Z-Index</a></li>
          <li><a className="text-sky-700 underline" target="_blank" rel="noreferrer" href="https://www.nza.nl/documenten/vragen-en-antwoorden/wat-zijn-de-regels-rondom-een-preferentiebeleid">NZa: regels rond preferentiebeleid</a></li>
        </ul>
        <p className="text-xs text-slate-500 mt-2">Let op: exacte contractpercentages/bedragen verschillen per verzekeraar/apotheek/middel. Daarom zijn ze in de tool <b>invoerbaar</b> en niet hard-gecodeerd.</p>
      </section>
    </div>
  );
}

/** ---------- UI bits ---------- */
function Card({ title, subtitle, className, children }:{
  title: string; subtitle?: string; className?: string; children: React.ReactNode
}) {
  return (
    <section className={`rounded-2xl border bg-white shadow-sm p-4 ${className||""}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-slate-600">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
function Input({ label, value, onChange }: { label: string; value: string; onChange: (v:string)=>void }) {
  return (
    <label className="text-sm">
      <span className="block text-slate-600 mb-1">{label}</span>
      <input className="w-full border rounded-xl px-3 py-2" value={value} onChange={(e)=>onChange(e.target.value)} />
    </label>
  );
}

/** ---------- Flow Diagram (inline SVG, responsive via container) ---------- */
function FlowDiagram() {
  return (
    <svg viewBox="0 0 980 360" className="w-full h-auto">
      {/* kolomtitels */}
      <text x="60" y="22" fontSize="12" fill="#334155">Nationaal / Fabrikant</text>
      <text x="370" y="22" fontSize="12" fill="#334155">Extramuraal (verzekeraar/apotheek)</text>
      <text x="710" y="22" fontSize="12" fill="#334155">Intramuraal (ziekenhuis/verzekeraar)</text>

      {/* AIP */}
      <rect x="40" y="40" width="240" height="64" rx="12" fill="#f1f5f9" stroke="#94a3b8"/>
      <text x="60" y="66" fontSize="13" fill="#0f172a">AIP (lijstprijs, excl. btw)</text>
      <text x="60" y="86" fontSize="11" fill="#475569">G-Standaard (Z-Index)</text>

      {/* Wgp */}
      <rect x="40" y="120" width="240" height="64" rx="12" fill="#eef2ff" stroke="#818cf8"/>
      <text x="60" y="146" fontSize="13" fill="#1e293b">Wgp-maximum (plafond)</text>
      <text x="60" y="166" fontSize="11" fill="#475569">BE/FR/NO/UK</text>

      {/* pijlen naar domeinen */}
      <Arrow x1={280} y1={72} x2={360} y2={72}/>
      <Arrow x1={280} y1={152} x2={360} y2={152}/>

      {/* Extramuraal blokken */}
      <rect x="340" y="40" width="260" height="64" rx="12" fill="#ecfeff" stroke="#67e8f9"/>
      <text x="360" y="66" fontSize="13" fill="#0f172a">Declaratiegrondslag = min(AIP, Wgp)</text>

      <rect x="340" y="120" width="260" height="64" rx="12" fill="#f0fdf4" stroke="#86efac"/>
      <text x="360" y="146" fontSize="13" fill="#0f172a">Preferentie/contractkorting</text>
      <text x="360" y="166" fontSize="11" fill="#475569">prijsdruk via voorkeursbeleid</text>

      <rect x="340" y="200" width="260" height="64" rx="12" fill="#fee2e2" stroke="#fca5a5"/>
      <text x="360" y="226" fontSize="13" fill="#0f172a">Afroming/clawback</text>
      <text x="360" y="246" fontSize="11" fill="#475569">% of € per receptregel (contract)</text>

      {/* Intramuraal blokken */}
      <rect x="640" y="40" width="300" height="64" rx="12" fill="#eef2ff" stroke="#818cf8"/>
      <text x="660" y="66" fontSize="13" fill="#0f172a">NZa add-on max = min(AIP×1,09, Wgp)</text>

      <rect x="640" y="120" width="300" height="64" rx="12" fill="#fef9c3" stroke="#fde047"/>
      <text x="660" y="146" fontSize="13" fill="#0f172a">Tender/rebate (ziekenhuis)</text>
      <text x="660" y="166" fontSize="11" fill="#475569">vertrouwelijke nettoprijs</text>

      <rect x="640" y="200" width="300" height="64" rx="12" fill="#e0e7ff" stroke="#a5b4fc"/>
      <text x="660" y="226" fontSize="13" fill="#0f172a">VWS financiële afspraken</text>
      <text x="660" y="246" fontSize="11" fill="#475569">“zonder” vs “gerealiseerd”</text>

      {/* pijlen */}
      <Arrow x1={470} y1={104} x2={470} y2={120} vertical/>
      <Arrow x1={470} y1={184} x2={470} y2={200} vertical/>
      <Arrow x1={790} y1={104} x2={790} y2={120} vertical/>
      <Arrow x1={790} y1={184} x2={790} y2={200} vertical/>
    </svg>
  );
}
function Arrow({x1,y1,x2,y2,vertical=false}:{x1:number;y1:number;x2:number;y2:number;vertical?:boolean}) {
  const head = vertical ? (y2>y1? "M0 0 L6 8 L-6 8 Z":"M0 0 L6 -8 L-6 -8 Z") : (x2>x1? "M0 0 L8 6 L8 -6 Z":"M0 0 L-8 6 L-8 -6 Z");
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#334155" strokeWidth="2" />
      <path d={head} transform={`translate(${x2} ${y2})`} fill="#334155" />
    </g>
  );
}
