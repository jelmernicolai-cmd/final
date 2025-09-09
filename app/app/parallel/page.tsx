"use client";

import { useMemo, useState } from "react";

/** ========================= Helpers ========================= */
const eur = (n: number, d = 0) =>
  new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: d,
  }).format(Number.isFinite(n) ? n : 0);

const pctS = (p: number, d = 1) =>
  `${((Number.isFinite(p) ? p : 0) * 100).toFixed(d)}%`;

const compact = (n: number) =>
  new Intl.NumberFormat("nl-NL", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(n) ? n : 0);

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const round = (n: number, d = 1) =>
  Math.round((Number.isFinite(n) ? n : 0) * 10 ** d) / 10 ** d;

/** ========================= Model =========================
 * Minimalistisch maar realistisch voor NL parallelimport:
 * - NL effectief = List × (1 − front) × (1 − bonus)
 * - Gap = NL effectief − EU landed
 * - PI-share (model) groeit bij gap &gt; drempel richting cap (met ramp)
 * - Handmatige modus voor eigen PI-inschatting
 */

type Inputs = {
  listNL: number; // €/unit NL list
  front: number; // 0..1
  bonus: number; // 0..1
  euLanded: number; // €/unit referentie PI (landed)
  units: number; // units/maand NL

  manualPI: boolean; // override model
  manualPIShare: number; // 0..1 eindniveau
  manualPIRamp: number; // ramp in maanden
};

type Settings = {
  threshold: number; // €/unit: vanaf hier loont PI
  slope: number; // gevoeligheid PI-share per €/gap
  cap: number; // max PI-share
  rampMonths: number; // ramp-in modelmodus
  horizon: number; // maanden
  cogs: number; // COGS% op originator net
};

type Point = {
  t: number;
  netOriginator: number;
  netEffective: number;
  gap: number;
  sharePI: number;
  netSalesPI: number;
  netSalesOriginator: number;
  ebitdaOriginator: number;
};

type KPIs = {
  orgNetY1: number;
  orgNetTotal: number;
  piNetY1: number;
  piNetTotal: number;
  endSharePI: number;
  endGap: number;
  endNetEffective: number;
  bonusDeltaPpToClose: number; // benodigde extra bonus in percentagepunten
};

const DEFAULT_INPUTS: Inputs = {
  listNL: 100,
  front: 0.18,
  bonus: 0.06,
  euLanded: 65,
  units: 9000,
  manualPI: false,
  manualPIShare: 0.15,
  manualPIRamp: 2,
};

const DEFAULT_SETTINGS: Settings = {
  threshold: 2, // € gap die nog "veilig" is
  slope: 0.06, // 6% PI-share per € extra gap boven drempel (tot cap)
  cap: 0.35,
  rampMonths: 3,
  horizon: 24,
  cogs: 0.20,
};

/** ========================= Simulatie ========================= */
function simulate(inp: Inputs, cfg: Settings) {
  const pts: Point[] = [];
  const netOriginator0 = inp.listNL * (1 - inp.front); // list/front constant

  for (let t = 0; t < cfg.horizon; t++) {
    const netOriginator = netOriginator0;
    const netEffective = netOriginator * (1 - inp.bonus);
    const gap = netEffective - inp.euLanded;

    let sharePI = 0;
    if (inp.manualPI) {
      const target = clamp(inp.manualPIShare, 0, cfg.cap);
      const ramp = Math.min(1, inp.manualPIRamp > 0 ? t / inp.manualPIRamp : 1);
      sharePI = clamp(target * ramp, 0, cfg.cap);
    } else {
      if (gap > cfg.threshold) {
        const base = (gap - cfg.threshold) * cfg.slope;
        const ramp = Math.min(1, cfg.rampMonths > 0 ? t / cfg.rampMonths : 1);
        sharePI = clamp(base * ramp, 0, cfg.cap);
      }
    }

    const shareOriginator = 1 - sharePI;
    const netSalesPI = inp.units * sharePI * inp.euLanded;
    const netSalesOriginator = inp.units * shareOriginator * netOriginator;
    const ebitdaOriginator = netSalesOriginator * (1 - cfg.cogs);

    pts.push({
      t,
      netOriginator,
      netEffective,
      gap,
      sharePI,
      netSalesPI,
      netSalesOriginator,
      ebitdaOriginator,
    });
  }

  const y1 = pts.slice(0, Math.min(12, pts.length));
  const sum = (f: (p: Point) => number) => pts.reduce((a, p) => a + f(p), 0);
  const end = pts.at(-1)!;

  // benodigd bonusniveau om gap ≤ threshold te maken (zonder list te wijzigen)
  const neededEffective = inp.euLanded + cfg.threshold;
  const bonusNeeded = 1 - neededEffective / (netOriginator0 || 1);
  const bonusDelta = Math.max(0, bonusNeeded - inp.bonus);

  const kpis: KPIs = {
    orgNetY1: y1.reduce((a, p) => a + p.netSalesOriginator, 0),
    orgNetTotal: sum((p) => p.netSalesOriginator),
    piNetY1: y1.reduce((a, p) => a + p.netSalesPI, 0),
    piNetTotal: sum((p) => p.netSalesPI),
    endSharePI: end.sharePI,
    endGap: end.gap,
    endNetEffective: end.netEffective,
    bonusDeltaPpToClose: bonusDelta * 100,
  };

  return { points: pts, kpis, netOriginator0 };
}

/** ========================= UI bouwstenen ========================= */
function FieldNumber({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <label className="text-sm w-full">
      <div className="font-medium">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full rounded-lg border px-3 py-2"
        />
        {suffix ? <span className="text-gray-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

function FieldPct({
  label,
  value,
  onChange,
  max = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <label className="text-sm w-full">
      <div className="font-medium">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={max}
          step={0.005}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-36 sm:w-44"
        />
        <input
          type="number"
          step={0.01}
          min={0}
          max={max}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-24 rounded-lg border px-3 py-2"
        />
        <span className="text-gray-500">{pctS(value)}</span>
      </div>
    </label>
  );
}

function Kpi({
  title,
  value,
  help,
  tone = "default",
}: {
  title: string;
  value: string;
  help?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneC =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50"
      : tone === "bad"
      ? "border-rose-200 bg-rose-50"
      : "border-gray-200 bg-white";

  return (
    <div className={`rounded-2xl border ${toneC} p-3 sm:p-4`}>
      <div className="text-[12px] text-gray-600">{title}</div>
      <div className="text-lg sm:text-xl font-semibold mt-1">{value}</div>
      {help ? (
        <div className="text-[11px] sm:text-xs text-gray-600 mt-1">{help}</div>
      ) : null}
    </div>
  );
}

/** ========================= Simpele SVG lijnen ========================= */
function LineChart({
  name,
  color = "#0ea5e9",
  values,
  yFmt = (v: number) => v.toFixed(0),
  height = 220,
}: {
  name: string;
  color?: string;
  values: number[];
  yFmt?: (v: number) => string;
  height?: number;
}) {
  const w = 960,
    h = height,
    padX = 46,
    padY = 28;
  const n = values.length || 1;
  const maxY = Math.max(1, ...values);
  const minY = 0;
  const x = (i: number) =>
    padX + (i / Math.max(1, n - 1)) * (w - 2 * padX);
  const y = (v: number) =>
    h - padY - ((v - minY) / (maxY - minY)) * (h - 2 * padY);
  const ticks = Array.from({ length: 5 }, (_, i) => (maxY / 4) * i);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");

  return (
    <svg
      className="w-full h-auto"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={name}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect
        x={12}
        y={12}
        width={w - 24}
        height={h - 24}
        rx={16}
        fill="#fff"
        stroke="#e5e7eb"
      />
      {ticks.map((tv, i) => (
        <g key={i}>
          <line
            x1={padX}
            y1={y(tv)}
            x2={w - padX}
            y2={y(tv)}
            stroke="#f3f4f6"
          />
          <text
            x={padX - 8}
            y={y(tv) + 4}
            fontSize="10"
            textAnchor="end"
            fill="#6b7280"
          >
            {yFmt(tv)}
          </text>
        </g>
      ))}
      <path d={d} fill="none" stroke={color} strokeWidth={2} />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={2} fill={color} />
      ))}
      <text
        x={w - padX}
        y={y(values.at(-1) || 0) - 6}
        fontSize="10"
        textAnchor="end"
        fill={color}
      >
        {name}
      </text>
    </svg>
  );
}

/** ========================= Pagina ========================= */
export default function ParallelPIPlanner() {
  const [inp, setInp] = useState<Inputs>({ ...DEFAULT_INPUTS });
  const [showCompare, setShowCompare] = useState(true);

  // Huidig beleid
  const simA = useMemo(() => simulate(inp, DEFAULT_SETTINGS), [inp]);

  // Voorstel B: alleen bonus ophogen om gap ≤ threshold te krijgen
  const proposedBonus = clamp(
    inp.bonus + simA.kpis.bonusDeltaPpToClose / 100,
    0,
    0.5
  );
  const inpB: Inputs = useMemo(
    () => ({ ...inp, bonus: proposedBonus }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inp, simA.kpis.bonusDeltaPpToClose]
  );
  const simB = useMemo(() => simulate(inpB, DEFAULT_SETTINGS), [inpB]);

  // Delta’s B - A
  const deltas = {
    piShareEnd: simB.kpis.endSharePI - simA.kpis.endSharePI,
    gapEnd: simB.kpis.endGap - simA.kpis.endGap,
    orgY1: simB.kpis.orgNetY1 - simA.kpis.orgNetY1,
    piY1: simB.kpis.piNetY1 - simA.kpis.piNetY1,
    bonusDeltaPp: (inpB.bonus - inp.bonus) * 100,
  };

  /** ====== Antwoorden op vragen die een NL farma-professional stelt ======
   * 1) Hoe groot is de prijs-gap nu en wat betekent dat voor PI?
   * 2) Hoeveel omzet verlies ik hierdoor in Jaar 1?
   * 3) Wat is de snelste ingreep zonder IRP-risico (list blijft gelijk)?
   * 4) Wat levert die ingreep op en wat kost het?
   * 5) Wanneer is monitoren genoeg i.p.v. ingrijpen?
   */
  const answers = {
    gapRisk:
      simA.kpis.endGap > DEFAULT_SETTINGS.threshold
        ? "hoog"
        : simA.kpis.endGap > 0
        ? "beheersbaar"
        : "laag",
    quickFixPp: round(simA.kpis.bonusDeltaPpToClose, 1),
    quickFixNewBonus: pctS(inp.bonus + simA.kpis.bonusDeltaPpToClose / 100, 1),
    y1Loss: eur(simA.kpis.piNetY1, 0),
    piEnd: pctS(simA.kpis.endSharePI, 1),
  };

  /** ========================= Invoerblokken ========================= */
  function BlockInputs() {
    return (
      <section className="rounded-2xl border bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-base font-semibold">Parameters</h2>
          <label className="text-sm inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={showCompare}
              onChange={(e) => setShowCompare(e.target.checked)}
            />
            <span>Vergelijk voorstel (A vs B)</span>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FieldNumber
            label="List price NL (€/unit)"
            value={inp.listNL}
            min={0}
            step={0.5}
            onChange={(v) =>
              setInp((s) => ({ ...s, listNL: Math.max(0, v) }))
            }
          />
          <FieldPct
            label="Front-end %"
            value={inp.front}
            onChange={(v) => setInp((s) => ({ ...s, front: clamp(v, 0, 0.8) }))}
          />
          <FieldPct
            label="Bonus op realisatie %"
            value={inp.bonus}
            onChange={(v) => setInp((s) => ({ ...s, bonus: clamp(v, 0, 0.5) }))}
          />
          <FieldNumber
            label="EU landed (€/unit)"
            value={inp.euLanded}
            min={0}
            step={0.5}
            onChange={(v) =>
              setInp((s) => ({ ...s, euLanded: Math.max(0, v) }))
            }
          />
          <FieldNumber
            label="Units/maand (NL markt)"
            value={inp.units}
            min={0}
            step={100}
            onChange={(v) =>
              setInp((s) => ({ ...s, units: Math.max(0, Math.round(v)) }))
            }
          />
        </div>

        <hr />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm w-full inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={inp.manualPI}
              onChange={(e) =>
                setInp((s) => ({ ...s, manualPI: e.target.checked }))
              }
            />
            <span className="font-medium">PI-share handmatig invullen</span>
          </label>

          <FieldPct
            label="Handmatige PI-share (eind)"
            value={inp.manualPIShare}
            onChange={(v) =>
              setInp((s) => ({ ...s, manualPIShare: clamp(v, 0, 1) }))
            }
          />

          <FieldNumber
            label="Ramp-in (maanden) — handmatig"
            value={inp.manualPIRamp}
            min={0}
            step={1}
            onChange={(v) =>
              setInp((s) => ({ ...s, manualPIRamp: Math.max(0, Math.round(v)) }))
            }
          />
        </div>

        {inp.manualPI && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Handmatige modus actief: PI-share volgt jouw invoer (met ramp) i.p.v. de
            gap-formule.
          </p>
        )}
      </section>
    );
  }

  /** ========================= KPI & antwoorden ========================= */
  function BlockKpis() {
    return (
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold mb-3">KPI’s — Huidig beleid (A)</h3>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
          <Kpi
            title="Gap (einde)"
            value={eur(simA.kpis.endGap, 0)}
            help={`NL effectief: ${eur(simA.kpis.endNetEffective, 0)} vs EU landed: ${eur(
              inp.euLanded,
              0
            )}`}
            tone={
              simA.kpis.endGap > DEFAULT_SETTINGS.threshold
                ? "bad"
                : simA.kpis.endGap > 0
                ? "warn"
                : "good"
            }
          />
          <Kpi
            title="PI-share (einde)"
            value={pctS(simA.kpis.endSharePI)}
            help={`Cap: ${pctS(DEFAULT_SETTINGS.cap, 0)}`}
            tone={simA.kpis.endSharePI > 0.25 ? "bad" : simA.kpis.endSharePI > 0.1 ? "warn" : "default"}
          />
          <Kpi
            title="Originator Net — Jaar 1"
            value={eur(simA.kpis.orgNetY1)}
          />
          <Kpi title="Parallel Net — Jaar 1" value={eur(simA.kpis.piNetY1)} />
          <Kpi
            title="Benodigde bonus ↑"
            value={`${round(simA.kpis.bonusDeltaPpToClose, 1)} pp`}
            help={`Nieuw bonusniveau: ${answers.quickFixNewBonus}`}
            tone={simA.kpis.bonusDeltaPpToClose > 0 ? "warn" : "good"}
          />
        </div>

        {/* Q&A samenvatting */}
        <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          <div className="rounded-xl border p-3 text-sm">
            <div className="font-medium">Is er acuut PI-risico?</div>
            <div className="mt-1">{`Ja, risico is ${answers.gapRisk}. Gap: ${eur(
              simA.kpis.endGap,
              0
            )}; PI (einde): ${answers.piEnd}.`}</div>
          </div>
          <div className="rounded-xl border p-3 text-sm">
            <div className="font-medium">Wat kost het me nu?</div>
            <div className="mt-1">Indicatie Jaar-1 PI-omzet: {answers.y1Loss}.</div>
          </div>
          <div className="rounded-xl border p-3 text-sm">
            <div className="font-medium">Wat is de snelste ingreep?</div>
            <div className="mt-1">
              Verhoog bonus met ~{answers.quickFixPp} pp (list prijs blijft ongemoeid).
            </div>
          </div>
        </div>
      </section>
    );
  }

  /** ========================= Vergelijking ========================= */
  function BlockCompare() {
    if (!showCompare) return null;
    return (
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold mb-3">
          Vergelijking — Voorstel (B) t.o.v. Huidig (A)
        </h3>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
          <Kpi
            title="Bonus voorstel"
            value={`${round(deltas.bonusDeltaPp, 1)} pp`}
            help={`A: ${pctS(inp.bonus, 1)} → B: ${pctS(inpB.bonus, 1)}`}
          />
          <Kpi
            title="Δ PI-share (einde)"
            value={pctS(deltas.piShareEnd)}
            help={`A: ${pctS(simA.kpis.endSharePI)} → B: ${pctS(simB.kpis.endSharePI)}`}
            tone={deltas.piShareEnd < 0 ? "good" : "warn"}
          />
          <Kpi
            title="Δ Gap (einde)"
            value={eur(deltas.gapEnd, 0)}
            help={`A: ${eur(simA.kpis.endGap, 0)} → B: ${eur(simB.kpis.endGap, 0)}`}
            tone={deltas.gapEnd < 0 ? "good" : "warn"}
          />
          <Kpi
            title="Δ Originator Net — Jaar 1"
            value={eur(deltas.orgY1)}
            tone={deltas.orgY1 >= 0 ? "good" : "bad"}
          />
          <Kpi
            title="Δ Parallel Net — Jaar 1"
            value={eur(deltas.piY1)}
            tone={deltas.piY1 <= 0 ? "good" : "warn"}
          />
        </div>
      </section>
    );
  }

  /** ========================= Grafieken ========================= */
  function BlockCharts() {
    return (
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h4 className="text-sm font-semibold mb-2">
            Originator net sales per maand (A)
          </h4>
          <LineChart
            name="Originator Net A"
            color="#0ea5e9"
            values={simA.points.map((p) => p.netSalesOriginator)}
            yFmt={(v) => compact(v)}
          />
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <h4 className="text-sm font-semibold mb-2">PI-share per maand (A)</h4>
          <LineChart
            name="PI share A"
            color="#22c55e"
            values={simA.points.map((p) => p.sharePI * 100)}
            yFmt={(v) => `${v.toFixed(0)}%`}
          />
        </div>
      </section>
    );
  }

  /** ========================= Acties/aanbevelingen ========================= */
  function BlockActions() {
    const tips: { title: string; detail: string }[] = [];

    // Bonus-optimalisatie
    if (!inp.manualPI && simA.kpis.endGap > DEFAULT_SETTINGS.threshold) {
      tips.push({
        title: "Verhoog bonus op realisatie",
        detail: `Voeg ~${round(
          simA.kpis.bonusDeltaPpToClose,
          1
        )} pp toe om gap ≤ €${DEFAULT_SETTINGS.threshold} te krijgen; behoud list (IRP-vriendelijk).`,
      });
    } else {
      tips.push({
        title: "Monitor & borg",
        detail:
          "Gap ≤ drempel. Handhaaf maandelijkse check op EU landed en borg prijsdiscipline bij ziekenhuizen/groothandels.",
      });
    }

    // Front vs. bonus mix
    if (inp.front > 0.25) {
      tips.push({
        title: "Front-end → bonus verschuiven",
        detail:
          "Reduceer front en verhoog performance-bonus. Minder doorpak-prikkel voor parallel, betere afstemming op realisatie.",
      });
    }

    // PI-share hoog
    if ((inp.manualPI && inp.manualPIShare > 0.25) || (!inp.manualPI && simA.kpis.endSharePI > 0.25)) {
      tips.push({
        title: "Specifieke contractvoorwaarden",
        detail:
          "Overweeg volumestaffels, exclusiviteit per indicatie/verpakking en service-levels met boeteclausules bij re-export.",
      });
    }

    // Operatie & supply
    tips.push({
      title: "Supply & pack-differentiation",
      detail:
        "Beperk arbitrage: NL-specifieke verpakkingen/leaflets waar toegestaan; leveringsplannen afstemmen om bulk-export te ontmoedigen.",
    });

    // KPI/ritme
    tips.push({
      title: "Maandritme & KPI’s",
      detail:
        "Rapporteer: NL effectief, EU landed, gap, PI-share, Net Y1. Stel alert in bij gap &gt; €2 of PI-share ↑ &gt; 5 pp in 3 mnd.",
    });

    return (
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold mb-2">Aanbevolen acties</h3>
        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-2">
          {tips.map((t, i) => (
            <li key={i}>
              <b>{t.title}:</b> {t.detail}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  /** ========================= Render ========================= */
  return (
    <div className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6 py-4 space-y-6">
      {/* Hero / Intro */}
      <header className="rounded-2xl border bg-white p-4 sm:p-5">
        <h1 className="text-xl sm:text-2xl font-semibold">
          Parallelimport Planner — prijs-gap en actieadvies
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Beantwoord in minuten: <i>Hoe groot is mijn gap?</i> — <i>Wat kost PI
          me dit jaar?</i> — <i>Welke bonus-aanpassing houdt PI onder de
          drempel, zonder list te raken?</i>
        </p>
      </header>

      <BlockInputs />
      <BlockKpis />
      <BlockCompare />
      <BlockCharts />
      <BlockActions />
    </div>
  );
}
