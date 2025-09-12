import pdf from "pdf-parse";

// Zorg dat dit NIET op edge draait
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // Ontvang FormData met "pdf"
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data"))
      return new Response(JSON.stringify({ error: "Upload als multipart/form-data met veld 'pdf'." }), { status: 400 });

    const form = await req.formData();
    const f = form.get("pdf");
    if (!(f instanceof File)) return new Response(JSON.stringify({ error: "Geen PDF ontvangen." }), { status: 400 });

    const buf = Buffer.from(await f.arrayBuffer());
    const out = await pdf(buf); // tekst extract

    // Heuristische parser: we splitsen in blokken per lege regel
    const text = (out.text || "").replace(/\u00A0/g, " ").trim();
    const blocks = text.split(/\n\s*\n/g);

    const rows: { reg: string; unit_price_eur: number; valid_from?: string; source?: string; raw?: string }[] = [];
    const issues: string[] = [];

    // Regex varianten
    const regPat = /\b(?:REG(?:\.|NR)?|REGNR|REG\.\s*NR\.|RVG|REGISTRATIENUMMER)\s*[:.]?\s*([A-Z0-9.\s]{4,})/i;
    // Europese notatie: € 1,2345 of 1,2345 EUR — ook zonder €
    const pricePat = /(?:€\s*)?([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2,4})|[0-9]+,[0-9]{2,4})\s*(?:EUR|\€)?\b/i;
    const datePat = /\b(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})\b/;

    function normReg(v: string) {
      return v.trim().toUpperCase().replace(/[.\s]/g, "");
    }
    function toNumEUR(s: string) {
      const n = parseFloat(s.replace(/\./g, "").replace(",", "."));
      return Number.isFinite(n) ? n : NaN;
    }

    for (const raw of blocks) {
      const block = raw.replace(/\n+/g, " ").trim();
      if (!block) continue;

      // 1) pak REG (regnr/RVG)
      const mReg = block.match(regPat);
      const reg = mReg ? normReg(mReg[1]) : "";

      // 2) pak eenheidsprijs (eerste match in blok)
      const mPrice = block.match(pricePat);
      const unit = mPrice ? toNumEUR(mPrice[1]) : NaN;

      if (reg && Number.isFinite(unit)) {
        const d = block.match(datePat)?.[0] || undefined;
        rows.push({ reg, unit_price_eur: unit, valid_from: d, source: "Staatscourant", raw });
      } else {
        // Probeer alternatieve tactiek: soms staat prijs op volgende regel/volgende blok
        // (Voor nu: log issue — bij echte publicaties werkt eerste aanpak meestal)
        issues.push(`Kon blok niet matchen: ${(block.slice(0, 120) + (block.length > 120 ? "…" : ""))}`);
      }
    }

    // Unieke REGNR’s houden (laatste prijs wint)
    const byReg = new Map<string, { reg: string; unit_price_eur: number; valid_from?: string; source?: string; raw?: string }>();
    for (const r of rows) byReg.set(r.reg, r);

    const uniq = Array.from(byReg.values());

    return Response.json({ rows: uniq, issues });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Parse-fout" }), { status: 500 });
  }
}
