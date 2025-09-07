export type RawRow = Record<string, any>;

export type NormalizedRow = {
  period: string;   // "YYYY-MM"
  cust: string;     // Customer Name (Sold-to)
  pg: string;       // Product Group Name
  sku: string;      // SKU Name
  gross: number;    // Sum of Gross Sales
  d_channel: number;
  d_customer: number;
  d_product: number;
  d_volume: number;
  d_other_sales: number; // Value + Other Sales (samengevoegd)
  d_mandatory: number;
  d_local: number;
};

export const REQUIRED_HEADERS = [
  "Product Group Name",
  "SKU Name",
  "Customer Name (Sold-to)",
  "Fiscal year / period",
  "Sum of Gross Sales",
  "Sum of Channel Discounts",
  "Sum of Customer Discounts",
  "Sum of Product Discounts",
  "Sum of Volume Discounts",
  "Sum of Value Discounts",
  "Sum of Other Sales Discounts",
  "Sum of Mandatory Discounts",
  "Sum of Discount Local",
] as const;

type Req = (typeof REQUIRED_HEADERS)[number];

const ALIASES: Record<string, Req> = {
  "product group": "Product Group Name",
  "product group name": "Product Group Name",
  "pg": "Product Group Name",
  "sku": "SKU Name",
  "sku name": "SKU Name",
  "customer": "Customer Name (Sold-to)",
  "customer name": "Customer Name (Sold-to)",
  "sold-to": "Customer Name (Sold-to)",
  "sold to": "Customer Name (Sold-to)",
  "customer name (sold-to)": "Customer Name (Sold-to)",
  "fiscal year / period": "Fiscal year / period",
  "fiscal period": "Fiscal year / period",
  "period": "Fiscal year / period",
  "fy period": "Fiscal year / period",
  "fy/period": "Fiscal year / period",
  "sum of gross sales": "Sum of Gross Sales",
  "gross": "Sum of Gross Sales",
  "gross sales": "Sum of Gross Sales",
  "sum of channel discounts": "Sum of Channel Discounts",
  "channel discounts": "Sum of Channel Discounts",
  "sum of customer discounts": "Sum of Customer Discounts",
  "customer discounts": "Sum of Customer Discounts",
  "sum of product discounts": "Sum of Product Discounts",
  "product discounts": "Sum of Product Discounts",
  "sum of volume discounts": "Sum of Volume Discounts",
  "volume discounts": "Sum of Volume Discounts",
  "sum of value discounts": "Sum of Value Discounts",
  "value discounts": "Sum of Value Discounts",
  "sum of other sales discounts": "Sum of Other Sales Discounts",
  "other sales discounts": "Sum of Other Sales Discounts",
  "sum of mandatory discounts": "Sum of Mandatory Discounts",
  "mandatory discounts": "Sum of Mandatory Discounts",
  "sum of discount local": "Sum of Discount Local",
  "discount local": "Sum of Discount Local",
};

function normHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, " ").replace(/[_-]/g, " ");
}
export function resolveHeader(name: string): Req | null {
  const n = normHeader(name);
  const direct = (REQUIRED_HEADERS as readonly string[]).find((h) => normHeader(h) === n);
  if (direct) return direct as Req;
  return ALIASES[n] || null;
}
export function parseNumber(val: any): number {
  if (val == null) return 0;
  if (typeof val === "number" && isFinite(val)) return val;
  let s = String(val).trim();
  if (!s) return 0;
  s = s.replace(/[€$,]/g, "").replace(/\s/g, "");
  s = s.replace(/(\d)[,](\d)/, "$1.$2");
  const n = Number(s);
  return isFinite(n) ? n : 0;
}
// "2024-01", "202401", "2024/01", "2024-Q1", "2024 Q1", "2024" → "YYYY-MM"
export function normalizePeriod(input: any): string | null {
  if (!input && input !== 0) return null;
  let s = String(input).trim().toUpperCase();
  let m = s.match(/^(\d{4})[-\/](\d{1,2})$/);
  if (m) return `${m[1]}-${String(Number(m[2])).padStart(2, "0")}`;
  m = s.match(/^(\d{4})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}`;
  m = s.match(/^(\d{4})\s*Q([1-4])$/);
  if (m) {
    const q = Number(m[2]); const map: Record<number, string> = {1:"01",2:"04",3:"07",4:"10"};
    return `${m[1]}-${map[q]}`;
  }
  m = s.match(/^(\d{4})$/);
  if (m) return `${m[1]}-01`;
  return null;
}

export type ValidateReport = {
  ok: boolean;
  fixedHeaders: Record<string, string>;
  missing: string[];
  rows: number;
  issues: string[];
  preview: NormalizedRow[];
};

export function normalizeRows(inputRows: RawRow[]): ValidateReport {
  const issues: string[] = [];
  if (!inputRows.length) {
    return { ok: false, fixedHeaders: {}, missing: Array.from(REQUIRED_HEADERS), rows: 0, issues: ["Leeg bestand"], preview: [] };
  }
  const originalHeaders = Object.keys(inputRows[0] || {});
  const used: Record<string, string> = {};
  const headerMap: Partial<Record<Req, string>> = {};

  for (const oh of originalHeaders) {
    const resolved = resolveHeader(oh);
    if (resolved) { used[oh] = resolved; headerMap[resolved] = oh; }
  }
  const missing = REQUIRED_HEADERS.filter((h) => !headerMap[h]);
  const coreMissing = ["Product Group Name","SKU Name","Customer Name (Sold-to)","Fiscal year / period","Sum of Gross Sales"].filter((h)=>!headerMap[h]);

  const normalized: NormalizedRow[] = [];
  for (let i = 0; i < inputRows.length; i++) {
    const r = inputRows[i];
    function g(h: Req): any { const key = headerMap[h] as string; return key ? r[key] : ""; }

    const period = normalizePeriod(g("Fiscal year / period"));
    if (!period) {
      if (issues.length < 50) issues.push(`Rij ${i + 2}: ongeldige periode "${r[headerMap["Fiscal year / period"] || ""]}"`);
      continue;
    }

    const row: NormalizedRow = {
      period,
      cust: String(g("Customer Name (Sold-to)") ?? "").trim(),
      pg: String(g("Product Group Name") ?? "").trim(),
      sku: String(g("SKU Name") ?? "").trim(),
      gross: parseNumber(g("Sum of Gross Sales")),
      d_channel: parseNumber(g("Sum of Channel Discounts")),
      d_customer: parseNumber(g("Sum of Customer Discounts")),
      d_product: parseNumber(g("Sum of Product Discounts")),
      d_volume: parseNumber(g("Sum of Volume Discounts")),
      d_other_sales:
        parseNumber(g("Sum of Value Discounts")) +
        parseNumber(g("Sum of Other Sales Discounts")),
      d_mandatory: parseNumber(g("Sum of Mandatory Discounts")),
      d_local: parseNumber(g("Sum of Discount Local")),
    };

    normalized.push(row);
  }

  const ok = coreMissing.length === 0 && normalized.length > 0;
  return { ok, fixedHeaders: used, missing, rows: normalized.length, issues, preview: normalized.slice(0, 1000) };
}
