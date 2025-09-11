// lib/contract-analysis.ts
export type Row = { klant:string; sku:string; aantal_units:number; claimbedrag:number; omzet:number; periode:string; };
export type ContractLevel = "klant" | "klant_sku";
export type AggRow = {
  contract:string; periode:string; omzet:number; claimbedrag:number; aantal_units:number; netto_omzet:number;
  pct_groei_omzet?:number|null; pct_groei_netto?:number|null; pct_groei_units?:number|null;
  pct_groei_totaal_omzet?:number|null; pct_groei_totaal_netto?:number|null; pct_groei_totaal_units?:number|null;
  outperform_omzet?:boolean|null; outperform_netto?:boolean|null; outperform_units?:boolean|null;
  contrib_omzet?:number|null; contrib_netto?:number|null; contrib_units?:number|null;
};
export type TotalRow = {
  periode:string; totaal_omzet:number; totaal_netto:number; totaal_units:number;
  pct_groei_totaal_omzet?:number|null; pct_groei_totaal_netto?:number|null; pct_groei_totaal_units?:number|null;
};
const byPeriodeAsc = (a:string,b:string)=> a.localeCompare(b);
const safePct = (p:number,c:number)=> !isFinite(p)||Math.abs(p)<1e-9 ? null : (c-p)/p;
const yyyymm = (p:string)=>{ const [y,m]=p.split("-").map(s=>s.trim()); return `${y}-${m.padStart(2,"0")}`; };
const id = (r:Row, lvl:ContractLevel)=> lvl==="klant_sku" ? `${r.klant} | ${r.sku}` : r.klant;

export function groupAndAggregate(input:Row[], lvl:ContractLevel):AggRow[] {
  const map = new Map<string,AggRow>();
  for (const r of input){
    const periode = yyyymm(r.periode), contract = id(r,lvl), key = `${contract}__${periode}`;
    const prev = map.get(key) ?? { contract, periode, omzet:0, claimbedrag:0, aantal_units:0, netto_omzet:0 };
    prev.omzet += Number(r.omzet)||0;
    prev.claimbedrag += Number(r.claimbedrag)||0;
    prev.aantal_units += Number(r.aantal_units)||0;
    prev.netto_omzet = prev.omzet - prev.claimbedrag;
    map.set(key, prev);
  }
  return [...map.values()].sort((a,b)=> a.contract===b.contract ? byPeriodeAsc(a.periode,b.periode) : a.contract.localeCompare(b.contract));
}
export function computeTotals(agg:AggRow[]):TotalRow[] {
  const per = new Map<string,TotalRow>();
  for (const r of agg){
    const t = per.get(r.periode) ?? { periode:r.periode, totaal_omzet:0, totaal_netto:0, totaal_units:0 };
    t.totaal_omzet += r.omzet; t.totaal_netto += r.netto_omzet; t.totaal_units += r.aantal_units; per.set(r.periode,t);
  }
  const rows = [...per.values()].sort((a,b)=>byPeriodeAsc(a.periode,b.periode));
  for (let i=1;i<rows.length;i++){ const p=rows[i-1], c=rows[i];
    c.pct_groei_totaal_omzet = safePct(p.totaal_omzet,c.totaal_omzet);
    c.pct_groei_totaal_netto = safePct(p.totaal_netto,c.totaal_netto);
    c.pct_groei_totaal_units = safePct(p.totaal_units,c.totaal_units);
  }
  return rows;
}
export function addContractGrowth(agg:AggRow[]):AggRow[] {
  let i=0; while(i<agg.length){ const j=i; while(i<agg.length && agg[i].contract===agg[j].contract) i++;
    for(let k=j+1;k<i;k++){ const p=agg[k-1], c=agg[k];
      c.pct_groei_omzet = safePct(p.omzet,c.omzet);
      c.pct_groei_netto = safePct(p.netto_omzet,c.netto_omzet);
      c.pct_groei_units = safePct(p.aantal_units,c.aantal_units);
    }
  } return agg;
}
export function joinTotals(agg:AggRow[], totals:TotalRow[]):AggRow[] {
  const idx = new Map(totals.map(t=>[t.periode,t]));
  for (const r of agg){ const t=idx.get(r.periode);
    r.pct_groei_totaal_omzet = t?.pct_groei_totaal_omzet ?? null;
    r.pct_groei_totaal_netto = t?.pct_groei_totaal_netto ?? null;
    r.pct_groei_totaal_units = t?.pct_groei_totaal_units ?? null;
    r.outperform_omzet = r.pct_groei_omzet!=null && t?.pct_groei_totaal_omzet!=null ? r.pct_groei_omzet > (t.pct_groei_totaal_omzet as number) : null;
    r.outperform_netto = r.pct_groei_netto!=null && t?.pct_groei_totaal_netto!=null ? r.pct_groei_netto > (t.pct_groei_totaal_netto as number) : null;
    r.outperform_units = r.pct_groei_units!=null && t?.pct_groei_totaal_units!=null ? r.pct_groei_units > (t.pct_groei_totaal_units as number) : null;
  } return agg;
}
export function addContributions(agg:AggRow[]):AggRow[] {
  type D={contract:string; periode:string; dOmzet:number; dNetto:number; dUnits:number};
  const deltas:D[]=[]; let i=0; while(i<agg.length){ const j=i; while(i<agg.length && agg[i].contract===agg[j].contract) i++;
    for (let k=j;k<i;k++){ const p=k>j?agg[k-1]:undefined, c=agg[k];
      deltas.push({ contract:c.contract, periode:c.periode,
        dOmzet:p?c.omzet-p.omzet:0, dNetto:p?c.netto_omzet-p.netto_omzet:0, dUnits:p?c.aantal_units-p.aantal_units:0 });
    }
  }
  const sum = new Map<string,{dOmzet:number;dNetto:number;dUnits:number}>();
  for (const d of deltas){ const t=sum.get(d.periode) ?? {dOmzet:0,dNetto:0,dUnits:0}; t.dOmzet+=d.dOmzet; t.dNetto+=d.dNetto; t.dUnits+=d.dUnits; sum.set(d.periode,t); }
  const ref = new Map<string,AggRow>(); for (const r of agg) ref.set(`${r.contract}__${r.periode}`, r);
  for (const d of deltas){ const t=sum.get(d.periode)!; const r=ref.get(`${d.contract}__${d.periode}`)!;
    r.contrib_omzet = Math.abs(t.dOmzet)>0 ? d.dOmzet/t.dOmzet : null;
    r.contrib_netto = Math.abs(t.dNetto)>0 ? d.dNetto/t.dNetto : null;
    r.contrib_units = Math.abs(t.dUnits)>0 ? d.dUnits/t.dUnits : null;
  } return agg;
}
export function latestSnapshot(agg:AggRow[]):AggRow[] {
  const ps=[...new Set(agg.map(r=>r.periode))].sort(byPeriodeAsc); const last=ps[ps.length-1];
  return agg.filter(r=>r.periode===last);
}
export function analyze(rows:Row[], level:ContractLevel="klant_sku"){
  const a0=groupAndAggregate(rows,level), a1=addContractGrowth(a0), totals=computeTotals(a1);
  const a2=joinTotals(a1,totals), a3=addContributions(a2), last=latestSnapshot(a3);
  return { agg:a3, totals, latest:last };
}
