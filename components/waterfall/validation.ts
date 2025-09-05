// components/waterfall/validation.ts

export type CleanRow = {
  pg: string; sku: string; cust: string; period: string;
  gross: number;
  d_channel: number; d_customer: number; d_product: number; d_volume: number; d_value: number; d_other_sales: number; d_mandatory: number; d_local: number;
  invoiced: number;
  r_direct: number; r_prompt: number; r_indirect: number; r_mandatory: number; r_local: number;
  inc_royalty: number; inc_other: number;
  net: number;
};

export type ValidationResult = {
  rows: CleanRow[];
  warnings: string[];
  errors: string[];
  correctedCount: number;
};

const REQD = [
  "Product Group Name","SKU Name","Customer Name (Sold-to)","Fiscal year / period",
  "Sum of Gross Sales",
  "Sum of Channel Discounts","Sum of Customer Discounts","Sum of Product Discounts",
  "Sum of Volume Discounts","Sum of Value Discounts","Sum of Other Sales Discounts",
  "Sum of Mandatory Discounts","Sum of Discount Local",
  "Sum of Invoiced Sales",
  "Sum of Direct Rebates","Sum of Prompt Payment Rebates","Sum of Indirect Rebates",
  "Sum of Mandatory Rebates","Sum of Rebate Local",
  "Sum of Royalty Income","Sum of Other Income",
  "Sum of Net Sales",
];

const CANON = (s: string) => s.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");

// simpele aliassen (optioneel uitbreiden)
const ALIAS: Record<string,string[]> = {
  "sumofgrosssales": ["grosssales","gross","sumgross"],
  "sumofinvoicedsales": ["invoicedsales","invoiced"],
  "sumofnetsales": ["netsales","net"],
  "customernamesoldto": ["customer","customername","soldto"],
  "fiscalyearperiod": ["period","fiscalperiod","fyperiod","fy/period","fyperiodyy-mm","yyyy-mm"],
};

const NUM_FIELDS = [
  "Sum of Gross Sales",
  "Sum of Channel Discounts","Sum of Customer Discounts","Sum of Product Discounts",
  "Sum of Volume Discounts","Sum of Value Discounts","Sum of Other Sales Discounts",
  "Sum of Mandatory Discounts","Sum of Discount Local",
  "Sum of Invoiced Sales",
  "Sum of Direct Rebates","Sum of Prompt Payment Rebates","Sum of Indirect Rebates",
  "Sum of Mandatory Rebates","Sum of Rebate Local",
  "Sum of Royalty Income","Sum of Other Income",
  "Sum of Net Sales",
].map(CANON);

const DISCOUNT_FIELDS = [
  "Sum of Channel Discounts","Sum of Customer Discounts","Sum of Product Discounts",
  "Sum of Volume Discounts","Sum of Value Discounts","Sum of Other Sales Discounts",
  "Sum of Mandatory Discounts","Sum of Discount Local",
].map(CANON);

const REBATE_FIELDS = [
  "Sum of Direct Rebates","Sum of Prompt Payment Rebates","Sum of Indirect Rebates",
  "Sum of Mandatory Rebates","Sum of Rebate Local",
].map(CANON);

const INCOME_FIELDS = [
  "Sum of Royalty Income","Sum of Other Income",
].map(CANON);

function parseNumber(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  // verwijder currency/duizend-separators; vervang komma door punt
  const s = String(v).replace(/\s+/g,"").replace(/[€$,]/g,"").replace(/\./g,"").replace(/,/g,".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function approxEq(a: number, b: number, tolPct = 0.015, tolAbs = 5): boolean {
  const diff = Math.abs(a - b);
  if (diff <= tolAbs) return true;
  const base = Math.max(1, Math.max(Math.abs(a), Math.abs(b)));
  return diff / base <= tolPct;
}

function tryMatchHeader(
  presentHeaders: string[],
): Record<string,string> {
  // map: canonical -> actual header
  const presentCanon = presentHeaders.reduce<Record<string,string>>((m, h) => {
    m[CANON(h)] = h; return m;
  }, {});
  const map: Record<string,string> = {};

  for (const req of REQD) {
    const c = CANON(req);
    if (presentCanon[c]) { map[req] = presentCanon[c]; continue; }
    // probeer aliassen
    const al = ALIAS[c] || [];
    const hit = al.find(a => presentCanon[a]);
    if (hit) { map[req] = presentCanon[hit]; continue; }
    // fuzzy: neem eerste present header die de core woorden bevat
    const words = req.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const fuzzy = presentHeaders.find(h => {
      const lc = h.toLowerCase();
      return words.every(w => lc.includes(w));
    });
    if (fuzzy) { map[req] = fuzzy; continue; }
  }
  return map;
}

export function validateAndNormalize(rawRows: Record<string, any>[]): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  let corrected = 0;

  if (!rawRows.length) {
    return { rows: [], warnings, errors: ["Geen rijen gevonden in het Excel-tabblad."], correctedCount: 0 };
  }

  const headers = Object.keys(rawRows[0] || {});
  const map = tryMatchHeader(headers);

  // ontbrekende kolommen
  const missing = REQD.filter(r => !(r in map));
  if (missing.length) {
    errors.push(`Ontbrekende kolommen: ${missing.join(", ")}`);
    return { rows: [], warnings, errors, correctedCount: corrected };
  }

  const rows: CleanRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];

    const get = (label: string) => r[map[label]];
    // strings
    const pg = String(get("Product Group Name") ?? "").trim();
    const sku = String(get("SKU Name") ?? "").trim();
    const cust = String(get("Customer Name (Sold-to)") ?? "").trim();
    let period = String(get("Fiscal year / period") ?? "").trim();

    // normaliseer period naar YYYY-MM (haal rare chars weg)
    period = period.replace(/[^\d\-\/]/g, "");
    const m = period.match(/(\d{4})[-\/](\d{1,2})/);
    if (m) {
      const y = m[1];
      const mm = ("0" + Number(m[2])).slice(-2);
      period = `${y}-${mm}`;
    } else {
      warnings.push(`Rij ${i + 2}: onherkenbare "Fiscal year / period" waarde "${period}". Gelaten zoals aangeleverd.`);
    }

    // numbers
    const obj: Record<string, number> = {};
    for (const k of NUM_FIELDS) {
      const orig = get(Object.keys(map).find(req => CANON(req) === k)!);
      obj[k] = parseNumber(orig);
    }

    // corrigeer negatieve kortingen -> naar positief
    for (const k of DISCOUNT_FIELDS) {
      if (obj[k] < 0) { obj[k] = Math.abs(obj[k]); corrected++; warnings.push(`Rij ${i + 2}: negatieve korting omgezet naar positief (${k}).`); }
    }
    // rebates ook positief (als negatief aangeleverd, omzetten)
    for (const k of REBATE_FIELDS) {
      if (obj[k] < 0) { obj[k] = Math.abs(obj[k]); corrected++; warnings.push(`Rij ${i + 2}: negatieve rebate omgezet naar positief (${k}).`); }
    }
    // incomes mogen negatief voorkomen; laat staan maar waarschuw
    for (const k of INCOME_FIELDS) {
      if (obj[k] < 0) { warnings.push(`Rij ${i + 2}: negatieve income gedetecteerd (${k}).`); }
    }

    // invarianten check
    const totalDiscounts = DISCOUNT_FIELDS.reduce((a,k)=>a+obj[k],0);
    const totalRebates = REBATE_FIELDS.reduce((a,k)=>a+obj[k],0);
    const totalIncome = INCOME_FIELDS.reduce((a,k)=>a+obj[k],0);

    const gross = obj[CANON("Sum of Gross Sales")];
    const invoiced = obj[CANON("Sum of Invoiced Sales")];
    const net = obj[CANON("Sum of Net Sales")];

    const expInvoiced = gross - totalDiscounts;
    if (!approxEq(invoiced, expInvoiced)) {
      warnings.push(`Rij ${i + 2}: Invoiced (=${invoiced.toFixed(0)}) wijkt af van Gross − Discounts (=${expInvoiced.toFixed(0)}).`);
    }

    const expNet = invoiced - totalRebates + totalIncome;
    if (!approxEq(net, expNet)) {
      warnings.push(`Rij ${i + 2}: Net (=${net.toFixed(0)}) wijkt af van Invoiced − Rebates + Income (=${expNet.toFixed(0)}).`);
    }

    // bouw clean row
    rows.push({
      pg, sku, cust, period,
      gross,
      d_channel: obj[CANON("Sum of Channel Discounts")],
      d_customer: obj[CANON("Sum of Customer Discounts")],
      d_product: obj[CANON("Sum of Product Discounts")],
      d_volume: obj[CANON("Sum of Volume Discounts")],
      d_value: obj[CANON("Sum of Value Discounts")],
      d_other_sales: obj[CANON("Sum of Other Sales Discounts")],
      d_mandatory: obj[CANON("Sum of Mandatory Discounts")],
      d_local: obj[CANON("Sum of Discount Local")],
      invoiced,
      r_direct: obj[CANON("Sum of Direct Rebates")],
      r_prompt: obj[CANON("Sum of Prompt Payment Rebates")],
      r_indirect: obj[CANON("Sum of Indirect Rebates")],
      r_mandatory: obj[CANON("Sum of Mandatory Rebates")],
      r_local: obj[CANON("Sum of Rebate Local")],
      inc_royalty: obj[CANON("Sum of Royalty Income")],
      inc_other: obj[CANON("Sum of Other Income")],
      net,
    });
  }

  return { rows, warnings, errors, correctedCount: corrected };
}
