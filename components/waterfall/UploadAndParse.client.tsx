"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { validateAndNormalize } from "./validation";

// LocalStorage sleutel
export const WF_STORE_KEY = "pharmagtn_waterfall_v1";

export default function UploadAndParse() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<{warnings:string[]; errors:string[]; corrected:number} | null>(null);
  const router = useRouter();

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setReport(null);
    setBusy(true);
    try {
      const { default: XLSX } = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null });

      const res = validateAndNormalize(raw);
      setReport({ warnings: res.warnings, errors: res.errors, corrected: res.correctedCount });

      if (res.errors.length) {
        throw new Error("Template bevat blocking fouten. Corrigeer en probeer opnieuw.");
      }

      const payload = {
        meta: {
          uploadedAt: Date.now(),
          sheet: sheetName,
          rows: res.rows.length,
          validation: {
            warnings: res.warnings,
            corrected: res.correctedCount,
          },
        },
        rows: res.rows,
      };

      localStorage.setItem(WF_STORE_KEY, JSON.stringify(payload));
      router.push("/app/waterfall/analyze");
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Kon bestand niet verwerken.");
    } finally {
      setBusy(false);
      // reset input zodat je opnieuw kunt kiezen
      e.currentTarget.value = "";
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={onFileChange}
        disabled={busy}
        className="block w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border file:bg-gray-50 hover:file:bg-gray-100"
      />
      {busy && <div className="text-xs text-gray-500">Bezig met verwerken…</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}

      {/* Rapport */}
      {report && (
        <div className="rounded-lg border bg-white">
          <div className="px-3 py-2 border-b text-sm font-medium">Validatie-rapport</div>
          <div className="p-3 text-sm">
            {!!report.corrected && (
              <div className="text-amber-700 mb-2">
                Auto-correcties toegepast: <strong>{report.corrected}</strong> (bv. negatieve kortingen → positief, valuta/parsing).
              </div>
            )}
            {report.errors.length > 0 && (
              <div clas
