import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { pdfBufferToText } from "@/lib/pdf/readText";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = { reg: string; unit_price_eur: number; valid_from?: string };

function toNumEU(s: string): number {
  const n = parseFloat(
    s.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  );
  return Number.isFinite(n) ? n : NaN;
}

function normReg(v: string) {
  return String(v ?? "").toUpperCase().replace(/[.\s]/g, "").trim();
}

/** Parse Staatscourant *text*:
 *  Heuristic:
 *   - find "Maximumprijs <amount> per <eenheid>"
 *   - the *next* "Registratienummer" block lists RVG/EU regs that inherit that price
 *   - repeat per Productgroep
 */
function parseStaatscourantText(txt: string): Row[] {
  const rows: Row[] = [];
  // Normalize some separators
  const t = txt
    .replace(/Registratienummer\s+Artikelnaam/gi, "REG_BLOCK")
    .replace(/Productgroep\s+Maximumprijs/gi, "PG_PRICE")
    .replace(/\s{2,}/g, " ");

  // Split by product-groups loosely
  const parts = t.split(/PG_PRICE/);
  for (const part of parts) {
    // pick first price in this chunk
    const priceMatch = part.match(
      /([0-9][\d\.,]*)\s*(?:per|p\.|p)\s*(stuk|ml|g|dosis|ampul|flacon)?/i
    );
    if (!priceMatch) continue;
    const price = toNumEU(priceMatch[1]);
    if (!Number.isFinite(price)) continue;

    // Extract REG blocks inside this chunk
    const regSections = part.split("REG_BLOCK").slice(1); // after the marker
    for (const sec of regSections) {
      // collect all reg numbers until next "Productgroep" or next "PG_PRICE"
      const regs = Array.from(
        sec.matchAll(
          /\b(?:EU\/[A-Z0-9/.-]+|\d{3,}(?:\/\/\d{3,})?)\b/g // EU/.. or 5-6 digit RVG with // variants
        )
      ).map((m) => normReg(m[0]));

      if (!regs.length) continue;

      // Try to find a date keyword near
      const vMatch = sec.match(
        /\b(ingangsdatum|geldig vanaf|valid from)\s*:?\s*(\d{1,2}\s*[a-zA-Z]+\s*\d{4}|\d{1,2}-\d{1,2}-\d{2,4}|\d{4}-\d{2}-\d{2})/i
      );
      const valid_from = vMatch ? vMatch[2] : undefined;

      for (const r of regs) {
        rows.push({ reg: r, unit_price_eur: price, valid_from });
      }
    }
  }

  // Deduplicate on (reg, price, valid_from)
  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = `${r.reg}|${r.unit_price_eur}|${r.valid_from ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Spreadsheet (.xlsx/.csv) fallback (same headers as your page expects)
function parseSheetToRows(buf: ArrayBuffer): Row[] {
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
  return json
    .map((o) => ({
      reg:
        normReg(
          o.reg ??
            o.regnr ??
            o.registratienummer ??
            o.rvg ??
            o["rvg nr"] ??
            o.rvg_nr ??
            ""
        ),
      unit_price_eur: toNumEU(String(o.unit_price_eur ?? o.eenheidsprijs ?? "")),
      valid_from: String(o.valid_from ?? o.geldig_vanaf ?? o.ingangsdatum ?? "")
        .trim()
        .replace(/\s+/g, " "),
    }))
    .filter((r) => r.reg && Number.isFinite(r.unit_price_eur));
}

export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Upload een bestand via multipart/form-data onder veldnaam 'file'." },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Ontbrekende file." }, { status: 400 });
    }

    const buf = await file.arrayBuffer();
    const ext = file.name.toLowerCase().split(".").pop() || "";

    let rows: Row[] = [];
    if (ext === "pdf") {
      const text = await pdfBufferToText(buf);
      rows = parseStaatscourantText(text);
    } else if (ext === "xlsx" || ext === "xls" || ext === "csv") {
      rows = parseSheetToRows(buf);
    } else {
      return NextResponse.json(
        { error: "Bestandstype niet ondersteund. Gebruik .pdf, .xlsx, .xls of .csv." },
        { status: 415 }
      );
    }

    if (!rows.length) {
      return NextResponse.json(
        { rows: [], warning: "Geen regels gevonden. Controleer of dit de Staatscourant bijlage is." },
        { status: 200 }
      );
    }

    return NextResponse.json({ rows }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Verwerken mislukt." },
      { status: 500 }
    );
  }
}
