// lib/waterfall-storage.ts
import { WF_STORE_KEY } from "@/components/waterfall/UploadAndParse";
import type { Row } from "./waterfall-types";

const LEGACY_KEYS = ["pharmagtn_wf_session", "pharmagtn_waterfall"];

type StoredShape = { rows?: Row[] } | Row[];

export function loadWaterfallRows(): Row[] {
  const keys = [WF_STORE_KEY, ...LEGACY_KEYS];

  for (const k of keys) {
    try {
      const raw =
        (typeof sessionStorage !== "undefined" && sessionStorage.getItem(k)) ||
        (typeof localStorage !== "undefined" && localStorage.getItem(k));

      if (!raw) continue;

      const parsed: StoredShape = JSON.parse(raw);
      const rows = Array.isArray(parsed) ? parsed : parsed?.rows;
      if (Array.isArray(rows) && rows.length) return rows;
    } catch {
      // overslaan en volgende key proberen
    }
  }
  return [];
}

export function eur0(n: number) {
  return (n || 0).toLocaleString("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

export function pct1(numerator: number, denominator: number) {
  const safeD = denominator || 0;
  const v = safeD ? (numerator / safeD) * 100 : 0;
  return v.toLocaleString("nl-NL", { maximumFractionDigits: 1 }) + "%";
}
