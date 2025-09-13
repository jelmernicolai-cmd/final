import { NextResponse } from "next/server";
// Server-side PDF parsing met pdfjs-dist (geen pdf-parse nodig)
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

// Worker is niet nodig server-side, maar property moet bestaan
// @ts-ignore
pdfjs.GlobalWorkerOptions.workerSrc = "pdf.worker.mjs";

// Heel simpele heuristische extractor: pakt tekst en zoekt REG/RVG + prijs
function extractRowsFromText(text: string) {
  const rows: { reg: string; unit_price_eur: number; valid_from?: string }[] = [];

  // normaliseer whitespace
  const norm = text.replace(/\r/g, "").replace(/[ \t]+/g, " ");
  const lines = norm.split("\n").map((l) => l.trim()).filter(Boolean);

  // Regex-varianten: REGNR / RVG
  const regRe = /(RVG|REG(?:\.?|NR)?)[\s:]*([A-Z0-9.\- ]{3,})/i;
  // Eenheidsprijs, bv "0,1234", "1.234,56", "12.34"
  const eurRe = /(\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d{2,4})|\d+[.,]\d{2,4})\s*(?:€|eur)?/i;
  // Geldig vanaf
  const validRe = /(geldig vanaf|ingangsdatum|valid from)[:\s]*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i;

  let currentValid: string | undefined = undefined;
  for (const line of lines) {
    const v = validRe.exec(line);
    if (v) currentValid = v[2];

    const r = regRe.exec(line);
    if (!r) continue;

    // Zoek prijs op dezelfde regel of in de volgende regel(s) dichtbij
    let priceLine = line;
    let priceMatch = eurRe.exec(priceLine);

    // fallback: kijk in een window van 2 volgende regels
    // (veilig: lines[i+1], lines[i+2] – maar we hebben i hier niet.
    // simpele benadering: niks; vaak staat prijs op dezelfde regel)
    if (!priceMatch) continue;

    const regRaw = r[2].toUpperCase().replace(/[.\s]/g, "").trim();
    const priceStr = priceMatch[1];

    // EU getal naar float
    const n = Number(
      priceStr
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", ".")
    );
    if (Number.isFinite(n)) {
      rows.push({ reg: regRaw, unit_price_eur: n, valid_from: currentValid });
    }
  }

  // de-dupliceren op reg + valid_from, laatste wint
  const dedup = new Map<string, { reg: string; unit_price_eur: number; valid_from?: string }>();
  for (const r of rows) {
    dedup.set(`${r.reg}::${r.valid_from ?? ""}`, r);
  }
  return Array.from(dedup.values());
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload ontbreekt (field: file)" }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());

    const loadingTask = pdfjs.getDocument({ data: buf });
    const pdf = await loadingTask.promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((it: any) => ("str" in it ? it.str : (it as any).toString?.() ?? ""))
        .join(" ");
      fullText += pageText + "\n";
    }

    const rows = extractRowsFromText(fullText);
    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Parserfout" }, { status: 500 });
  }
}
