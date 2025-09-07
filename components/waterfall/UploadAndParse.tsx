"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import type { Row } from "@/lib/waterfall-types";

export const WF_STORE_KEY = "pharmagtn_waterfall_v1";

// --- helpers ---

function n(v: unknown): number {
  // Safe number cast voor alle rekenvelden
  const num = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return isFinite(num) ? num : 0;
}

function s(v: unknown): string {
  return (v ?? "").toString().trim();
}

// Optioneel: header-normalisatie zodat variaties in Excel toch mappen
function normHeader(h: string) {
  const k = h.toLowerCase().trim();
  // voeg varianten toe als jouw klant-export andere kolomnamen gebruikt
  const map: Record<string, string> = {
    pg: "pg",
    "product group": "pg",
    "productgroep": "pg",

    sku: "sku",
    artikel: "sku",

    cust: "cust",
    klant: "cust",
    customer: "cust",

    period: "period",
    periode: "period",
    maand: "period",

    gross: "gross",
    "gross sales": "gross",

    d_channel: "d_channel",
    "discount channel": "d_channel",

    d_customer: "d_customer",
    "discount customer": "d_customer",

    d_product: "d_product",
    "discount product": "d_product",

    d_volume: "d_volume",
    "discount volume": "d_volume",

    d_other_sales: "d_other_sales",
    "discount other": "d_other_sales",
    "other sales discount": "d_other_sales",

    d_mandatory: "d_mandatory",
    "discount mandatory": "d_mandatory",

    d_local: "d_local",
    "discount local": "d_local",

    invoiced: "invoiced",
    "invoiced sales": "invoiced",

    r_direct: "r_direct",
    "rebate direct": "r_direct",

    r_prompt: "r_prompt",
    "rebate prompt": "r_prompt",

    r_indirect: "r_indirect",
    "rebate indirect": "r_indirect",

    r_mandatory: "r_mandatory",
    "rebate mandatory": "r_mandatory",

    r_local: "r_local",
    "rebate local": "r_local",

    inc_royalty: "inc_royalty",
    "income royalty": "inc_royalty",

    inc_other: "inc_other",
    "income other": "inc_other",

    net: "net",
    "net sales": "net",
  };

  return map[k] ?? k; // als onbekend: retourneer zoals het is
}

// Parser die de sheet naar onze `Row[]` brengt
function parseWorksheetToRows(ws: XLSX.WorkSheet): Row[] {
  // Lees eerst de headers zoals ze in Excel staan
  const sheetJson = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
  if (!sheetJson.length) return [];

  // Bouw een header-map op basis van de eerste rij
  const rawHeaders = Object.keys(sheetJson[0]);
  const headerMap = rawHeaders.reduce<Record<string, string>>((acc, h) => {
    acc[h] = normHeader(h);
    return acc;
  }, {});

  // Map elke rij naar ons Row-shape met harde number casts
  const rows: Row[] = sheetJson.map((r) => ({
    pg: s(r[rawHeaders.find((h) => headerMap[h] === "pg") ?? "pg"]),
    sku: s(r[rawHeaders.find((h) => headerMap[h] === "sku") ?? "sku"]),
    cust: s(r[rawHeaders.find((h) => headerMap[h] === "cust") ?? "cust"]),
    period: s(r[rawHeaders.find((h) => headerMap[h] === "period") ?? "period"]),

    gross: n(r[rawHeaders.find((h) => headerMap[h] === "gross") ?? "gross"]),

    d_channel: n(r[rawHeaders.find((h) => headerMap[h] === "d_channel") ?? "d_channel"]),
    d_customer: n(r[rawHeaders.find((h) => headerMap[h] === "d_customer") ?? "d_customer"]),
    d_product: n(r[rawHeaders.find((h) => headerMap[h] === "d_product") ?? "d_product"]),
    d_volume: n(r[rawHeaders.find((h) => headerMap[h] === "d_volume") ?? "d_volume"]),
    d_other_sales: n(r[rawHeaders.find((h) => headerMap[h] === "d_other_sales") ?? "d_other_sales"]),
    d_mandatory: n(r[rawHeaders.find((h) => headerMap[h] === "d_mandatory") ?? "d_mandatory"]),
    d_local: n(r[rawHeaders.find((h) => headerMap[h] === "d_local") ?? "d_local"]),

    invoiced: n(r[rawHeaders.find((h) => headerMap[h] === "invoiced") ?? "invoiced"]),

    r_direct: n(r[rawHeaders.find((h) => headerMap[h] === "r_direct") ?? "r_direct"]),
    r_prompt: n(r[rawHeaders.find((h) => headerMap[h] === "r_prompt") ?? "r_prompt"]),
    r_indirect: n(r[rawHeaders.find((h) => headerMap[h] === "r_indirect") ?? "r_indirect"]),
    r_mandatory: n(r[rawHeaders.find((h) => headerMap[h] === "r_mandatory") ?? "r_mandatory"]),
    r_local: n(r[rawHeaders.find((h) => headerMap[h] === "r_local") ?? "r_local"]),

    inc_royalty: n(r[rawHeaders.find((h) => headerMap[h] === "inc_royalty") ?? "inc_royalty"]),
    inc_other: n(r[rawHeaders.find((h) => headerMap[h] === "inc_other") ?? "inc_other"]),

    net: n(r[rawHeaders.find((h) => headerMap[h] === "net") ?? "net"]),
  }));

  // Optioneel: filter lege rijen (zonder pg/sku/cust/gross)
  return rows.filter((r) => r.pg || r.sku || r.cust || r.gross);
}

// --- component ---

export default function UploadAndParse() {
  const [busy, setBusy] = React.useState(false);
  const [okCount, setOkCount] = React.useState<number | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  function storeRows(rows: Row[]) {
    const payload = JSON.stringify({ rows });
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(WF_STORE_KEY, payload);
      }
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(WF_STORE_KEY, payload);
      }
      setOkCount(rows.length);
    } catch (e) {
      console.error("Storage error", e);
      alert("Kon data niet bewaren in storage (mogelijk te veel data of browser restrictie).");
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    setBusy(true);
    setOkCount(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const first = wb.SheetNames[0];
        const ws = wb.Sheets[first];
        if (!ws) throw new Error("Geen sheet gevonden in Excel.");
        const rows = parseWorksheetToRows(ws);
        if (!rows.length) throw new Error("Geen geldige rijen gevonden na parsing.");
        storeRows(rows);
      } catch (err: any) {
        console.error(err);
        alert(err?.message ?? "Onbekende fout bij het lezen van het Excel-bestand.");
      } finally {
        setBusy(false);
        if (fileRef.current) fileRef.current.value = ""; // reset
      }
    };
    reader.onerror = () => {
      setBusy(false);
      alert("Fout bij het lezen van het bestand.");
    };
    reader.readAsArrayBuffer(f);
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <h2 className="font-semibold">Excel uploaden (Waterfall dataset)</h2>
      <p className="text-sm text-gray-600 mt-1">
        Kies de export met kolommen voor gross/discounts/rebates/net. De data wordt alleen in je browser opgeslagen.
      </p>

      <div className="mt-3 flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={onFile}
          disabled={busy}
          className="block text-sm"
        />
        {busy && <span className="text-sm text-gray-600">Bezig met inlezen…</span>}
        {okCount !== null && !busy && (
          <span className="text-sm text-green-700">Geïmporteerd: {okCount} rijen</span>
        )}
      </div>

      <p className="text-[12px] text-gray-500 mt-3">
        Privacy: gegevens blijven lokaal in je browser (session/localStorage). Er wordt niets naar een server verzonden.
      </p>
    </div>
  );
}
