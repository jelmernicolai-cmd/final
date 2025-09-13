// app/app/wgp-compare-targeted/page.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";

/** ================= Types ================= */
type AipRow = {
  sku?: string;
  name?: string;
  zi?: string;
  reg: string;
  pack: number;
  aip?: number;
};
type DiffRow = {
  reg: string;
  sku?: string;
  name?: string;
  zi?: string;
  pack: number | null;
  aip_current: number | null;
  unit_price_eur: number | null;
  aip_suggested: number | null;
  diff_eur: number | null;
  diff_pct: number | null;
  page?: number;
  update: boolean;
  note?: string;
};

/** ================= Helpers ================= */
function normReg(v: any) {
  return String(v ?? "").toUpperCase().replace(/[.\s]/g, "").trim();
}
function toNumEU(v: any, fallback = NaN) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v ?? "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "")
    .trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}
function toAipRow(o: Record<string, any>): AipRow {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (o[k] !== undefined && o[k] !== null && String(o[k]).trim() !== "")
        return o[k];
      const kk = Object.keys(o).find(
        (x) =>
          x.toLowerCase().replace(/\s|\./g, "") ===
          k.toLowerCase().replace(/\s|\./g, "")
      );
      if (kk) return o[kk];
    }
    return "";
  };
  const str = (v: any) => String(v ?? "").trim();
  const num = (v: any, fb = NaN) => toNumEU(v, fb);
  return {
    sku: str(pick("sku", "productcode")),
    name: str(pick("product", "productnaam", "product naam", "naam")),
    zi: str(pick("zi", "zi-nummer", "zinummer")),
    reg: normReg(
      pick(
        "reg",
        "registratienummer",
        "rvg",
        "rvgnr",
        "regnr",
        "reg.nr",
        "rvg nr",
        "rvg_nr"
      )
    ),
    pack: Math.max(
      0,
      Math.round(
        num(
          pick(
            "pack",
            "verpakking",
            "standaard verpakk. grootte",
            "standaard verpakking"
          ),
          0
        )
      )
    ),
    aip: num(pick("aip", "lijstprijs", "apotheekinkoopprijs"), NaN),
  };
}
async function readSheetToJson(file: File): Promise<any[]> {
  const ext = (file.name.toLowerCase().split(".").pop() || "").trim();
  if (ext === "xlsx" || ext === "xls") {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: "" });
  }
  if (ext === "csv") {
    const txt = await file.text();
    const wb = XLSX.read(txt, { type: "string" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: "" });
  }
  throw new Error("Ondersteund: .xlsx, .xls, .csv");
}
function exportXlsx(filename: string, rows: any[], sheet = "Sheet1") {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith(".xlsx") ? filename : filename + ".xlsx";
  a.click();
  URL.revokeObjectURL(a.href);
}

/** ===== Targeted PDF scan ===== */
const PRICE_RE = /([\d.,]+)\s*per\s+([A-Za-z]+)/i;
const REG_RE = /\b([A-Z0-9/\.]+(?:\/\/[A-Z0-9/\.]+)?)\b/g;

async function scanPdfForRegs(
  file: File,
  targetRegs: Set<string>,
  onProgress?: (done: number, total: number) => void
) {
  const buf = await file.arrayBuffer();

  // ✅ dynamic import vanaf root, fallback naar default export
  // @ts-ignore
  const mod: any = await import("pdfjs-dist");
  const pdfjs: any = mod?.getDocument ? mod : mod?.default ?? mod;

  const loadingTask = pdfjs.getDocument({
    data: buf,
    disableWorker: true,
    isEvalSupported: false,
    useWorkerFetch: false,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  const total = pdf.numPages;

  const found = new Map<string, { unit: number; page: number }>();
  const remaining = new Set(targetRegs);

  for (let p = 1; p <= total; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const text = (content.items as any[])
      .map((it) => (it as any).str || "")
      .join(" ");

    let unit: number | null = null;
    const m = PRICE_RE.exec(text);
    if (m) {
      const val = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
      if (Number.isFinite(val)) unit = val;
    }
    PRICE_RE.lastIndex = 0;

    let hit: RegExpExecArray | null;
    while ((hit = REG_RE.exec(text)) !== null) {
      const reg = normReg(hit[1]);
      if (unit !== null && remaining.has(reg)) {
        found.set(reg, { unit, page: p });
        remaining.delete(reg);
      }
    }
    REG_RE.lastIndex = 0;

    onProgress?.(p, total);
    if (remaining.size === 0) break;
  }

  return { found, totalPages: total };
}

/** ================= Page ================= */
export default function Page() {
  const [aip, setAip] = useState<AipRow[]>([]);
  const [diffs, setDiffs] = useState<DiffRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [thresholdPct, setThresholdPct] = useState<number>(0.001);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null
  );
  const pdfFileRef = useRef<File | null>(null);

  // ... rest van de component ongewijzigd (upload AIP, scan PDF, render UI, export Excel)
  // (je kunt mijn vorige versie hier gewoon plakken; enige verschil zit in scanPdfForRegs)
}
