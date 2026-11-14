// Short labels for indicator codes in tables and charts (codes without an entry are shown as-is).
export const DISPLAY_CODE = {
  SPO2: 'SpO₂',
  TSKIN: 'T piel',
  RAD_D: 'Rad/día',
  RAD_DOSE: 'Rad acum.',
  IL6: 'IL-6',
  CORTISOL: 'Cortisol',
  SLEEP_H: 'Sueño',
  MUSCLE: 'Músculo',
}

// Recharts draws SVG attributes, which cannot read CSS variables: keep these in sync with index.css.
export const CHART_COLORS = {
  line: '#22d3ee',
  warn: '#f59e0b',
  danger: '#ef4444',
  grid: '#1e293b',
  axis: '#94a3b8',
  tooltipBg: '#111a2e',
  text: '#e2e8f0',
}

/** Picks the Spanish or English name of a catalog row. */
export function localName(row, lang) {
  return (lang === 'en' ? row.nameEn : row.nameEs) ?? row.name ?? row.code
}
