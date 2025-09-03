"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Mode = "waterfall" | "consistency";
type Row = Record<string, string>;

function parseCSV(text: string): Row[] {
  const firstLine = text.split(/\r?\n/)[0] || "";
  const delimiter =
    (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0)
      ? ";"
      : ",";
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const headers = parseLine(lines[0]);
  return lines.slice(1).map((ln) => {
    const cols = parseLine(ln);
    const obj: Row = {};
    headers.forEach((h, i) => (obj[h] = (cols[i] ?? "").trim()));
    return obj;
  });
}

function toNum(v: string): number {
  if (!v) return 0;
  const s = v.replace(/\s/g, "").replace(/€/g, "");
  if (s.includes(",") && s.includes(".")) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    const decIsComma = lastComma > lastDot;
    if (decIsComma) return parseFloat(s.replace(/\./g, "").replace(",", "."));
    return parseFloat(s.replace(/,/g, ""));
  }
  if (s.includes(",") && !s.includes(".")) return parseFloat(s.replace(",", "."));
  return parseFloat(s);
}

function fmtEUR(n: number): string {
  return n.toLocaleString("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}
function fmtPct(n: number): string {
  return (n * 100).toLocaleString("nl-NL", { maximumFractionDigits: 1 }) + "%";
}

// ---------- Canvas helpers ----------
function clearCanvas(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
}
function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, align: CanvasTextAlign = "left", color="#111827") {
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
}
function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(0,0,0,0.06)";
  ctx.strokeRect(x, y, w, h);
}

// ---------- Component ----------
export default function UploadAndAnalyze({ mode }: { mode: Mode }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (f?: File) => {
    if (!f) return;
    setError(null);
    try {
      const txt = await f.text();
      const data = parseCSV(txt);
      if (!data.length) {
        setError("Geen data gevonden. Klopt het CSV-formaat en de headers?");
        setRows([]);
        return;
      }
      setRows(data);
    } catch (e: any) {
      setError("Kon bestand niet lezen: " + e?.message);
      setRows([]);
    }
  };

  // ---------- Waterfall calc ----------
  const wf = useMemo(() => {
    if (mode !== "waterfall" || rows.length === 0) return null;
    const num = (r: Row, k: string) => toNum(r[k] || "0");

    let gross = 0;
    let chDisc = 0,
      custDisc = 0,
      prodDisc = 0,
      volDisc = 0,
      valDisc = 0,
      otherDisc = 0,
      mandDisc = 0,
      localDisc = 0;
    let invoiced = 0;
    let directReb = 0,
      promptReb = 0,
      indReb = 0,
      mandReb = 0,
      localReb = 0;
    let royalty = 0,
      otherInc = 0;
    let net = 0;

    rows.forEach((r) => {
      gross += num(r, "Sum of Gross Sales");
      chDisc += num(r, "Sum of Channel Discounts");
      custDisc += num(r, "Sum of Customer Discounts");
      prodDisc += num(r, "Sum of Product Discounts");
      volDisc += num(r, "Sum of Volume Discounts");
      valDisc += num(r, "Sum of Value Discounts");
      otherDisc += num(r, "Sum of Other Sales Discounts");
      mandDisc += num(r, "Sum of Mandatory Discounts");
      localDisc += num(r, "Sum of Discount Local");
      invoiced += num(r, "Sum of Invoiced Sales");
      directReb += num(r, "Sum of Direct Rebates");
      promptReb += num(r, "Sum of Prompt Payment Rebates");
      indReb += num(r, "Sum of Indirect Rebates");
      mandReb += num(r, "Sum of Mandatory Rebates");
      localReb += num(r, "Sum of Rebate Local");
      royalty += num(r, "Sum of Royalty Income");
      otherInc += num(r, "Sum of Other Income");
      net += num(r, "Sum of Net Sales");
    });

    const totalDiscounts =
      chDisc +
      custDisc +
      prodDisc +
      volDisc +
      valDisc +
      otherDisc +
      mandDisc +
      localDisc;

    const totalRebates = directReb + promptReb + indReb + mandReb + localReb;
    const gtnSpend = Math.abs(totalDiscounts) + Math.abs(totalRebates);
    const gtnPct = gross ? gtnSpend / gross : 0;

    const byKeySum = (key: string) => {
      const m = new Map<string, number>();
      rows.forEach((r) => {
        const k = (r[key] || "").trim() || "(onbekend)";
        const v =
          Math.abs(num(r, "Sum of Channel Discounts")) +
          Math.abs(num(r, "Sum of Customer Discounts")) +
          Math.abs(num(r, "Sum of Product Discounts")) +
          Math.abs(num(r, "Sum of Volume Discounts")) +
          Math.abs(num(r, "Sum of Value Discounts")) +
          Math.abs(num(r, "Sum of Other Sales Discounts")) +
          Math.abs(num(r, "Sum of Mandatory Discounts")) +
          Math.abs(num(r, "Sum of Discount Local")) +
          Math.abs(num(r, "Sum of Direct Rebates")) +
          Math.abs(num(r, "Sum of Prompt Payment Rebates")) +
          Math.abs(num(r, "Sum of Indirect Rebates")) +
          Math.abs(num(r, "Sum of Mandatory Rebates")) +
          Math.abs(num(r, "Sum of Rebate Local"));
        m.set(k, (m.get(k) || 0) + v);
      });
      return Array.from(m.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    };

    const topCustomers = byKeySum("Customer Name (Sold-to)");
    const topSkus = byKeySum("SKU Name");

    return {
      gross,
      invoiced,
      net,
      totalDiscounts,
      totalRebates,
      gtnSpend,
      gtnPct,
      topCustomers,
      topSkus,
      components: {
        chDisc,
        custDisc,
        prodDisc,
        volDisc,
        valDisc,
        otherDisc,
        mandDisc,
        localDisc,
        directReb,
        promptReb,
        indReb,
        mandReb,
        localReb,
        royalty,
        otherInc,
      },
    };
  }, [mode, rows]);

  // ---------- Consistency calc ----------
  const cs = useMemo(() => {
    if (mode !== "consistency" || rows.length === 0) return null;
    const num = (r: Row, k: string) => toNum(r[k] || "0");

    let totalGross = 0,
      totalIncent = 0;
    const agg = new Map<string, { gross: number; incent: number }>();

    rows.forEach((r) => {
      const c = (r["Customer Name (Sold-to)"] || "").trim() || "(onbekend)";
      const gross = num(r, "Sum of Gross Sales");
      const incent = num(r, "Sum of Total GtN Spend");
      totalGross += gross;
      totalIncent += incent;
      const prev = agg.get(c) || { gross: 0, incent: 0 };
      prev.gross += gross;
      prev.incent += incent;
      agg.set(c, prev);
    });

    const byCustomer: Array<{
      cust: string;
      gross: number;
      incent: number;
      pct: number;
    }> = [];
    agg.forEach((v, k) =>
      byCustomer.push({
        cust: k,
        gross: v.gross,
        incent: v.incent,
        pct: v.gross ? v.incent / v.gross : 0,
      })
    );
    byCustomer.sort((a, b) => b.incent - a.incent);

    return {
      totalGross,
      totalIncent,
      totalPct: totalGross ? totalIncent / totalGross : 0,
      top15: byCustomer.slice(0, 15),
    };
  }, [mode, rows]);

  // ---------- Canvas refs & drawing ----------
  const wfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (mode !== "waterfall") return;
    const c = wfCanvasRef.current;
    if (!c || !wf) return;
    const w = (c.width = 980);
    const h = (c.height = 320);

    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial";
    clearCanvas(ctx, w, h);

    // layout
    const pad = 16;
    const chartW = w - pad * 2;
    const chartH = h - pad * 2 - 30;
    const baseY = pad + chartH; // x-as onderin

    const steps: Array<{ label: string; value: number; color: string }> = [
      { label: "Gross", value: wf.gross, color: "#0ea5e9" },
      { label: "Discounts", value: wf.totalDiscounts, color: "#fca5a5" },
      { label: "Invoiced", value: wf.invoiced, color: "#38bdf8" },
      { label: "Rebates", value: wf.totalRebates, color: "#fca5a5" },
      { label: "Net", value: wf.net, color: "#22c55e" },
    ];

    const maxAbs = Math.max(
      wf.gross,
      wf.invoiced,
      wf.net,
      Math.abs(wf.totalDiscounts),
      Math.abs(wf.totalRebates)
    );
    const pxPer = chartH / maxAbs;

    // bar breedte & posities
    const barW = Math.min(120, Math.floor(chartW / (steps.length * 1.5)));
    const gap = Math.floor((chartW - steps.length * barW) / (steps.length - 1));
    let x = pad;

    // cumulatieve y-waarden
    let level = 0; // start vanaf 0 → Gross is absolute
    steps.forEach((s, i) => {
      let y1: number, y2: number, hgt: number;

      if (i === 0) {
        // Gross absolute
        hgt = s.value * pxPer;
        y2 = baseY;
        y1 = baseY - hgt;
        rect(ctx, x, y1, barW, hgt, s.color);
        text(ctx, s.label, x + barW / 2, baseY + 16, "center", "#6b7280");
        text(ctx, fmtEUR(s.value), x + barW / 2, y1 - 6, "center");
        level = s.value;
      } else if (s.label === "Discounts" || s.label === "Rebates") {
        const v = s.value; // negatief verwacht
        const newLevel = level + v;
        const top = Math.min(level, newLevel);
        const bottom = Math.max(level, newLevel);
        y1 = baseY - bottom * pxPer;
        y2 = baseY - top * pxPer;
        hgt = y2 - y1;
        rect(ctx, x, y1, barW, hgt, s.color);
        text(ctx, s.label, x + barW / 2, baseY + 16, "center", "#6b7280");
        text(ctx, fmtEUR(v), x + barW / 2, y1 - 6, "center");
        level = newLevel;
      } else {
        // Invoiced / Net (absolute – gelijk aan level)
        hgt = Math.abs(level) * pxPer;
        y2 = baseY;
        y1 = baseY - hgt;
        rect(ctx, x, y1, barW, hgt, s.color);
        text(ctx, s.label, x + barW / 2, baseY + 16, "center", "#6b7280");
        text(ctx, fmtEUR(level), x + barW / 2, y1 - 6, "center");
      }

      x += barW + gap;
    });

    // hulp-lijn 0
    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(pad, baseY);
    ctx.lineTo(pad + chartW, baseY);
    ctx.stroke();
  }, [mode, wf]);

  const csCanvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (mode !== "consistency") return;
    const c = csCanvasRef.current;
    if (!c || !cs) return;
    const w = (c.width = 980);
    const h = (c.height = 320);

    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial";
    clearCanvas(ctx, w, h);

    const pad = 16;
    const chartW = w - pad * 2;
    const chartH = h - pad * 2 - 30;
    const baseY = pad + chartH;

    const items = cs.top15;
    if (!items.length) return;

    const maxPct = Math.max(...items.map((r) => r.pct));
    const pxPer = chartH / (maxPct || 1);

    const barW = Math.max(18, Math.floor(chartW / (items.length * 1.4)));
    const gap = Math.floor((chartW - items.length * barW) / (items.length - 1));

    let x = pad;
    items.forEach((r) => {
      const hgt = r.pct * pxPer;
      rect(ctx, x, baseY - hgt, barW, hgt, "#60a5fa");
      text(
        ctx,
        r.cust.length > 10 ? r.cust.slice(0, 10) + "…" : r.cust,
        x + barW / 2,
        baseY + 16,
        "center",
        "#6b7280"
      );
      text(ctx, fmtPct(r.pct), x + barW / 2, baseY - hgt - 6, "center");
      x += barW + gap;
    });

    // x-as
    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(pad, baseY);
    ctx.lineTo(pad + chartW, baseY);
    ctx.stroke();
  }, [mode, cs]);

  return (
    <div className="rounded-xl border bg-white p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium">
          Upload {mode === "waterfall" ? "Waterfall" : "Consistency"} CSV:
        </label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onFile(e.target.files?.[0])}
          className="text-sm"
        />
        <a
          className="text-xs underline text-sky-700"
          href={
            mode === "waterfall"
              ? "/templates/PharmaGtN_Waterfall_Template.csv"
              : "/templates/PharmaGtN_Consistency_Template.csv"
          }
          download
        >
          Download CSV-template
        </a>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* WATERFALL */}
      {mode === "waterfall" && wf && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">TOTAL GtN SPEND (€)</div>
              <div className="font-semibold">{fmtEUR(wf.gtnSpend)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">TOTAL GtN SPEND (%)</div>
              <div className="font-semibold">{fmtPct(wf.gtnPct)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">TOTAL DISCOUNT (€)</div>
              <div className="font-semibold">{fmtEUR(Math.abs(wf.totalDiscounts))}</div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="font-semibold mb-2">GROSS-TO-NET WATERFALL OVERVIEW</div>
            <div className="overflow-auto">
              <canvas
                ref={wfCanvasRef}
                className="w-full max-w-full border rounded"
                style={{ display: "block" }}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border p-3">
              <div className="font-semibold mb-2">Customer — Highest 3 (GtN spend)</div>
              {wf.topCustomers.map(([c, v]) => (
                <div key={c}>
                  {c} — {fmtEUR(v)} {wf.gross ? `(${fmtPct(v / wf.gross)})` : ""}
                </div>
              ))}
            </div>
            <div className="rounded-lg border p-3">
              <div className="font-semibold mb-2">SKU — Highest 3 (GtN spend)</div>
              {wf.topSkus.map(([s, v]) => (
                <div key={s}>
                  {s} — {fmtEUR(v)} {wf.gross ? `(${fmtPct(v / wf.gross)})` : ""}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-3 bg-emerald-50">
            <div className="font-semibold">Optimalisatiesuggesties</div>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-emerald-900">
              <li>Herijk Value Discounts (bandbreedtes per productgroep) — grootste driver in spend.</li>
              <li>Pak top-3 klanten/SKU’s met hoogste GtN spend eerst aan.</li>
              <li>Overweeg verschuiving kortingen → rebates waar governance/traceability belangrijk is.</li>
            </ul>
          </div>
        </div>
      )}

      {/* CONSISTENCY */}
      {mode === "consistency" && cs && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">TOTAL GROSS SALES</div>
              <div className="font-semibold">{fmtEUR(cs.totalGross)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">TOTAL INCENTIVES (€)</div>
              <div className="font-semibold">{fmtEUR(cs.totalIncent)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">TOTAL INCENTIVES (%)</div>
              <div className="font-semibold">{fmtPct(cs.totalPct)}</div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="font-semibold mb-2">Consistency — Top 15 customers (incentive %)</div>
            <div className="overflow-auto">
              <canvas
                ref={csCanvasRef}
                className="w-full max-w-full border rounded"
                style={{ display: "block" }}
              />
            </div>
          </div>

          <div className="rounded-lg border p-3 overflow-auto">
            <div className="font-semibold mb-2 text-sm">
              CONSISTENCY OVERVIEW TABLE — Highest 15 customers
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-3">Customer Name</th>
                  <th className="py-2 pr-3">Gross Sales (€)</th>
                  <th className="py-2 pr-3">Total Incentive (€)</th>
                  <th className="py-2">Total Incentive (%)</th>
                </tr>
              </thead>
              <tbody className="[&_td]:py-1">
                {cs.top15.map((r) => (
                  <tr key={r.cust} className="border-b last:border-0">
                    <td className="pr-3">{r.cust}</td>
                    <td className="pr-3">{fmtEUR(r.gross)}</td>
                    <td className="pr-3">{fmtEUR(r.incent)}</td>
                    <td>{fmtPct(r.pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-xs text-gray-500 mt-2">
              TOTAL — {fmtEUR(cs.totalGross)} | {fmtEUR(cs.totalIncent)} | {fmtPct(cs.totalPct)}
            </div>
          </div>

          <div className="rounded-lg border p-3 bg-emerald-50">
            <div className="font-semibold">Optimalisatiesuggesties</div>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-emerald-900">
              <li>Breng outliers (hoog % incentive) terug naar peer-bandbreedte per productgroep.</li>
              <li>Volumestaffels: incentive % daalt bij hogere afzet (stimuleert mix & marge).</li>
              <li>Combineer nettoprijs + productmix om margedoelen te halen per klantcluster.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
