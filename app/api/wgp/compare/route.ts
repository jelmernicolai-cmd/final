import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type AipIn = {
  reg: string;       // genormaliseerd REGNR/RVG (zonder spaties/punten)
  pack: number;      // stuks per verpakking (integer)
  aip?: number;      // huidige AIP (EUR)
  sku?: string;
  name?: string;
  zi?: string;
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
  diff_pct: number | null;   // (suggested - current)/current
  update: boolean;           // true als |diff_pct| >= threshold én waarden valide
  note?: string;
};

function normReg(v: any) {
  return String(v ?? "").toUpperCase().replace(/[.\s]/g, "").trim();
}

async function fetchPdfBufferFromUrl(url: string): Promise<Buffer> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Fetch ${res.status} ${res.statusText}`);
  const ct = res.headers.get("content-type") || "";
  if (!/pdf|octet-stream/i.test(ct)) {
    // Staatscourant serveert soms octet-stream: beide accepteren
    throw new Error(`Onverwachte content-type: ${ct}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

function parseScUnitsFromText(text: string): Map<string, { unit: number; valid_from?: string }> {
  // Minimalistische parser:
  // - Zoek kop "Registratienummer Artikelnaam" per productgroep.
  // - Pak regels eronder: ^<REGNR>\s+<ARTIKEL...>
  // - Eénheidsprijs staat in de kop van de productgroep: "... <price> per <uom>"
  // We “dragen” de laatst gevonden price naar registraties in die groep.
  const map = new Map<string, { unit: number; valid_from?: string }>();

  const blocks = text.split(/Productgroep Maximumprijs/g);
  const priceLineRe = /([\d.,]+)\s*per\s+(\w+)/i;
  const regLineRe = /^([A-Z0-9/\.]+(?:\/\/[A-Z0-9/\.]+)?)\s+(.+)$/i;

  for (const raw of blocks) {
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    // vind prijs
    let price: number | null = null;
    for (const ln of lines.slice(0, 10)) {
      const m = priceLineRe.exec(ln);
      if (m) {
        const val = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
        if (Number.isFinite(val)) {
          price = val;
          break;
        }
      }
    }
    if (!Number.isFinite(price as number)) continue;

    // vind registraties na "Registratienummer Artikelnaam"
    let regStart = lines.findIndex(l => l.startsWith("Registratienummer Artikelnaam"));
    if (regStart === -1) continue;
    for (const ln of lines.slice(regStart + 1)) {
      const m = regLineRe.exec(ln);
      if (m) {
        const reg = normReg(m[1]);
        if (reg) map.set(reg, { unit: price! });
      }
    }
  }
  return map;
}

export async function POST(req: Request) {
  try {
    // Body varianten:
    // JSON: { url: string, aip: AipIn[], thresholdPct?: number }
    // of multipart: file (pdf) + json (aip, thresholdPct)
    const ct = req.headers.get("content-type") || "";
    let aipList: AipIn[] = [];
    let thresholdPct = 0.001; // 0.1% default drempel
    let pdfBuffer: Buffer | null = null;

    if (ct.includes("application/json")) {
      const body = await req.json();
      const url = String(body?.url || "").trim();
      const aip = Array.isArray(body?.aip) ? body.aip : [];
      thresholdPct = Number(body?.thresholdPct ?? thresholdPct);
      aipList = aip.map((r: any) => ({
        reg: normReg(r?.reg),
        pack: Number(r?.pack ?? 0) || 0,
        aip: Number.isFinite(Number(r?.aip)) ? Number(r?.aip) : null,
        sku: r?.sku,
        name: r?.name,
        zi: r?.zi,
      }));
      if (!url) return NextResponse.json({ ok: false, error: "Ontbrekende 'url' in body" }, { status: 400 });
      pdfBuffer = await fetchPdfBufferFromUrl(url);
    } else if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      const json = form.get("json") as string | null;
      if (!file && !json) return NextResponse.json({ ok: false, error: "Ontbrekende file/json" }, { status: 400 });
      if (json) {
        const j = JSON.parse(json);
        const aip = Array.isArray(j?.aip) ? j.aip : [];
        thresholdPct = Number(j?.thresholdPct ?? thresholdPct);
        aipList = aip.map((r: any) => ({
          reg: normReg(r?.reg),
          pack: Number(r?.pack ?? 0) || 0,
          aip: Number.isFinite(Number(r?.aip)) ? Number(r?.aip) : null,
          sku: r?.sku,
          name: r?.name,
          zi: r?.zi,
        }));
      }
      if (file) {
        const ab = await file.arrayBuffer();
        pdfBuffer = Buffer.from(ab);
      }
    } else {
      return NextResponse.json({ ok: false, error: "Gebruik JSON {url,aip} of multipart met 'file' en 'json'." }, { status: 400 });
    }

    if (!pdfBuffer) return NextResponse.json({ ok: false, error: "Geen PDF ontvangen" }, { status: 400 });

    // Parse PDF text
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(pdfBuffer);
    const text = String(parsed?.text || "");
    if (!text.trim()) return NextResponse.json({ ok: false, error: "PDF bevat geen tekst (gescand?)" }, { status: 400 });

    // Extract eenheidsprijzen per REGNR
    const scMap = parseScUnitsFromText(text); // Map<reg, {unit}>
    const out: DiffRow[] = [];

    for (const r of aipList) {
      const pack = Number.isFinite(r.pack) && r.pack > 0 ? r.pack : null;
      const current = Number.isFinite(r.aip as number) ? (r.aip as number) : null;
      const sc = scMap.get(r.reg);
      const unit = sc ? sc.unit : null;
      const suggested = unit !== null && pack !== null ? +(unit * pack).toFixed(4) : null;

      let diff_eur: number | null = null;
      let diff_pct: number | null = null;
      let update = false;
      let note: string | undefined;

      if (current !== null && suggested !== null) {
        diff_eur = +(suggested - current).toFixed(4);
        if (current !== 0) {
          diff_pct = +(diff_eur / current).toFixed(6);
          update = Math.abs(diff_pct) >= (Number.isFinite(thresholdPct) ? thresholdPct : 0.001);
        } else {
          diff_pct = null;
          update = true; // huidige 0 => altijd aandacht
        }
      } else {
        if (!sc) note = "Geen eenheidsprijs in Staatscourant";
        if (pack === null) note = note ? `${note}; pack ontbreekt` : "Pack ontbreekt";
        if (current === null) note = note ? `${note}; huidige AIP ontbreekt` : "Huidige AIP ontbreekt";
      }

      out.push({
        reg: r.reg,
        sku: r.sku,
        name: r.name,
        zi: r.zi,
        pack,
        aip_current: current,
        unit_price_eur: unit,
        aip_suggested: suggested,
        diff_eur,
        diff_pct,
        update,
        note,
      });
    }

    return NextResponse.json({ ok: true, rows: out });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Vergelijking mislukt" }, { status: 400 });
  }
}
