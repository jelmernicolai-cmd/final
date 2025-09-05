'use client';

type TipsProps = {
  gross: number;
  d_channel: number; d_customer: number; d_product: number; d_volume: number; d_value: number; d_other_sales: number; d_mandatory: number; d_local: number;
  invoiced: number;
  r_direct: number; r_prompt: number; r_indirect: number; r_mandatory: number; r_local: number;
  inc_royalty: number; inc_other: number;
  top3Cust: Array<{ name: string; gtn: number }>;
  top3Sku: Array<{ name: string; gtn: number }>;
};

function pct(n: number, d: number) { return d > 0 ? (100 * n / d) : 0; }
function eur(n: number) { return n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }); }

export default function ActionTips(p: TipsProps) {
  const totalDiscounts = p.d_channel + p.d_customer + p.d_product + p.d_volume + p.d_value + p.d_other_sales + p.d_mandatory + p.d_local;
  const totalRebates   = p.r_direct + p.r_prompt + p.r_indirect + p.r_mandatory + p.r_local;
  const gtnSpend       = totalDiscounts + totalRebates;

  const tips: string[] = [];

  // 1) Value Discounts domineren
  if (p.d_value > 0 && p.d_value >= 0.35 * totalDiscounts) {
    tips.push(`Waarde-kortingen zijn groot (${eur(p.d_value)} ≈ ${pct(p.d_value, totalDiscounts).toFixed(1)}% van alle discounts). 
Zet een **cap** en verplaats deel naar **performance-rebates** (tiered/retroactief) met duidelijke einddatum en approval.`);
  }

  // 2) Channel Discounts hoog
  if (p.d_channel > 0 && pct(p.d_channel, p.gross) >= 1.0) {
    tips.push(`Kanaalkortingen zijn ≥1% van Gross (${eur(p.d_channel)}). 
Heronderhandel **service fees** (OTIF, expiry, returns) en introduceer **marge-caps** en SLA-gebaseerde toeslagen i.p.v. generieke korting.`);
  }

  // 3) Direct rebates groot t.o.v. prompt/indirect
  if (p.r_direct > (p.r_prompt + p.r_indirect + p.r_mandatory + p.r_local)) {
    tips.push(`Direct rebates domineren (${eur(p.r_direct)}). 
Vervang een deel door **tiered growth rebates** op netto groei/mix; borg **claim-eisen** (data, bewijs) om lekken te beperken.`);
  }

  // 4) Prompt payment check
  if (p.r_prompt > 0 && pct(p.r_prompt, p.gross) > 0.5) {
    tips.push(`Prompt-payment >0,5% van Gross (${eur(p.r_prompt)}). 
Zet **plafond** en koppel aan **automatische betaling/SEPA** en een **DSO-target**; anders tarief verlagen.`);
  }

  // 5) Customer concentratie
  const gtnByTop3Cust = p.top3Cust.reduce((a, b) => a + b.gtn, 0);
  if (gtnByTop3Cust >= 0.5 * gtnSpend && gtnSpend > 0) {
    tips.push(`Top-3 klanten zijn >50% van GtN spend (${eur(gtnByTop3Cust)}). 
Voer **account-specifieke net-price corridors**, vervang off-invoice door **contractuele rebates** met KPI’s en **audits**.`);
  }

  // 6) SKU’s met hoge GtN%
  if (p.top3Sku.length) {
    tips.push(`Herzie SKU’s met hoogste GtN (Top-3): **${p.top3Sku.map(x => x.name).join(', ')}**. 
Overweeg **pack-architectuur**, **minimale net-floors** en rationalisatie van low-margin varianten.`);
  }

  // 7) Leakage / governance: als discounts+rebates > 10% van gross
  if (pct(gtnSpend, p.gross) > 10) {
    tips.push(`GtN spend is >10% van Gross (${eur(gtnSpend)}). 
Introduceer **oorzaakcodes** per korting, **goedkeuringsflow** boven drempels en maandelijkse **accruals vs. claims**-matching (<5% foutmarge).`);
  }

  // 8) Incomes laag (royalty/other)
  if (p.inc_royalty + p.inc_other < 0.1 * totalRebates && totalRebates > 0) {
    tips.push(`Bijna geen inkomsten tegenover rebates. 
Onderzoek **service fees/educational grants/licenties** die aan afzet of projecten gekoppeld kunnen worden (contractueel borging).`);
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="font-medium mb-2">Aanbevolen acties om marge te optimaliseren</div>
      {tips.length ? (
        <ul className="space-y-2 text-sm text-gray-800">
          {tips.map((t, i) => (
            <li key={i} className="rounded-lg border px-3 py-2 leading-relaxed">{t}</li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-gray-500">Geen opvallende kansen bij de huidige selectie. Verfijn filters voor specifieke inzichten.</div>
      )}
      <div className="mt-3 text-xs text-gray-500">
        Tip: Leg wijzigingen vast in je **deal-kalender** met einddata, KPIs en audit-rechten om **lekkage** te voorkomen.
      </div>
    </div>
  );
}
