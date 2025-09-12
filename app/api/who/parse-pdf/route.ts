import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse";

type ScUnitRow = { reg: string; unit_price_eur: number; valid_from?: string };

// EU nummer parser
function toNumEU(s: string) {
  const n = parseFloat(s.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}
function normReg(v: string) {
  return v.toUpperCase().replace(/[.\s]/g, "").trim();
}

// Heel simpele heuristiek voor Staatscourant-lay-out:
// - Zoek REGNR/RVG in de buurt van een bedrag (eenheidsprijs)
// - Ondersteunt formats met komma-decimaal en euroteken
function extractRows(text: string): ScUnitRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const rows: ScUnitRow[] = [];
  const dateGuess = (() => {
    const m = text.match(/\b(\d{2}-\d{2}-\d{4})\b/);
    return m ? m[1] : undefined;
  })();

  // Regex:
  // RVG of REG-nummer: 5–7 cijfers (Staatscourant publiceert vaak 6)
  const regRe = /\b(?:RVG|REG|REGNR)?\.?\s*([0-9]{5,7})\b/i;
  // Bedrag: € 1,2345 of 1,2345
  const eurRe = /€?\s*([0-9.\,]{1,10})\s*(?:per\s*eenheid|p\/e|eenheidsprijs)?/i;

  for (const ln of lines) {
    const a = regRe.exec(ln);
    const b = eurRe.exec(ln);
    if (!a || !b) continue;

    const reg = normReg(a[1]);
    const val = toNumEU(b[1]);
    if (!reg || !Number.isFinite(val)) continue;

    rows.push({ reg, unit_price_eur: +val, valid_from: dateGuess });
  }

  // Extra heuristiek: check tabellen met gescheiden kolommen
  if (rows.length === 0) {
    for (const ln of lines) {
      const cols = ln.split(/\s{2,}|\t/).map((c) => c.trim());
      if (cols.length < 2) continue;
      const maybeReg = cols.find((c) => /^[0-9]{5,7}$/.test(c));
      const maybeAmt = cols.find((c) => /[0-9],[0-9]{2,4}/.test(c) || /€/.test(c));
      if (!maybeReg || !maybeAmt) continue;
      const reg = normReg(maybeReg);
      const val = toNumEU(maybeAmt);
      if (reg && Number.isFinite(val)) rows.push({ reg, unit_price_eur: +val, valid_from: dateGuess });
    }
  }

  // dedupe op reg; neem laatste (meest recente regel in pdf)
  const dedup = new Map<string, ScUnitRow>();
  for (const r of rows) dedup.set(r.reg, r);
  return [...dedup.values()];
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Geen PDF ontvangen." }, { status: 400 });
    if (!/\.pdf$/i.test(file.name)) {
      return NextResponse.json({ error: "Upload een .pdf bestand." }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = await pdf(buf);
    const rows = extractRows(parsed.text || "");

    if (!rows.length) {
      return NextResponse.json(
        { error: "Geen eenheidsprijzen gevonden. Is dit een gescande/beeld-PDF? Probeer .xlsx/.csv." },
        { status: 422 }
      );
    }
    return NextResponse.json({ rows }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "PDF parsing mislukt." }, { status: 500 });
  }
}
