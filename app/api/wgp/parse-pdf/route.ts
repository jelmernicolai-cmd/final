// app/api/wgp/parse-pdf/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";         // pdf-parse vereist Node
export const dynamic = "force-dynamic";  // geen prerender / build-evaluatie
export const maxDuration = 60;           // extra tijd voor zwaardere PDF's

type ScPdfRow = {
  reg: string;             // genormaliseerd REG/RVG-nummer
  unit_price_eur: number;  // gevonden eenheidsprijs
  valid_from?: string;     // optioneel
};

/** ----------------- Helpers ----------------- */
function normReg(v: unknown) {
  return String(v ?? "")
    .toUpperCase()
    .replace(/[.\s]/g, "")
    .trim()
    .replace(/^0+/, "");
}

function toNumEU(v: string) {
  // accepteert 1.234,56 of 1234.56
  const s = v.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

function extractRowsFromText(txt: string): ScPdfRow[] {
  const lines = txt
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows: ScPdfRow[] = [];

  const regRegex =
    /\b(?:RVG|REG\.?NR\.?|REGNR|REGISTRATIENUMMER)\s*[:.]?\s*([0-9][0-9.\s]*)\b/i;
  const priceRegex =
    /(?:€\s*|\b)(\d{1,3}(?:[.,]\d{3})*[.,]\d{2,4}|\d+[.,]\d{2,4})(?:\s*(?:euro|EUR))?\b/i;
  const validFromRegex =
    /\b(geldig(?:\s+vanaf)?|inwerkingtreding)\s*[:.]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/i;

  for (const line of lines) {
    const regMatch = line.match(regRegex);
    const priceMatch = line.match(priceRegex);

    if (regMatch && priceMatch) {
      const reg = normReg(regMatch[1]);
      const unit = toNumEU(priceMatch[1]);
      if (reg && Number.isFinite(unit)) {
        const vf = line.match(validFromRegex)?.[2];
        rows.push({ reg, unit_price_eur: unit, valid_from: vf });
      }
    }
  }

  // Dedup op (reg, unit_price_eur)
  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = `${r.reg}::${r.unit_price_eur}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** ----------------- Handlers ----------------- */
export async function GET() {
  return NextResponse.json({
    ok: true,
    info: "POST een PDF met form-data veld 'file'.",
  });
}

export async function POST(req: Request) {
  try {
    // Dynamische import voorkomt CJS/ESM gedoe en top-level evaluatie
    const { default: pdfParse } = await import("pdf-parse");

    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Geen bestand ontvangen (verwacht veldnaam 'file')." },
        { status: 400 }
      );
    }

    const name = (file.name || "").toLowerCase();
    const isPdf = name.endsWith(".pdf") || /pdf/i.test(file.type || "");
    if (!isPdf) {
      return NextResponse.json(
        { error: "Alleen PDF wordt hier ondersteund." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdfParse(buffer);

    const text = (data?.text || "").trim();
    if (!text) {
      return NextResponse.json(
        { error: "Kon geen tekst uit PDF halen." },
        { status: 422 }
      );
    }

    const rows = extractRowsFromText(text);

    // Payload beperken
    const MAX_TEXT = 150_000;
    const safeText = text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) + "…" : text;

    return NextResponse.json({
      ok: true,
      meta: {
        pages: data?.numpages,
        info: data?.info || null,
      },
      rows,
      text: safeText, // verwijder dit veld als je ruwe tekst niet wilt terugsturen
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "PDF kon niet worden verwerkt." },
      { status: 500 }
    );
  }
}
