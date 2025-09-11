// app/api/contracts/analyze/route.ts
import { NextResponse } from "next/server";
import { analyze, type Row, type ContractLevel } from "../../../../lib/contract-analysis";

/** Mini CSV parser (quotes + , of ; delimiter) */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = "", inQ = false;
  const delim = text.includes(";") && !text.includes(",") ? ";" : ",";
  for (let i=0;i<text.length;i++){
    const c = text[i], n = text[i+1];
    if (inQ){
      if (c === '"' && n === '"'){ cur += '"'; i++; }
      else if (c === '"'){ inQ = false; }
      else cur += c;
    } else {
      if (c === '"'){ inQ = true; }
      else if (c === '\n' || c === '\r'){
        if (cur.length || row.length){ row.push(cur); rows.push(row); row = []; cur = ""; }
        if (c === '\r' && n === '\n') i++;
      } else if (c === delim){ row.push(cur); cur = ""; }
      else cur += c;
    }
  }
  if (cur.length || row.length){ row.push(cur); rows.push(row); }
  if (rows.length && rows[0].length) rows[0][0] = rows[0][0].replace(/^\uFEFF/,"");
  return rows.filter(r=> r.some(c=> c.trim() !== ""));
}

function mapToRows(table: string[][]): Row[] {
  if (!table.length) return [];
  const header = table[0].map(h=>h.trim().toLowerCase());
  const idx = (name:string)=> header.indexOf(name);
  const need = ["klant","sku","aantal_units","claimbedrag","omzet","periode"];
  const miss = need.filter(n=> idx(n) < 0);
  if (miss.length) throw new Error(`Ontbrekende kolommen: ${miss.join(", ")}`);

  const out: Row[] = [];
  for (let r=1;r<table.length;r++){
    const row = table[r];
    if (!row.length) continue;
    out.push({
      klant: row[idx("klant")]?.trim() ?? "",
      sku: row[idx("sku")]?.trim() ?? "",
      aantal_units: Number(String(row[idx("aantal_units")]).replace(",", ".")) || 0,
      claimbedrag: Number(String(row[idx("claimbedrag")]).replace(",", ".")) || 0,
      omzet: Number(String(row[idx("omzet")]).replace(",", ".")) || 0,
      periode: String(row[idx("periode")]).trim(),
    });
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const level = (form.get("level") as ContractLevel) || "klant_sku";
    if (!file) return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });

    const text = await file.text();
    const table = parseCSV(text);
    const rows = mapToRows(table);
    const result = analyze(rows, level);
    return NextResponse.json({ ok: true, result });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || "Onbekende fout" }, { status: 400 });
  }
}
