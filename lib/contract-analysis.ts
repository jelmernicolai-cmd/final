export type Row = {
  klant: string;
  sku: string;
  aantal_units: number;
  claimbedrag: number;
  omzet: number;
  periode: string; // "YYYY-MM"
};

export type ContractLevel = "klant" | "klant_sku";

export type AggRow = {
  contract: string;
  periode: string;
  omzet: number;
  claimbedrag: number;
  aantal_units: number;
  netto_omzet: number;
  // growth vs previous period within same contract
  pct_groei_omzet?: number | null;
  pct_groei_netto?: number | null;
  pct_groei_units?: number | null;
  // total growth for same period
  pct_groei_totaal_omzet?: number | null;
  pct_groei_totaal_netto?: number | null;
  pct_groei_totaal_units?: number | null;
  // out/under performance flags
  outperform_omzet?: boolean | null;
  outperform_netto?: boolean | null;
  outperform_units?: boolean | null;
  // contribution to total delta this month
  contrib_omzet?: number | null;
  contrib_netto?: number | null;
  contrib_units?: number | null;
};

export type TotalRow = {
  periode: string;
  totaal_omzet: number;
  totaal_netto: number;
  totaal_units: number;
  pct_groei_totaal_omzet?: number | null;
  pct_groei_totaal_netto?: number | null;
  pct_groei_totaal_units?: number | null;
};

export function yyyymmToKey(p: string): string {
  // normalize to YYYY-MM
  const [y, m] = p.split("-").map((x) => x.trim());
  return `${y}-${m.padStart(2, "0")}`;
}

function byPeriodeAsc(a: string, b: string) {
  return a.localeCompare(b);
}

export function buildContractId(r: Row, level: ContractLevel): string {
  return level === "klant_sku" ? `${r.klant} | ${r.sku}` : r.klant;
}

export function groupAndAggregate(input: Row[], level: ContractLevel): AggRow[] {
  const map = new Map<string, AggRow>();
  for (const r of input) {
    const periode = yyyymmToKey(r.periode);
    const contract = buildContractId(r, level);
    const key = `${contract}__${periode}`;
    const prev = map.get(key);
    const next: AggRow = prev ?? {
      contract,
      periode,
      omzet: 0,
      claimbedrag: 0,
      aantal_units: 0,
      netto_omzet: 0,
    };
    next.omzet += Number(r.omzet) || 0;
    next.claimbedrag += Number(r.claimbedrag) || 0;
    next.aantal_units += Number(r.aantal_units) || 0;
    next.netto_omzet = next.omzet - next.claimbedrag;
    map.set(key, next);
  }
  // sort per contract & periode
  return Array.from(map.values()).sort((a, b) =>
    a.contract === b.contract ? byPeriodeAsc(a.periode, b.periode) : a.contract.localeCompare(b.contract)
  );
}

export function computeTotals(agg: AggRow[]): TotalRow[] {
  const per = new Map<string, TotalRow>();
  for (const r of agg) {
    const prev = per.get(r.periode) ?? {
      periode: r.periode,
      totaal_omzet: 0,
      totaal_netto: 0,
      totaal_units: 0,
    };
    prev.totaal_omzet += r.omzet;
    prev.totaal_netto += r.netto_omzet;
    prev.totaal_units += r.aantal_units;
    per.set(r.periode, prev);
  }
  const rows = Array.from(per.values()).sort((a, b) => byPeriodeAsc(a.periode, b.periode));
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const cur = rows[i];
    cur.pct_groei_totaal_omzet = safePctChange(prev.totaal_omzet, cur.totaal_omzet);
    cur.pct_groei_totaal_netto = safePctChange(prev.totaal_netto, cur.totaal_netto);
    cur.pct_groei_totaal_units = safePctChange(prev.totaal_units, cur.totaal_units);
  }
  return rows;
}

function safePctChange(prev: number, cur: number): number | null {
  if (!isFinite(prev) || Math.abs(prev) < 1e-9) return null;
  return (cur - prev) / prev;
}

export function addContractGrowth(agg: AggRow[]): AggRow[] {
  let i = 0;
  while (i < agg.length) {
    const j = i;
    // advance to end of this contract block
    while (i < agg.length && agg[i].contract === agg[j].contract) i++;
    for (let k = j + 1; k < i; k++) {
      const prev = agg[k - 1];
      const cur = agg[k];
      cur.pct_groei_omzet = safePctChange(prev.omzet, cur.omzet);
      cur.pct_groei_netto = safePctChange(prev.netto_omzet, cur.netto_omzet);
      cur.pct_groei_units = safePctChange(prev.aantal_units, cur.aantal_units);
    }
  }
  return agg;
}

export function joinTotals(agg: AggRow[], totals: TotalRow[]): AggRow[] {
  const tIndex = new Map(totals.map((t) => [t.periode, t]));
  for (const r of agg) {
    const t = tIndex.get(r.periode);
    r.pct_groei_totaal_omzet = t?.pct_groei_totaal_omzet ?? null;
    r.pct_groei_totaal_netto = t?.pct_groei_totaal_netto ?? null;
    r.pct_groei_totaal_units = t?.pct_groei_totaal_units ?? null;

    r.outperform_omzet =
      r.pct_groei_omzet != null && t?.pct_groei_totaal_omzet != null
        ? r.pct_groei_omzet > (t?.pct_groei_totaal_omzet as number)
        : null;
    r.outperform_netto =
      r.pct_groei_netto != null && t?.pct_groei_totaal_netto != null
        ? r.pct_groei_netto > (t?.pct_groei_totaal_netto as number)
        : null;
    r.outperform_units =
      r.pct_groei_units != null && t?.pct_groei_totaal_units != null
        ? r.pct_groei_units > (t?.pct_groei_totaal_units as number)
        : null;
  }
  return agg;
}

export function addContributions(agg: AggRow[]): AggRow[] {
  // per contract deltas
  type Delta = { contract: string; periode: string; dOmzet: number; dNetto: number; dUnits: number };
  const deltas: Delta[] = [];
  // walk per contract block
  let i = 0;
  while (i < agg.length) {
    const j = i;
    while (i < agg.length && agg[i].contract === agg[j].contract) i++;
    for (let k = j; k < i; k++) {
      const prev = k > j ? agg[k - 1] : undefined;
      const cur = agg[k];
      deltas.push({
        contract: cur.contract,
        periode: cur.periode,
        dOmzet: prev ? cur.omzet - prev.omzet : 0,
        dNetto: prev ? cur.netto_omzet - prev.netto_omzet : 0,
        dUnits: prev ? cur.aantal_units - prev.aantal_units : 0,
      });
    }
  }
  // sum per periode
  const totals = new Map<string, { dOmzet: number; dNetto: number; dUnits: number }>();
  for (const d of deltas) {
    const prev = totals.get(d.periode) ?? { dOmzet: 0, dNetto: 0, dUnits: 0 };
    prev.dOmzet += d.dOmzet;
    prev.dNetto += d.dNetto;
    prev.dUnits += d.dUnits;
    totals.set(d.periode, prev);
  }
  // write contrib
  const idx = new Map<string, AggRow>();
  for (const r of agg) idx.set(`${r.contract}__${r.periode}`, r);
  for (const d of deltas) {
    const t = totals.get(d.periode)!;
    const r = idx.get(`${d.contract}__${d.periode}`)!;
    r.contrib_omzet = Math.abs(t.dOmzet) > 0 ? d.dOmzet / t.dOmzet : null;
    r.contrib_netto = Math.abs(t.dNetto) > 0 ? d.dNetto / t.dNetto : null;
    r.contrib_units = Math.abs(t.dUnits) > 0 ? d.dUnits / t.dUnits : null;
  }
  return agg;
}

export function latestSnapshot(agg: AggRow[]): AggRow[] {
  const periodes = Array.from(new Set(agg.map((r) => r.periode))).sort(byPeriodeAsc);
  const last = periodes[periodes.length - 1];
  return agg.filter((r) => r.periode === last);
}

/** End-to-end calculation */
export function analyze(rows: Row[], level: ContractLevel = "klant_sku") {
  const agg0 = groupAndAggregate(rows, level);
  const agg1 = addContractGrowth(agg0);
  const totals = computeTotals(agg1);
  const agg2 = joinTotals(agg1, totals);
  const agg3 = addContributions(agg2);
  const latest = latestSnapshot(agg3);
  return { agg: agg3, totals, latest };
}

/* ---------------- Mock dataset (demo) ---------------- */
export const demoData: Row[] = (() => {
  // eenvoudige, realistische demo (2 klanten x 2 skus x 8 maanden)
  const months = [
    "2025-01","2025-02","2025-03","2025-04","2025-05","2025-06","2025-07","2025-08"
  ];
  const records: Row[] = [];
  const customers = ["Alpha BV", "Beta NV"];
  const skus = ["SKU-100","SKU-200"];
  for (const klant of customers) {
    for (const sku of skus) {
      let baseUnits = klant === "Alpha BV" ? 400 : 280;
      let price = sku === "SKU-100" ? 14 : 20;
      let units = baseUnits;
      for (const p of months) {
        // simpele trend + ruis
        units = Math.max(1, Math.round(units * (1 + (Math.random()*0.06 - 0.01))));
        const omzet = +(units * price * (0.97 + Math.random()*0.06)).toFixed(2);
        const claim = +(omzet * (0.04 + Math.random()*0.05)).toFixed(2);
        records.push({ klant, sku, aantal_units: units, claimbedrag: claim, omzet, periode: p });
      }
    }
  }
  return records;
})();
