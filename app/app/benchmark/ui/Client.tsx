"use client";

import React, { useEffect, useMemo, useState } from "react";

type PublicRow = { name: string; withoutArr: number; realized: number; year: number };
type AddOnRow = { zi: string; name: string; indication: string; maxTariff?: number; status: string };

const fmtEUR = (n: number, d = 2) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: d, minimumFractionDigits: d })
    .format(isFinite(n) ? n : 0);
const fmtPct = (n: number, d = 0) =>
  `${new Intl.NumberFormat("nl-NL", { maximumFractionDigits: d, minimumFractionDigits: d }).format(n)}%`;

export default function Client() {
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

  async function runVwsParse() {
    setVwsError(null);
    setVwsLoading(true);
    try {
      const body = vwsUrl ? { url: vwsUrl } : {};
      const res = await fetch("/api/discounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const payload = await res.json();
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

  // Kleine helper om uit VWS-bijlage een impliciet kortings% te tonen
  const vwsTop = useMemo(() => {
    const withDisc = publicRows
      .map(r => ({ ...r, discPct: (r.withoutArr - r.realized) / r.withoutArr }))
      .filter(r => isFinite(r.discPct) && r.discPct >= 0);
    const avg = withDisc.length
      ? withDisc.reduce((s, r) => s + r.discPct, 0) / withDisc.length
      : NaN;
    const top = [...withDisc].sort((a,b)=>b.discPct - a.discPct).slice(0,10);
    return { avg, top };
  }, [publicRows]);

  // Scenario (zonder aannames): laat user rekenen met eigen AIP/Wgp/netto
  const [ref, setRef] = useState("");  // referentie (AIP/Wgp of huidige declaratiegrondslag)
  const [cur, setCur] = useState("");  // jouw netto (of huidige inkoop)
  const [vol, setVol] = useState("");
  const refN = parseFloat(ref), curN = parseFloat(cur), volN = parseFloat(vol);
  const currentDisc = isFinite(refN) && refN>0 ? (refN - curN)/refN : NaN;
  const targetDisc = isFinite(vwsTop.avg) ? vwsTop.avg : NaN; // illustratief: gemiddelde uit VWS-bijlage
  const targetPrice = isFinite(refN) && isFinite(targetDisc) ? (1 - targetDisc) * refN : NaN;
  const deltaPer = isFinite(curN) && isFinite(targetPrice) ? curN - targetPrice : NaN;
  const deltaTot = isFinite(deltaPer) && isFinite(volN) ? deltaPer * volN : NaN;

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">NL Kortingsbenchmark</h1>
          <p className="text-sm text-slate-600">
            VWS-bijlage “Uitgaven per geneesmiddel” → impliciete kortingen · Farmatec add-ons · Uitleg van de prijsopbouw.
          </p>
        </div>
      </header>

      {/* Explainer & Grafische flow */}
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Pricing Explainer & Flows (NL)">
          <PricingFlow />
        </Card>

        <Card title="Kernpunten (met bronnen)">
          <ul className="text-sm space-y-2">
            <li><b>AIP (lijstprijs)</b> door fabrikant (excl. btw), beheerd in G-Standaard (Z-Index).</li>
            <li><b>Wgp-plafond</b> op basis van 4 referentielanden (BE/FR/NO/UK).</li>
            <li><b>Extramuraal</b>: GVS-limiet (1A) → eigen bijdrage boven limiet; preferentiebeleid drukt prijzen; terhandstelling via NZa-prestatie.</li>
            <li><b>Intramuraal</b>: add-on max = AIP+btw (niet boven Wgp); ziekenhuis/verzekeraar onderhandelen additionele kortingen.</li>
            <li><b>VWS-arrangement</b>: publiek effect in bijlage “zonder” vs “gerealiseerd”.</li>
          </ul>
          <SourcesList />
        </Card>
      </section>

      {/* Scenario */}
      <section className="grid gap-4 md:grid-cols-3 mt-6">
        <Card title="Scenario · spiegel aan VWS-gemiddelde">
          <div className="mt-2 flex flex-wrap gap-2">
            <input className="border rounded-xl px-3 py-2 flex-1 min-w-[140px]" placeholder="Referentie (AIP/Wgp) €"
              value={ref} onChange={(e)=>setRef(e.target.value)} />
            <input className="border rounded-xl px-3 py-2 flex-1 min-w-[140px]" placeholder="Jouw netto €"
              value={cur} onChange={(e)=>setCur(e.target.value)} />
            <input className="border rounded-xl px-3 py-2 flex-1 min-w-[120px]" placeholder="Volume (stuks)"
              value={vol} onChange={(e)=>setVol(e.target.value)} />
          </div>
          <div className="mt-3 rounded-xl bg-slate-50 border p-3 text-sm">
            {!isFinite(refN)||!isFinite(curN)||!isFinite(volN)
              ? <span className="text-slate-600">Vul referentie, jouw prijs en volume in.</span>
              : <div className="space-y-1">
                  <div>Gemiddelde impliciete korting (VWS): <b>{isFinite(vwsTop.avg)? fmtPct(vwsTop.avg*100,0) : "—"}</b></div>
                  <div>Huidige korting: <b>{fmtPct((currentDisc||0)*100,0)}</b></div>
                  <div>Doel-nettoprijs: <b>{isFinite(targetPrice)? fmtEUR(targetPrice,2) : "—"}</b></div>
                  <div>Potentiële marge: <b className={(deltaTot??0)>=0 ? "text-emerald-700":"text-red-700"}>{fmtEUR(deltaTot,2)}</b></div>
                </div>}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            * VWS-gemiddelde = simpel gemiddelde over alle aangeleverde middelen in de bijlage; voor beslissingen altijd product/indicatie-specifiek rekenen.
          </p>
        </Card>

        <Card title="Publieke korting per middel (VWS-bijlage)" subtitle="Plak de officiële PDF-link of stel VWS_BIJLAGE_URL in.">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <input className="border rounded-xl px-3 py-2 min-w-[260px]"
              placeholder="https://…/Uitgaven_per_geneesmiddel_2023.pdf"
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
                  <th className="text-right py-2">Impliciete korting</th>
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

        <Card title="Add-on geneesmiddelen · monitor">
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
          <p className="text-xs text-slate-500 mt-2">NZa-maxima zijn gebaseerd op AIP+btw en worden begrensd door Wgp-max. Zie bronnen.</p>
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

/** ------- Grafische flow (inline SVG, responsief) ------- */
function PricingFlow() {
  return (
    <div className="p-3 rounded-xl border bg-gradient-to-b from-white to-slate-50">
      <div className="text-sm text-slate-700 mb-2">
        Van lijstprijs (AIP) en nationale plafonds → naar vergoeding & netto-last.
      </div>
      <div className="w-full overflow-x-auto">
        <svg viewBox="0 0 900 420" className="min-w-[760px] w-full h-auto">
          {/* kolommen */}
          <text x="60" y="22" fontSize="12" fill="#334155">Fabrikant / Nationaal</text>
          <text x="360" y="22" fontSize="12" fill="#334155">Extramuraal</text>
          <text x="640" y="22" fontSize="12" fill="#334155">Intramuraal</text>

          {/* Fabrikant/AIP */}
          <rect x="40" y="40" width="220" height="64" rx="12" fill="#f1f5f9" stroke="#94a3b8"/>
          <text x="60" y="66" fontSize="13" fill="#0f172a">AIP (lijstprijs, excl. btw)</text>
          <text x="60" y="86" fontSize="11" fill="#475569">G-Standaard (Z-Index)</text>

          {/* Wgp */}
          <rect x="40" y="120" width="220" height="64" rx="12" fill="#eef2ff" stroke="#818cf8"/>
          <text x="60" y="146" fontSize="13" fill="#1e293b">Wgp maximumprijs</text>
          <text x="60" y="166" fontSize="11" fill="#475569">Ref-landen: BE/FR/NO/UK</text>

          {/* pijlen naar domeinen */}
          <Arrow x1={260} y1={72} x2={360} y2={72}/>
          <Arrow x1={260} y1={152} x2={360} y2={152}/>

          {/* Extramuraal blokken */}
          <rect x="340" y="40" width="220" height="64" rx="12" fill="#ecfeff" stroke="#67e8f9"/>
          <text x="360" y="66" fontSize="13" fill="#0f172a">GVS (1A/1B)</text>
          <text x="360" y="86" fontSize="11" fill="#475569">1A limiet → eigen bijdrage</text>

          <rect x="340" y="120" width="220" height="64" rx="12" fill="#f0fdf4" stroke="#86efac"/>
          <text x="360" y="146" fontSize="13" fill="#0f172a">Preferentiebeleid</text>
          <text x="360" y="166" fontSize="11" fill="#475569">Verzekeraar kiest voorkeursmiddel</text>

          <rect x="340" y="200" width="220" height="64" rx="12" fill="#fff7ed" stroke="#fdba74"/>
          <text x="360" y="226" fontSize="13" fill="#0f172a">NZa-prestatie: terhandstelling</text>
          <text x="360" y="246" fontSize="11" fill="#475569">vergoeding apotheek</text>

          <rect x="340" y="280" width="220" height="64" rx="12" fill="#f8fafc" stroke="#cbd5e1"/>
          <text x="360" y="306" fontSize="13" fill="#0f172a">BTW 9%</text>
          <text x="360" y="326" fontSize="11" fill="#475569">op geneesmiddel (niet op alles)</text>

          {/* Intramuraal blokken */}
          <rect x="620" y="40" width="240" height="64" rx="12" fill="#f0fdf4" stroke="#86efac"/>
          <text x="640" y="66" fontSize="13" fill="#0f172a">Ziekenhuis/inkoop</text>
          <text x="640" y="86" fontSize="11" fill="#475569">tenders, rebates, nettoprijs</text>

          <rect x="620" y="120" width="240" height="64" rx="12" fill="#eef2ff" stroke="#818cf8"/>
          <text x="640" y="146" fontSize="13" fill="#0f172a">NZa add-on maximum</text>
          <text x="640" y="166" fontSize="11" fill="#475569">AIP+btw, gemaximeerd door Wgp</text>

          <rect x="620" y="200" width="240" height="64" rx="12" fill="#fee2e2" stroke="#fca5a5"/>
          <text x="640" y="226" fontSize="13" fill="#0f172a">VWS financiële arrangementen</text>
          <text x="640" y="246" fontSize="11" fill="#475569">“zonder” ↔ “gerealiseerd”</text>

          {/* pijlen extramuraal */}
          <Arrow x1={450} y1={104} x2={450} y2={120} vertical/>
          <Arrow x1={450} y1={184} x2={450} y2={200} vertical/>
          <Arrow x1={450} y1={264} x2={450} y2={280} vertical/>

          {/* pijlen intramuraal */}
          <Arrow x1={740} y1={104} x2={740} y2={120} vertical/>
          <Arrow x1={740} y1={184} x2={740} y2={200} vertical/>
        </svg>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Schema: welke beleidsknoppen bepalen netto-prijzen en vergoedingen. Publiek kwantificeerbaar (o.a.): GVS-limieten, NZa-add-onmax, VWS-“gerealiseerd”.
      </p>
    </div>
  );
}

function Arrow({x1,y1,x2,y2,vertical=false}:{x1:number;y1:number;x2:number;y2:number;vertical?:boolean}) {
  const head = vertical ? (y2>y1? "M0 0 L6 8 L-6 8 Z":"M0 0 L6 -8 L-6 -8 Z") : (x2>x1? "M0 0 L8 6 L8 -6 Z":"M0 0 L-8 6 L-8 -6 Z");
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#334155" strokeWidth="2" />
      <path d={head}
        transform={vertical ? `translate(${x2} ${y2})` : `translate(${x2} ${y2})`}
        fill="#334155" />
    </g>
  );
}

/** ------- Bronnenlijst ------- */
function SourcesList() {
  const items = [
    { label: "Wgp & referentielanden (Farmatec)", href: "https://www.farmatec.nl/prijsvorming/wet-geneesmiddelenprijzen" },
    { label: "Wgp (wettekst)", href: "https://wetten.overheid.nl/BWBR0007867" },
    { label: "GVS (Zorginstituut) – 1A/1B & limieten", href: "https://www.zorginstituutnederland.nl/over-ons/werkwijzen-en-procedures/adviseren-over-en-verduidelijken-van-het-basispakket-aan-zorg/beoordeling-van-geneesmiddelen/vergoeding-van-extramurale-geneesmiddelen-gvs" },
    { label: "Rijksoverheid – vergoedingslimiet & eigen bijdrage", href: "https://www.rijksoverheid.nl/onderwerpen/geneesmiddelen/betaalbaar-houden-van-geneesmiddelen" },
    { label: "Preferentiebeleid (NZa Q&A)", href: "https://www.nza.nl/documenten/vragen-en-antwoorden/wat-zijn-de-regels-rondom-een-preferentiebeleid" },
    { label: "NZa – tariefbasis add-on = AIP + btw", href: "https://www.nza.nl/documenten/vragen-en-antwoorden/hoe-worden-tarieven-vastgesteld" },
    { label: "Farmatec – add-on & NZa-tarieven in G-Standaard", href: "https://www.farmatec.nl/prijsvorming/add-on-geneesmiddelen-sluismiddelen" },
    { label: "VWS – voortgang financiële arrangementen (bijlage per middel)", href: "https://www.rijksoverheid.nl/documenten/kamerstukken/2025/05/19/kamerbrief-over-voortgangsbrief-financiele-arrangementen-geneesmiddelen-2024" },
    { label: "BTW 9% (Belastingdienst)", href: "https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/tarieven_en_vrijstellingen/goederen_9_btw/geneesmiddelen_en_hulpmiddelen/" },
  ];
  return (
    <div className="mt-3 text-xs">
      <p className="text-slate-600 mb-2">Bronnen:</p>
      <ul className="list-disc pl-5 space-y-1">
        {items.map((it) => (
          <li key={it.href}><a className="text-sky-700 underline" href={it.href} target="_blank" rel="noreferrer">{it.label}</a></li>
        ))}
      </ul>
    </div>
  );
}
