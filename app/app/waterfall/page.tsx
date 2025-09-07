// app/app/waterfall/page.tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { loadWaterfallRows, eur0 } from "@/lib/waterfall-storage";
import type { Row } from "@/lib/waterfall-types";

/* =========================
   Helpers
   ========================= */
function sumDiscounts(r: Row) {
  return (
    (r.d_channel || 0) +
    (r.d_customer || 0) +
    (r.d_product || 0) +
    (r.d_volume || 0) +
    (r.d_other_sales || 0) +
    (r.d_mandatory || 0) +
    (r.d_local || 0)
  );
}
function sumRebates(r: Row) {
  return (
    (r.r_direct || 0) +
    (r.r_prompt || 0) +
    (r.r_indirect || 0) +
    (r.r_mandatory || 0) +
    (r.r_local || 0)
  );
}
function pct1(num: number, den: number) {
  const v = den ? (num / den) * 100 : 0;
  return `${v.toFixed(1)}%`;
}

/* =========================
   Waterfall Chart (SVG)
   ========================= */
function WaterfallChart({
  steps,
  width = 980,
  height = 320,
}: {
  steps: { label: string; value: number; kind: "pos" | "neg" | "subtotal" }[];
  width?: number;
  height?: number;
}) {
  // Compute running totals for positions
  const padX = 40;
  const padY = 30;
  const w = width;
  const h = height;

  // Build coordinates
  const bars: {
    x: number;
    y: number;
    barH: number;
    barW: number;
    color: string;
    label: string;
    value: number;
  }[] = [];

  const colW = (w - 2 * padX) / Math.max(steps.length, 1);
  const barW = Math.max(14, colW * 0.55);

  // Running total logic
  let running = 0;
  let maxY = 0;

  // Find gross (first) as baseline
  // Convention: first step is Gross (pos), last two subtotals: Invoiced, Net
  steps.forEach((s, i) => {
    if (i === 0 && s.kind === "pos") {
      running = 0;
    }
    if (s.kind === "pos") {
      // Positive base/subtotal-like bar from 0 to value
      const top = Math.max(running + s.value, running);
      maxY = Math.max(maxY, top);
      running += s.value;
    } else if (s.kind === "neg") {
      const next = running + s.value; // s.value < 0
      maxY = Math.max(maxY, running);
      maxY = Math.max(maxY, next);
      running = next;
    } else if (s.kind === "subtotal") {
      maxY = Math.max(maxY, running);
    }
  });
  // If everything is zero, avoid div by zero
  if (maxY <= 0) maxY = 1;

  // Render bars with proper heights
  running = 0;
  steps.forEach((s, i) => {
    const cx = padX + i * colW + (colW - barW) / 2;
    let y0 = 0;
    let y1 = 0;
    let color = "#111827"; // default dark for subtotals/pos
    if (s.kind === "pos") {
      // Draw from 0 to s.value
      y0 = 0;
      y1 = s.value;
      color = "#4b5563"; // gray for gross bar
      running += s.value;
    } else if (s.kind === "neg") {
      // Draw from running to running + value (down)
      y0 = running;
      y1 = running + s.value; // smaller
      color = "#ef4444"; // red for discounts/rebates
      running = y1;
    } else {
      // subtotal: bar from 0 to running
      y0 = 0;
      y1 = running;
      color = "#0ea5e9"; // blue for subtotals (Invoiced/Net)
    }

    // Convert to screen coords
    const toY = (v: number) => h - padY - (v / maxY) * (h - 2 * padY);
    const top = toY(Math.max(y0, y1));
    const bottom = toY(Math.min(y0, y1));
    const barH = Math.max(0, bottom - top);

    bars.push({
      x: cx,
      y: top,
      barH,
      barW,
      color,
      label: s.label,
      value: s.kind === "neg" ? -Math.abs(s.value) : Math.abs(s.value),
    });
  });

  // Y axis ticks (5)
  const ticks = Array.from({ length: 6 }, (_, i) => (maxY / 5) * i);

  return (
    <svg className="w-full" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Waterfall Gross → Net">
      {/* Axes */}
      <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke="#e5e7eb" />
      <line x1={padX} y1={padY} x2={padX} y2={h - padY} stroke="#e5e7eb" />
      {/* Y ticks */}
      {ticks.map((tv, i) => {
        const y = h - padY - (tv / maxY) * (h - 2 * padY);
        return (
          <g key={i}>
            <line x1={padX - 4} y1={y} x2={w - padX} y2={y} stroke="#f3f4f6" />
            <text x={padX - 8} y={y + 3} fontSize="10" textAnchor="end" fill="#6b7280">
              {Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 1 }).format(tv)}
            </text>
          </g>
        );
      })}
      {/* Bars */}
      {bars.map((b, i) => (
        <g key={i} transform={`translate(${b.x},${b.y})`}>
          <rect width={b.barW} height={b.barH} rx="4" fill={b.color} opacity="0.9" />
          {/* Value label */}
          <text
            x={b.barW / 2}
            y={-6}
            fontSize="10"
            textAnchor="middle"
            fill="#111827"
          >
            {Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 1 }).format(Math.abs(b.value))}
          </text>
          {/* X label */}
          <text
            x={b.barW / 2}
            y={b.barH + 14}
            fontSize="10"
            textAnchor="middle"
            fill="#6b7280"
          >
            {b.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* =========================
   Main Page
   ========================= */
export default function WaterfallPage() {
  const rows = loadWaterfallRows();

  if (!rows.length) {
    return (
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Waterfall</h1>
          <Link href="/app/upload" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">
            Upload dataset →
          </Link>
        </header>
        <div className="rounded-2xl border bg-white p-6 text-gray-600">
          Geen data gevonden. Ga naar <Link className="underline" href="/app/upload">Upload</Link>, sla op en kom terug.
        </div>
      </div>
    );
  }

  const data = useMemo(() => {
    // Totals & breakdowns
    let gross = 0;
    let inv = 0;
    let net = 0;

    const d = {
      channel: 0,
      customer: 0,
      product: 0,
      volume: 0,
      other_sales: 0, // value + other sales
      mandatory: 0,
      local: 0,
    };
    const r = {
      direct: 0,
      prompt: 0,
      indirect: 0,
      mandatory: 0,
      local: 0,
    };

    rows.forEach((row) => {
      const g = row.gross || 0;
      const invRow = typeof row.invoiced === "number" ? row.invoiced : g - sumDiscounts(row);
      const netRow = typeof row.net === "number" ? row.net : invRow - sumRebates(row);

      gross += g;
      inv += invRow;
      net += netRow;

      d.channel += row.d_channel || 0;
      d.customer += row.d_customer || 0;
      d.product += row.d_product || 0;
      d.volume += row.d_volume || 0;
      d.other_sales += row.d_other_sales || 0;
      d.mandatory += row.d_mandatory || 0;
      d.local += row.d_local || 0;

      r.direct += row.r_direct || 0;
      r.prompt += row.r_prompt || 0;
      r.indirect += row.r_indirect || 0;
      r.mandatory += row.r_mandatory || 0;
      r.local += row.r_local || 0;
    });

    const totalDiscounts =
      d.channel + d.customer + d.product + d.volume + d.other_sales + d.mandatory + d.local;
    const totalRebates = r.direct + r.prompt + r.indirect + r.mandatory + r.local;

    // Waterfall steps (order matters)
    const steps: { label: string; value: number; kind: "pos" | "neg" | "subtotal" }[] = [
      { label: "Gross", value: gross, kind: "pos" },
      { label: "Channel", value: -d.channel, kind: "neg" },
      { label: "Customer", value: -d.customer, kind: "neg" },
      { label: "Product", value: -d.product, kind: "neg" },
      { label: "Volume", value: -d.volume, kind: "neg" },
      { label: "Other/Value", value: -d.other_sales, kind: "neg" },
      { label: "Mandatory", value: -d.mandatory, kind: "neg" },
      { label: "Local", value: -d.local, kind: "neg" },
      { label: "Invoiced", value: 0, kind: "subtotal" }, // drawn at running total
      { label: "Reb. Direct", value: -r.direct, kind: "neg" },
      { label: "Reb. Prompt", value: -r.prompt, kind: "neg" },
      { label: "Reb. Indirect", value: -r.indirect, kind: "neg" },
      { label: "Reb. Mandatory", value: -r.mandatory, kind: "neg" },
      { label: "Reb. Local", value: -r.local, kind: "neg" },
      { label: "Net", value: 0, kind: "subtotal" }, // drawn at running total
    ];

    // Benchmark discount% (overall)
    const overallDiscPct = gross ? (totalDiscounts / gross) * 100 : 0;

    // Top customers by discount spend
    const discByCustomer = new Map<string, { disc: number; gross: number }>();
    rows.forEach((row) => {
      const key = row.cust || "(onbekend)";
      const cur = discByCustomer.get(key) || { disc: 0, gross: 0 };
      cur.disc += sumDiscounts(row);
      cur.gross += row.gross || 0;
      discByCustomer.set(key, cur);
    });
    const topCustomers = [...discByCustomer.entries()]
      .map(([cust, v]) => ({
        cust,
        disc: v.disc,
        gross: v.gross,
        pct: v.gross ? (v.disc / v.gross) * 100 : 0,
        delta: v.gross ? (v.disc / v.gross) * 100 - overallDiscPct : 0,
      }))
      .sort((a, b) => b.disc - a.disc)
      .slice(0, 3);

    // Top SKUs by discount spend
    const discBySku = new Map<string, { disc: number; gross: number }>();
    rows.forEach((row) => {
      const key = row.sku || "(onbekend)";
      const cur = discBySku.get(key) || { disc: 0, gross: 0 };
      cur.disc += sumDiscounts(row);
      cur.gross += row.gross || 0;
      discBySku.set(key, cur);
    });
    const topSkus = [...discBySku.entries()]
      .map(([sku, v]) => ({
        sku,
        disc: v.disc,
        gross: v.gross,
        pct: v.gross ? (v.disc / v.gross) * 100 : 0,
        // simpele heuristiek: hoge pct → mogelijk listprijs/conditie probleem
        flag: v.gross ? (v.disc / v.gross) * 100 >= overallDiscPct + 5 : false,
      }))
      .sort((a, b) => b.disc - a.disc)
      .slice(0, 3);

    // Buckets overzicht
    const buckets = [
      { key: "Customer", value: d.customer },
      { key: "Volume", value: d.volume },
      { key: "Channel", value: d.channel },
      { key: "Product", value: d.product },
      { key: "Other/Value", value: d.other_sales },
      { key: "Mandatory", value: d.mandatory },
      { key: "Local", value: d.local },
    ]
      .map((b) => ({ ...b, share: gross ? (b.value / gross) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);

    return {
      gross,
      inv,
      net,
      discounts: d,
      rebates: r,
      totalDiscounts,
      totalRebates,
      overallDiscPct,
      steps,
      topCustomers,
      topSkus,
      buckets,
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Waterfall – Gross → Net</h1>
          <p className="text-sm text-gray-600">
            Inzicht in marge-impact van kortingen en rebates. Gebruik de blokken onder de grafiek voor directe verbeteracties.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/consistency" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">
            Naar Consistency
          </Link>
          <Link href="/app/upload" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">
            Andere dataset uploaden
          </Link>
        </div>
      </header>

      {/* KPI-samenvatting */}
      <section className="grid md:grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Gross Sales</div>
          <div className="text-lg font-semibold mt-1">{eur0(data.gross)}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Total Discounts</div>
          <div className="text-lg font-semibold mt-1">
            {eur0(data.totalDiscounts)} <span className="text-gray-500 text-sm">({pct1(data.totalDiscounts, data.gross)})</span>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Invoiced Sales</div>
          <div className="text-lg font-semibold mt-1">{eur0(data.inv)}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Total Rebates</div>
          <div className="text-lg font-semibold mt-1">
            {eur0(data.totalRebates)} <span className="text-gray-500 text-sm">({pct1(data.totalRebates, data.gross)})</span>
          </div>
        </div>
      </section>

      {/* Waterfall Chart */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-base font-semibold mb-2">Margebrug</h2>
        <WaterfallChart steps={data.steps} />
        <p className="mt-2 text-xs text-gray-500">
          Grijs = startbar, rood = reductie (kortingen/rebates), blauw = subtotalen (Invoiced/Net). Waarden in compacte notatie.
        </p>
      </section>

      {/* Buckets overzicht met verbeteringstips */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold">Grootste kortings-buckets & verbeteropties</h3>
        <div className="grid md:grid-cols-3 gap-3 mt-3 text-sm">
          {data.buckets.map((b, i) => (
            <div key={b.key} className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{i + 1}. {b.key}</div>
                <div className="text-gray-600">{pct1(b.value, data.gross)}</div>
              </div>
              <div className="mt-1 text-gray-700">€ {eur0(b.value).replace("€", "").trim()}</div>
              <div className="mt-2 text-gray-600">
                {b.key === "Customer" && (
                  <span>Heronderhandel klantcondities. Introduceer omzetgebonden staffels en koppel deel van korting aan realisatie/retentie-KPI’s.</span>
                )}
                {b.key === "Volume" && (
                  <span>Toets of korting écht extra volume drijft. Verplaats deel naar bonus achteraf (performance-based) i.p.v. front-end korting.</span>
                )}
                {b.key === "Channel" && (
                  <span>Uniformeer condities per kanaal. Verlaag uitzonderingen en maak duidelijke “floor & cap”-regels.</span>
                )}
                {b.key === "Product" && (
                  <span>Differentieer op productwaarde/HTA-uitkomsten. Herijk listprijzen waar structureel hoge kortingen nodig zijn.</span>
                )}
                {b.key === "Other/Value" && (
                  <span>Consolideer “value/overige” kortingen. Schrap ad-hoc uitzonderingen en maak expliciete categorie-doelen.</span>
                )}
                {b.key === "Mandatory" && (
                  <span>Monitor; juridisch gedreven. Optimalisaties liggen eerder bij andere buckets.</span>
                )}
                {b.key === "Local" && (
                  <span>Standaardiseer lokale uitzonderingen, centraliseer goedkeuringen en review 1× per kwartaal.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top 3 klanten & Top 3 SKU's */}
      <section className="grid md:grid-cols-2 gap-4">
        {/* Top Customers */}
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-2">Top 3 klanten – hoogste discount spend</h3>
          <ul className="space-y-2 text-sm">
            {data.topCustomers.map((c) => (
              <li key={c.cust} className="border rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{c.cust}</div>
                  <div className="text-gray-700">{eur0(c.disc)}</div>
                </div>
                <div className="mt-1 text-gray-600">
                  Korting: <b>{pct1(c.disc, c.gross)}</b> ({c.delta >= 0 ? "+" : ""}{c.delta.toFixed(1)} pp vs benchmark) • Omzet: {eur0(c.gross)}
                </div>
                <div className="mt-2 text-gray-700">
                  <span className="font-medium">Actie:</span>{" "}
                  {c.delta > 5
                    ? "Heronderhandel direct: verlaag front-end korting en verplaats naar bonus op realisatie/retentie."
                    : c.delta > 2
                    ? "Normaliseer condities: beperk uitzonderingen en koppel korting aan afnamebanden."
                    : "Monitor: binnen range. Behoud incentives waar ze performance sturen."}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Top SKUs */}
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-2">Top 3 SKU’s – hoogste discount spend</h3>
          <ul className="space-y-2 text-sm">
            {data.topSkus.map((s) => (
              <li key={s.sku} className="border rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{s.sku}</div>
                  <div className="text-gray-700">{eur0(s.disc)}</div>
                </div>
                <div className="mt-1 text-gray-600">
                  Korting: <b>{pct1(s.disc, s.gross)}</b> • Omzet: {eur0(s.gross)}
                </div>
                <div className="mt-2 text-gray-700">
                  <span className="font-medium">Actie:</span>{" "}
                  {s.flag
                    ? "Herijk basislistprijs of differentieer condities per klantsegment; reduceer structurele front-end kortingen."
                    : "Check of korting ‘werkt’: stuur op bonus achteraf i.p.v. standaardkorting waar mogelijk."}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Aanbevolen acties – samenvattend */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold">Aanbevolen acties om marge te optimaliseren</h3>
        <ul className="list-disc pl-5 mt-2 text-sm text-gray-700 space-y-1">
          <li>
            <b>Standaardiseer Customer Discounts</b> (grootste bucket): introduceer <i>floor/cap</i> per segment en koppel deel van korting aan
            bewezen volume/retentie; herbeoordeel uitzonderingen maandelijks.
          </li>
          <li>
            <b>Volume → Bonus</b>: verplaats een deel van volumekorting naar <i>bonus op realisatie</i>, met duidelijke staffels en meetpunten.
          </li>
          <li>
            <b>SKU’s met structureel hoge korting</b>: herijk listprijs of positionering; differentieer condities per kanaal/segment.
          </li>
          <li>
            <b>Local/Other opschonen</b>: consolideer “overige” en “local” kortingen, stop ad-hoc deals en voer centrale goedkeuring in.
          </li>
          <li>
            <b>Quarterly review</b> met Sales, Finance & Tender team: volg top 10 klanten/SKU’s op delta t.o.v. benchmark en rapporteer besparingen.
          </li>
        </ul>
      </section>
    </div>
  );
}
