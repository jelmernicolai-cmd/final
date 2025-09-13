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
              <input type="checkbox" check
