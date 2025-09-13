// lib/pdf/readText.ts
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

// Worker not used on the server, but silence warnings
GlobalWorkerOptions.workerSrc = "pdfjs-dist/build/pdf.worker.mjs";

export async function pdfBufferToText(buffer: ArrayBuffer): Promise<string> {
  // Load document from buffer
  const loadingTask = getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  let all = "";

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const text = content.items
      .map((it: any) => ("str" in it ? it.str : ""))
      .join(" ");
    all += "\n" + text; // keep soft separators
  }
  try { await pdf.destroy(); } catch {}
  return all.replace(/\s+/g, " ").trim();
}
