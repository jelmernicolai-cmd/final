"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// LocalStorage sleutel
export const WF_STORE_KEY = "pharmagtn_waterfall_v1";

export default function UploadAndParse() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const { default: XLSX } = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null });

      const normKey = (k: string) => k.trim().replace(/\s+/g, " ").replace(/\u00A0/g, " ");

      // Vereiste kolommen exact zoals aangeleverd
      const required = [
        "Product Group Name", "SKU Name", "Customer Name (Sold-to)", "Fiscal year / period",
        "Sum of Gross Sales",
        "Sum of Channel Discounts", "Sum of Customer Discounts", "Sum of Product Discounts",
        "Sum of Volume Discounts", "Sum of Value Discounts", "Sum of Other Sales Discounts",
        "Sum of Mandatory Discounts", "Sum of Discount Local",
        "Sum of Invoiced Sales",
        "Sum of Direct Rebates", "Sum of Prompt Payment Rebates", "Sum of Indirect Rebates",
        "Sum of Mandatory Rebates", "Sum of Rebate Local",
        "Sum of Royalty Income", "Sum of Other Income",
        "Sum of Net Sales",
      ];

      // Normaliseer kolomnamen
      const first = raw[0] || {};
      const map: Record<string,string> = {};
      Object.keys(first).forEach((k) => { map[normKey(k)] = k; });

      const missing = required.filter((rk) => !(rk in map));
      if (missing.length) {
        throw new Error(`Ontbrekende kolommen: ${missing.join(", ")}`);
      }

      const toNum = (v: any) => {
        if (v === null || v === undefined || v === "") return 0;
        if (typeof v === "number") return v;
        const s = String(v).replace(/[\s€$,]/g, "").replace(",", ".");
        const n = Number(s);
        return isFinite(n) ? n : 0;
      };

      const rows = raw.map((r) => ({
        pg: String(r[map["Product Group Name"]] ?? ""),
        sku: String(r[map["SKU Name"]] ?? ""),
        cust: String(r[map["Customer Name (Sold-to)"]] ?? ""),
        period: String(r[map["Fiscal year / period"]] ?? ""),
        gross: toNum(r[map["Sum of Gross Sales"]]),
        d_channel: toNum(r[map["Sum of Channel Discounts"]]),
        d_customer: toNum(r[map["Sum of Customer Discounts"]]),
        d_product: toNum(r[map["Sum of Product Discounts"]]),
        d_volume: toNum(r[map["Sum of Volume Discounts"]]),
        d_value: toNum(r[map["Sum of Value Discounts"]]),
        d_other_sales: toNum(r[map["Sum of Other Sales Discounts"]]),
        d_mandatory: toNum(r[map["Sum of Mandatory Discounts"]]),
        d_local: toNum(r[map["Sum of Discount Local"]]),
        invoiced: toNum(r[map["Sum of Invoiced Sales"]]),
        r_direct: toNum(r[map["Sum of Direct Rebates"]]),
        r_prompt: toNum(r[map["Sum of Prompt Payment Rebates"]]),
        r_indirect: toNum(r[map["Sum of Indirect Rebates"]]),
        r_mandatory: toNum(r[map["Sum of Mandatory Rebates"]]),
        r_local: toNum(r[map["Sum of Rebate Local"]]),
        inc_royalty: toNum(r[map["Sum of Royalty Income"]]),
        inc_other: toNum(r[map["Sum of Other Income"]]),
        net: toNum(r[map["Sum of Net Sales"]]),
      }));

      const payload = {
        meta: { uploadedAt: Date.now(), sheet: sheetName, rows: rows.length },
        rows,
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
    <div className="mt-3">
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={onFileChange}
        disabled={busy}
        className="block w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border file:bg-gray-50 hover:file:bg-gray-100"
      />
      {busy && <div className="text-xs text-gray-500 mt-2">Bezig met verwerken…</div>}
      {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
    </div>
  );
}
