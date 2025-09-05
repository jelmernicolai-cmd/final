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
  "Sum of Volume Discounts","S
