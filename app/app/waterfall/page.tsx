// app/app/waterfall/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { loadWaterfallRows, eur0 } from "@/lib/waterfall-storage";
import type { Row } from "@/lib/waterfall-types";

/* ========= Helpers ========= */
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
function pct(num: number, den: number) {
  const v = den ? (num / den) * 100 : 0;
  return `${v.toFixed(1)}%`;
}
function compact(n: number) {
  return Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/* ========= Waterfall Chart (visueel verbeterd) ========= */
type Step =
  | { label: string; value: number; kind: "pos-start"; share?: number }
  | { label: string; value: number; kind: "neg"; share?: number }
  | { label: string; value: 0; kind: "subtotal"; share?: number };

type Tooltip = { x: number; y: number; title: string; value: number; share: number; color: string } | null;

function WaterfallChart({
  steps,
  grossTotal,
  width = 980,
  height = 360,
}: {
  steps: Step[];
  grossTotal: number;
  width?: number;
  height?: number;
}) {
  const padX = 48;
  const padY = 40;
  const w = width;
  const h = height;

  // 1) Max bepalen o.b.v. lopende stand
  let running = 0;
  let maxVal = 0;
  steps.forEach((s, i) => {
    if (i === 0 && s.kind === "pos-start") {
      running = s.value;
      maxVal = Math.max(maxVal, running);
      return;
    }
    if (s.kind === "neg") {
      const next = running + s.value; // s.value < 0
      maxVal = Math.max(maxVal, running, next);
      running = next;
      return;
    }
    if (s.kind === "subtotal") {
      maxVal = Math.max(maxVal, running);
    }
  });
  if (maxVal <= 0) maxVal = 1;

  const colW = (w - 2 * padX) / Math.max(steps.length, 1);
  const barW = Math.min(48, Math.max(18, colW * 0.55));
  const toY = (val: number) => h - padY - (val / maxVal) * (h - 2 * padY);

  // 2) Bars opbouwen (met kleur/gradient-keuze)
  type Bar = {
    label: string;
    x: number;
    y: number;
    barW: number;
    barH: number;
    fill: string;
    value: number;
    share: number;
    isSubtotal: boolean;
  };
  running = 0;
  const bars: Bar[] = [];

  steps.forEach((s, i) => {
    const cx = padX + i * colW + (colW - barW) / 2;

    if (i === 0 && s.kind === "pos-start") {
      const top = toY(s.value);
      const bot = toY(0);
      bars.push({
        label: s.label,
        x: cx,
        y: top,
        barW,
        barH: Math.max(0, bot - top),
        fill: "url(#wf-start)",
        value: s.value,
        share: (s.value / (grossTotal || 1)) * 100,
        isSubtotal: false,
      });
      running = s.value;
      return;
    }

    if (s.kind === "neg") {
      const from = running;
      const to = running + s.value; // negatief
      const top = toY(Math.max(from, to));
      const bot = toY(Math.min(from, to));
      bars.push({
        label: s.label,
        x: cx,
        y: top,
        barW,
        barH: Math.max(0, bot - top),
        fill: "url(#wf-neg)",
        value: Math.abs(s.value),
        share: (Math.abs(s.value) / (grossTotal || 1)) * 100,
        isSubtotal: false,
      });
      running = to;
      return;
    }

    if (s.kind === "subtotal") {
      const top = toY(running);
      const bot = toY(0);
      bars.push({
        label: s.label,
        x: cx,
        y: top,
        barW,
        barH: Math.max(0, bot - top),
        fill: s.label === "Net" ? "url(#wf-net)" : "url(#wf-sub)",
        value: running,
        share: (running / (grossTotal || 1)) * 100,
        isSubtotal: true,
      });
      return;
    }
  });

  const ticks = Array.from({ length: 5 }, (_, i) => (maxVal / 4) * i);

  // Tooltip state
  const [tip, setTip] = useState<Tooltip>(null);
  const onMove = (e: React.MouseEvent<SVGRectElement>, b: Bar) => {
    const pt = (e.target as SVGRectElement).ownerSVGElement?.createSVGPoint();
    if (!pt) return;
    pt.x = e.clientX;
    pt.y = e.clientY;
    const screenCTM = (e.target as SVGRectElement).ownerSVGElement!.getScreenCTM();
    if (!screenCTM) return;
    const cursor = pt.matrixTransform(screenCTM.inverse());
    setTip({
      x: cursor.x + 8,
      y: cursor.y - 8,
      title: b.label,
      value: b.value,
      share: b.share,
      color: b.fill.includes("neg") ? "#ef4444" : b.fill.includes("sub") ? "#0ea5e9" : b.fill.includes("net") ? "#16a34a" : "#4b5563",
    });
  };

  return (
    <svg
      className="w-full"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Waterfall Gross → Net"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Defs: gradients, shadow */}
      <defs>
        <linearGradient id="wf-start" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#6b7280" />
          <stop offset="1" stopColor="#4b5563" />
        </linearGradient>
        <linearGradient id="wf-neg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f87171" />
          <stop offset="1" stopColor="#ef4444" />
        </linearGradient>
        <linearGradient id="wf-sub" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
        <linearGradient id="wf-net" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#16a34a" />
        </linearGradient>
        <filter id="wf-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#000" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* Achtergrond panel */}
      <rect x={12} y={12} width={w - 24} height={h - 24} rx={16} fill="#fff" stroke="#e5e7eb" />

      {/* As-lijnen */}
      <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke="#e5e7eb" />
      <line x1={padX} y1={padY} x2={padX} y2={h - padY} stroke="#e5e7eb" />

      {/* Grid en y-ticks */}
      {ticks.map((tv, i) => {
        const y = toY(tv);
        return (
          <g key={i}>
            <line x1={padX - 4} y1={y} x2={w - padX} y2={y} stroke="#f3f4f6" />
            <text x={padX - 10} y={y + 3} fontSize="10" textAnchor="end" fill="#6b7280">
              {compact(tv)}
            </text>
          </g>
        );
      })}

      {/* Bars + labels */}
      {bars.map((b, i) => (
        <g key={i} transform={`translate(${b.x},${b.y})`} filter="url(#wf-shadow)">
          <rect
            width={b.barW}
            height={b.barH}
            rx="6"
            fill={b.fill}
            onMouseMove={(e) => onMove(e, b)}
            onMouseLeave={() => setTip(null)}
          />
          {/* value label boven balk */}
          <text x={b.barW / 2} y={-8} fontSize="10" textAnchor="middle" fill="#111827">
            {compact(Math.abs(b.value))}
          </text>
          {/* x label */}
          <text x={b.barW / 2} y={b.barH + 16} fontSize="10" textAnchor="middle" fill="#6b7280">
            {b.label}
          </text>
        </g>
      ))}

      {/* Tooltip */}
      {tip && (
        <g transform={`translate(${tip.x},${tip.y})`}>
          <rect x={0} y={-30} rx={6} width={160} height={30} fill="#111827" opacity="0.92" />
          <text x={8} y={-19} fontSize="10" fill="#e5e7eb">
            {tip.title}
          </text>
          <text x={8} y={-7} fontSize="11" fill="#ffffff">
            {compact(Math.abs(tip.value))} • {tip.share.toFixed(1)}% van Gross
          </text>
        </g>
      )}

      {/* Legenda */}
      <g transform={`translate(${w - padX - 240}, ${padY - 14})`}>
        <LegendItem color="url(#wf-start)" label="Gross (start)" x={0} />
        <LegendItem color="url(#wf-sub)" label="Invoiced (subtotal)" x={90} />
        <LegendItem color="url(#wf-neg)" label="Discounts / Rebates" x={230} />
        <LegendItem color="url(#wf-net)" label="Net (eind)" x={420} />
      </g>
    </svg>
  );
}

function LegendItem({ color, label, x }: { color: string; label: string; x: number }) {
  return (
    <g transform={`translate(${x},0)`}>
      <rect x={0} y={0} width={12} height={8} rx={2} fill={color} />
      <text x={18} y={7} fontSize="10" fill="#6b7280">
        {label}
      </text>
    </g>
  );
}

/* ========= Pagina ========= */
export default function WaterfallPage() {
  const rows = loadWaterfallRows();

  if (!rows.length) {
    return (
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Waterfall</h1>
          <Link href="/app/upload" className="text-sm rounded-lg border px-3 py-2 hover:bg-gray-50">
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
    // Totals (consistente definities)
    let gross = 0;
    let totalDisc = 0;
    let totalReb = 0;

    const d = {
      channel: 0,
      customer: 0,
      product: 0,
      volume: 0,
      other_sales: 0,
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
      const disc = sumDiscounts(row);
      const reb = sumRebates(row);
      gross += g;
      totalDisc += disc;
      totalReb += reb;

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

    const invoiced = Math.max(0, gross - totalDisc);
    const net = Math.max(0, invoiced - totalReb);

    const steps: Step[] = [
      { label: "Gross", value: gross, kind: "pos-start", share: (gross / (gross || 1)) * 100 },
      { label: "Channel", value: -d.channel, kind: "neg", share: (d.channel / (gross || 1)) * 100 },
      { label: "Customer", value: -d.customer, kind: "neg", share: (d.customer / (gross || 1)) * 100 },
      { label: "Product", value: -d.product, kind: "neg", share: (d.product / (gross || 1)) * 100 },
      { label: "Volume", value: -d.volume, kind: "neg", share: (d.volume / (gross || 1)) * 100 },
      { label: "Other/Value", value: -d.other_sales, kind: "neg", share: (d.other_sales / (gross || 1)) * 100 },
      { label: "Mandatory", value: -d.mandatory, kind: "neg", share: (d.mandatory / (gross || 1)) * 100 },
      { label: "Local", value: -d.local, kind: "neg", share: (d.local / (gross || 1)) * 100 },
      { label: "Invoiced", value: 0, kind: "subtotal", share: (invoiced / (gross || 1)) * 100 },
      { label: "Reb. Direct", value: -r.direct, kind: "neg", share: (r.direct / (gross || 1)) * 100 },
      { label: "Reb. Prompt", value: -r.prompt, kind: "neg", share: (r.prompt / (gross || 1)) * 100 },
      { label: "Reb. Indirect", value: -r.indirect, kind: "neg", share: (r.indirect / (gross || 1)) * 100 },
      { label: "Reb. Mandatory", value: -r.mandatory, kind: "neg", share: (r.mandatory / (gross || 1)) * 100 },
      { label: "Reb. Local", value: -r.local, kind: "neg", share: (r.local / (gross || 1)) * 100 },
      { label: "Net", value: 0, kind: "subtotal", share: (net / (gross || 1)) * 100 },
    ];

    const overallDiscPct = gross ? (totalDisc / gross) * 100 : 0;

    // Top 3 klanten (discount spend)
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

    // Top 3 SKU’s (discount spend)
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
        flag: v.gross ? (v.disc / v.gross) * 100 >= overallDiscPct + 5 : false,
      }))
      .sort((a, b) => b.disc - a.disc)
      .slice(0, 3);

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
      invoiced,
      net,
      totalDisc,
      totalReb,
      steps,
      overallDiscPct,
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
            Subtotalen volgen exact de formules: <b>Invoiced = Gross − Discounts</b> · <b>Net = Invoiced − Rebates</b>.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/consistency" className="text-sm rounded-lg border px-3 py-2 hover:bg-gray-50">Naar Consistency</Link>
          <Link href="/app/upload" className="text-sm rounded-lg border px-3 py-2 hover:bg-gray-50">Andere dataset uploaden</Link>
        </div>
      </header>

      {/* KPI’s */}
      <section className="grid md:grid-cols-4 gap-4">
        <KpiCard title="Gross Sales" value={eur0(data.gross)} />
        <KpiCard title="Total Discounts" value={`${eur0(data.totalDisc)}  (${pct(data.totalDisc, data.gross)})`} />
        <KpiCard title="Invoiced Sales" value={eur0(data.invoiced)} />
        <KpiCard title="Total Rebates" value={`${eur0(data.totalReb)}  (${pct(data.totalReb, data.gross)})`} />
      </section>

      {/* Chart */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Margebrug</h2>
          <div className="text-xs text-gray-600 hidden md:block">
            <span className="inline-flex items-center mr-3"><span className="w-2 h-2 rounded inline-block mr-1" style={{background:"#6b7280"}} /> Start</span>
            <span className="inline-flex items-center mr-3"><span className="w-2 h-2 rounded inline-block mr-1" style={{background:"#0ea5e9"}} /> Subtotal</span>
            <span className="inline-flex items-center mr-3"><span className="w-2 h-2 rounded inline-block mr-1" style={{background:"#ef4444"}} /> Discounts/Rebates</span>
            <span className="inline-flex items-center"><span className="w-2 h-2 rounded inline-block mr-1" style={{background:"#16a34a"}} /> Net</span>
          </div>
        </div>
        <div className="mt-2">
          <WaterfallChart steps={data.steps} grossTotal={data.gross} />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Hover op een balk voor details (bedrag en aandeel van Gross).
        </p>
      </section>

      {/* Buckets met tips */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold">Grootste kortings-buckets & verbeteropties</h3>
        <div className="grid md:grid-cols-3 gap-3 mt-3 text-sm">
          {data.buckets.map((b, i) => (
            <div key={b.key} className="rounded-xl border p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">{i + 1}. {b.key}</div>
                <div className="text-gray-600">{pct(b.value, data.gross)}</div>
              </div>
              <div className="mt-1 text-gray-700">{eur0(b.value)}</div>
              <div className="mt-2 text-gray-600">
                {b.key === "Customer" && "Heronderhandel condities; voer floor/cap per segment en bonus op realisatie/retentie."}
                {b.key === "Volume" && "Verplaats deel naar bonus achteraf; definieer scherpe staffels en meetpunten."}
                {b.key === "Channel" && "Uniformeer kanaalcondities; beperk uitzonderingen via centrale governance."}
                {b.key === "Product" && "Herijk listprijs/positionering bij structureel hoge korting; differentieer per segment."}
                {b.key === "Other/Value" && "Consolideer ‘other/value’; stop ad-hoc deals en maak expliciete categorie-doelen."}
                {b.key === "Mandatory" && "Monitor (juridisch gedreven); optimalisaties elders zoeken."}
                {b.key === "Local" && "Standaardiseer lokale uitzonderingen; centrale goedkeuring en kwartaalreview."}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top 3 klanten & SKU’s */}
      <section className="grid md:grid-cols-2 gap-4">
        <CardList
          title="Top 3 klanten – hoogste discount spend"
          items={data.topCustomers.map((c) => ({
            title: c.cust,
            right: eur0(c.disc),
            lines: [
              `Korting: ${pct(c.disc, c.gross)} (${c.delta >= 0 ? "+" : ""}${c.delta.toFixed(1)} pp vs benchmark)`,
              `Omzet: ${eur0(c.gross)}`,
            ],
            action:
              c.delta > 5
                ? "Heronderhandel direct: verlaag front-end korting en verschuif naar bonus op realisatie/retentie."
                : c.delta > 2
                ? "Normaliseer condities: beperk uitzonderingen en koppel korting aan afnamebanden."
                : "Monitor: binnen range; behoud incentives waar ze performance sturen.",
          }))}
        />

        <CardList
          title="Top 3 SKU’s – hoogste discount spend"
          items={data.topSkus.map((s) => ({
            title: s.sku,
            right: eur0(s.disc),
            lines: [`Korting: ${pct(s.disc, s.gross)}`, `Omzet: ${eur0(s.gross)}`],
            action: s.flag
              ? "Herijk basislistprijs/differentiatie per segment; reduceer structurele front-end kortingen."
              : "Toets effectiviteit van korting; stuur meer op bonus achteraf i.p.v. standaardkorting.",
          }))}
        />
      </section>

      {/* Samenvattende acties */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold">Aanbevolen acties om marge te optimaliseren</h3>
        <ul className="list-disc pl-5 mt-2 text-sm text-gray-700 space-y-1">
          <li><b>Standaardiseer Customer Discounts</b> (grootste bucket): voer floor/cap per segment; deel van korting → bonus op realisatie.</li>
          <li><b>Volume → Bonus</b>: vervang een deel van volumekorting door performance-bonussen met duidelijke staffels.</li>
          <li><b>SKU’s met structureel hoge korting</b>: herijk listprijs of positionering; differentieer per kanaal/segment.</li>
          <li><b>Local/Other opschonen</b>: consolideer uitzonderingen, stop ad-hoc deals en centraliseer goedkeuring.</li>
          <li><b>Kwartaalreview</b> met Sales/Finance/Tender: volg top 10 klanten & SKU’s op delta t.o.v. benchmark en rapporteer besparingen.</li>
        </ul>
      </section>
    </div>
  );
}

/* ========= UI subcomponenten ========= */
function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

function CardList({
  title,
  items,
}: {
  title: string;
  items: { title: string; right: string; lines: string[]; action: string }[];
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <ul className="space-y-2 text-sm">
        {items.map((it) => (
          <li key={it.title} className="border rounded-xl p-3 hover:shadow-sm transition">
            <div className="flex items-center justify-between">
              <div className="font-medium">{it.title}</div>
              <div className="text-gray-700">{it.right}</div>
            </div>
            <div className="mt-1 text-gray-600">{it.lines.join(" • ")}</div>
            <div className="mt-2 text-gray-700">
              <span className="font-medium">Actie:</span> {it.action}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
