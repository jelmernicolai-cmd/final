export function mockGtnUploadExample() {
  return {
    kpis: [
      { label: 'Bruto omzet', value: '€ 12,4m' },
      { label: 'Kortingen', value: '€ 1,8m', hint: '14,5% van bruto' },
      { label: 'Fees/bonussen', value: '€ 0,6m' },
      { label: 'Netto omzet', value: '€ 10,0m' },
    ],
    waterfall: [
      { name: 'Bruto', value: 12.4 },
      { name: 'Korting', value: -1.8 },
      { name: 'Fees', value: -0.6 },
      { name: 'Netto', value: 10.0 },
    ],
  };
}

export function mockConsistencyExample() {
  const scatter = [
    { x: 50, y: 2.5 }, { x: 120, y: 3.0 }, { x: 300, y: 5.5 },
    { x: 800, y: 7.0 }, { x: 1300, y: 9.5 }, { x: 2000, y: 12.0 },
  ];
  return {
    kpis: [
      { label: 'Accounts', value: '126' },
      { label: 'Gem. korting%', value: '6,8%' },
      { label: 'Spread', value: '9,6 pp' },
      { label: 'Outliers', value: '7' },
    ],
    scatter,
  };
}

export function mockParallelExample() {
  const rows = ['Prod A','Prod B','Prod C','Prod D'];
  const cols = ['Hosp','Apoth','Grooth','Spec'];
  const values = rows.map((_r, ri) => cols.map((_c, ci) => Math.round((ri+1)*(ci+1)*2 + (ri*ci))));
  return {
    kpis: [
      { label: 'Overlap cases', value: '342' },
      { label: 'Hoog risico', value: '23' },
      { label: 'Pot. marge winst', value: '€ 180k' },
      { label: 'SKU’s', value: '58' },
    ],
    heatmap: { rows, cols, values },
  };
}
sampleData.ts
