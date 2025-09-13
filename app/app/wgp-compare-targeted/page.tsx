// app/app/wgp-compare-targeted/page.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";

// ⛔️ Verwijder ALLES wat pdfjs statisch importeert hierboven.
// Geen GlobalWorkerOptions meer nodig.

// ... laat je type-definities en helpers verder ongewijzigd ...

/** ===== Targeted PDF scan (dynamic import, no worker) ===== */
const PRICE_RE = /([\d.,]+)\s*per\s+([A-Za-z]+)/i;
const REG_RE = /\b([A-Z0-9/\.]+(?:\/\/[A-Z0-9/\.]+)?)\b/g;

async function scanPdfForRegs(
  file: File,
  targetRegs: Set<string>,
  onProgress?: (done: number, total: number)=>void
) {
  const buf = await file.arrayBuffer();

  // ✅ Dynamic import voorkomt type/resolve issues op Vercel
  const pdfjs: any = await import("pdfjs-dist/build/pdf");

  // ✅ Draai zonder worker → geen workerSrc nodig
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
    const text = (content.items as any[]).map((it) => (it as any).str || "").join(" ");

    // prijs zoeken
    let unit: number | null = null;
    const m = PRICE_RE.exec(text);
    if (m) {
      const val = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
      if (Number.isFinite(val)) unit = val;
    }
    PRICE_RE.lastIndex = 0;

    // REGNR’s op pagina
    let hit: RegExpExecArray | null;
    while ((hit = REG_RE.exec(text)) !== null) {
      const reg = String(hit[1] ?? "").toUpperCase().replace(/[.\s]/g, "").trim();
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

// ⬇️ Laat de rest van je component (state, UI, exportDiffs, etc.) ongewijzigd
// (Gebruik nog steeds runTargetedScan() dat scanPdfForRegs() aanroept)
