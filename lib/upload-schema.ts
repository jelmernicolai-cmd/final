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
 
