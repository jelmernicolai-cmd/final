// app/api/discounts/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";         // Node runtime nodig (Buffer)
export const dynamic = "force-dynamic";  // voorkom prerender/evaluatie tijdens build
export const revalidate = 0;             // niet cachen door Next (we cachen zelf via headers)

type Row = { name: string; withoutArr: number; realized: number };

function parseNLNumber(s: string): number {
  const norm = s.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const n = parseFloat(norm);
  return isFinite(n) ? n : NaN;
}

// Zet PDF textContent -> “regels” (heuristiek: breek op grote horizontale sprongen en harde returns)
function textItemsToLines(items: any[]): string[] {
  const lines: string[] = [];
  let current = "";
  let lastX: number | null = null;

  for (const it of items) {
    const str = (it?.str ?? "").toString();
    if (!str) continue;

    // Als de PDF engine een “hard return” markeert
    if (str === "\n") {
      if (current.trim()) lines.push(current.trim());
      current = "";
      lastX = null;
      continue;
    }

    // Als er een grote sprong in X is, interpreteer als scheiding
    const x: number | undefined = typeof it?.transform?.[4] === "number" ? it.transform[4] : undefined;
    if (lastX != null && x != null && Math.abs(x - lastX) > 120) {
      if (current.trim()) {
        lines.push(current.trim());
        current = "";
      }
    }
    current += (current ? " " : "") + str;
    if (x != null) lastX = x;
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

export async function POST(req: Request) {
  try {
    const { url } = (await req.json().catch(() => ({}))) as { url?: string };
    const src = (url ?? process.env.VWS_BIJLAGE_URL)?.trim();
    if (!src) return new NextResponse("Geef 'url' of stel VWS_BIJLAGE_URL in.", { status: 400 });
    if (!/^https?:\/\/.+\.pdf$/i.test(src)) return new NextResponse("URL moet naar een PDF wijzen.", { status: 400 });

    // 1) Download PDF
    const resp = await fetch(src, { headers: { "user-agent": "PharmGtN/1.0" }, cache: "no-store" });
    if (!resp.ok) return new NextResponse(`Download mislukt (${resp.status})`, { status: 502 });
    const ab = await resp.arrayBuffer();

    // 2) Lazy import van pdfjs-dist (voorkomt build-time evaluatie)
    const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
    // Worker niet nodig in Node runtime
    // pdfjsLib.GlobalWorkerOptions.workerSrc = undefined;

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(ab) });
    const doc = await loadingTask.promise;

    // 3) Pull alle pagina’s tekst
    let text = "";
    const allLines: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const items = content.items as any[];
      const lines = textItemsToLines(items);
      allLines.push(...lines);
      // fallback: ook ruwe text bij elkaar
      text += "\n" + items.map((i: any) => i?.str ?? "").join(" ");
    }

    // 4) Heuristisch jaartal
    const yearMatch = text.match(/20\d{2}/g);
    const year = yearMatch ? parseInt(yearMatch.slice(-1)[0], 10) : new Date().getFullYear();

    // 5) Vind de tabelregels met: <Naam> <Zonder arr> <Gerealiseerd>
    const headerIdx = allLines.findIndex((l) =>
      /geneesmiddel/i.test(l) && /uitgaven/i.test(l) && /zonder/i.test(l) && /gerealiseerd/i.test(l)
    );
    const rowRegex = /^(.+?)\s+([\d\.\,]+)\s+([\d\.\,]+)(?:\s*(?:mln|€|euro))?$/i;

    const rows: Row[] = [];
    for (let i = Math.max(0, headerIdx); i < allLines.length; i++) {
      const l = allLines[i];
      const m = l.match(rowRegex);
      if (!m) continue;
      const name = m[1].replace(/\s{2,}/g, " ").trim();
      const withoutArr = parseNLNumber(m[2]);
      const realized = parseNLNumber(m[3]);
      if (isFinite(withoutArr) && isFinite(realized) && withoutArr > 0 && realized >= 0) {
        rows.push({ name, withoutArr, realized });
      }
    }

    if (!rows.length) {
      // Soms staan de kolommen verspreid; probeer ruwe text fallback (langere regex)
      const fallbackRegex = /([A-Za-z0-9\-\s\/]+?)\s+(\d[\d\.\,]*)\s+(?:mln|€|euro)?\s+(\d[\d\.\,]*)/g;
      let m: RegExpExecArray | null;
      while ((m = fallbackRegex.exec(text))) {
        const name = m[1].replace(/\s{2,}/g, " ").trim();
        const withoutArr = parseNLNumber(m[2]);
        const realized = parseNLNumber(m[3]);
        if (name && isFinite(withoutArr) && isFinite(realized) && withoutArr > 0) {
          rows.push({ name, withoutArr, realized });
        }
      }
    }

    if (!rows.length) {
      return new NextResponse("Geen rijen gevonden. Is dit de juiste bijlage?", { status: 422 });
    }

    return NextResponse.json(
      { year, rows },
      { headers: { "cache-control": "public, max-age=600, s-maxage=86400" } }
    );
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Parserfout", { status: 500 });
  }
}
