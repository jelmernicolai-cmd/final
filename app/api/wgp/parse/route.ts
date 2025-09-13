// app/api/wgp/parse/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { extractTextFromPdf } from "@/lib/pdf/readText";

type Row = { reg: string; unit_price_eur: number; valid_from?: string };

function normReg(v: any) {
  return String(v ?? "").toUpperCase().replace(/[.\s]/g, "").trim();
}
function toNumEU(v: any) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v ?? "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

function parsePdfTextToRows(text: string): Row[] {
  // Eenvoudige heuristiek: zoek patronen als "RVG 12345" of "REGNR 12-345"
  // en prijzen "€ 1,2345" of "1,2345".
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const rows: Row[] = [];
  let currentReg = "";

  const regRe = /\b(?:RVG|REG(?:NR)?)[\s:]*([0-9.\-\s]{3,})\b/i;
  const priceRe = /(?:€\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d+)|\d+(?:\.\d+)?)/;

  for (const ln of lines) {
    const mReg = ln.match(regRe);
    if (mReg) currentReg = normReg(mReg[1]);

    const mPrice = ln.match(priceRe);
    if (currentReg && mPrice) {
      const val = toNumEU(mPrice[1]);
      if (Number.isFinite(val)) {
        rows.push({ reg: currentReg, unit_price_eur: val });
        currentReg = ""; // 1 prijs per reg lijn (pas aan indien nodig)
      }
    }
  }
  // de-dupliceren (laatste wint)
  const byKey = new Map<string, Row>();
  for (const r of rows) byKey.set(r.reg, r);
  return Array.from(byKey.values());
}

function parseSheetToRows(buf: ArrayBuffer): Row[] {
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });

  return json.map((o) => {
    const lower: Record<string, any> = {};
    for (const [k, v] of Object.entries(o)) lower[String(k).toLowerCase()] = v;
    const reg =
      lower["reg"] ??
      lower["regnr"] ??
      lower["registratienummer"] ??
      lower["rvg"] ??
      lower["rvg_nr"] ??
      lower["rvg nr"] ??
      "";
    const unit =
      lower["unit_price_eur"] ??
      lower["eenheidsprijs"] ??
      lower["unitprice"] ??
      lower["prijs_per_eenheid"] ??
      lower["eenheidsprijs(€)"] ??
      "";
    const valid_from = String(
      lower["valid_from"] ?? lower["geldig_vanaf"] ?? lower["ingangsdatum"] ?? ""
    ).trim();

    return {
      reg: normReg(reg),
      unit_price_eur: toNumEU(unit),
      valid_from,
    };
  }).filter(r => r.reg && Number.isFinite(r.unit_price_eur));
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Upload veld 'file' ontbreekt." }, { status: 400 });
    }

    const ext = (file.name.split(".").pop() || "").toLowerCase();

    if (ext === "pdf") {
      const buf = await file.arrayBuffer();
      const text = await extractTextFromPdf(buf);
      const rows = parsePdfTextToRows(text);
      return NextResponse.json({ rows });
    }

    if (ext === "xlsx" || ext === "xls" || ext === "csv") {
      const buf = await file.arrayBuffer();
      const rows = parseSheetToRows(buf);
      return NextResponse.json({ rows });
    }

    return NextResponse.json({ error: "Ondersteund: .pdf, .xlsx, .xls, .csv" }, { status: 415 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Verwerken mislukt" }, { status: 500 });
  }
}
