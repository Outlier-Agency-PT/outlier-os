// Parsers for Mapa de Fluxo de Caixa 2026 — extra chart sheets.
// Pure functions — no Supabase or network calls.

// ── Shared types ─────────────────────────────────────────────────────────────

export interface GraficoDespesasRow {
  categoria: string;
  janeiro: number | null;
  fevereiro: number | null;
  marco: number | null;
  abril: number | null;
  maio: number | null;
  junho: number | null;
  julho: number | null;
  agosto: number | null;
  setembro: number | null;
  outubro: number | null;
  novembro: number | null;
  dezembro: number | null;
  total_anual: number | null;
}

export interface GraficoPnlRow {
  metrica: string;
  janeiro: number | null;
  fevereiro: number | null;
  marco: number | null;
  abril: number | null;
  maio: number | null;
  junho: number | null;
  julho: number | null;
  agosto: number | null;
  setembro: number | null;
  outubro: number | null;
  novembro: number | null;
  dezembro: number | null;
  total_anual: number | null;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
}

export interface ObjetivoRealizadoRow {
  metrica: string;
  janeiro: number | null;
  fevereiro: number | null;
  marco: number | null;
  abril: number | null;
  maio: number | null;
  junho: number | null;
  julho: number | null;
  agosto: number | null;
  setembro: number | null;
  outubro: number | null;
  novembro: number | null;
  dezembro: number | null;
  total_anual: number | null;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  s1: number | null;
  s2: number | null;
}

export interface PrevisaoAnoAnteriorRow {
  metrica: string;
  janeiro: number | null;
  fevereiro: number | null;
  marco: number | null;
  abril: number | null;
  maio: number | null;
  junho: number | null;
  julho: number | null;
  agosto: number | null;
  setembro: number | null;
  outubro: number | null;
  novembro: number | null;
  dezembro: number | null;
  total_anual: number | null;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  s1: number | null;
  s2: number | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function clean(v: string | undefined): string {
  return (v ?? "").trim();
}

function parseValor(v: string | undefined): number | null {
  let s = clean(v);
  if (!s || s === "#DIV/0!") return null;
  s = s.replace(/€/g, "").trim();
  // Remove space-as-thousands-separator (PT locale: "1 500,00")
  s = s.replace(/\s(?=\d{3}([,.]|$))/g, "");
  // Handle dot+comma ambiguity
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function isSkippableLabel(label: string): boolean {
  return !label || label === "#DIV/0!";
}

// Month column indices (0-based): cols 1–12
const MONTH_COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const MONTH_KEYS = [
  "janeiro", "fevereiro", "marco", "abril",
  "maio", "junho", "julho", "agosto",
  "setembro", "outubro", "novembro", "dezembro",
] as const;

function parseMonths(row: string[]): Record<typeof MONTH_KEYS[number], number | null> {
  const result = {} as Record<typeof MONTH_KEYS[number], number | null>;
  for (let i = 0; i < MONTH_COLS.length; i++) {
    result[MONTH_KEYS[i]] = parseValor(row[MONTH_COLS[i]]);
  }
  return result;
}

// ── Sheet parsers ─────────────────────────────────────────────────────────────

// "Gráfico Despesas_26": col[0]=categoria, cols[1-12]=months, col[14]=total
export function parseGraficoDespesas(rawRows: string[][]): GraficoDespesasRow[] {
  const results: GraficoDespesasRow[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const categoria = clean(row[0]);
    if (isSkippableLabel(categoria)) continue;

    const months = parseMonths(row);

    results.push({
      categoria,
      ...months,
      total_anual: parseValor(row[14]),
    });
  }

  return results;
}

// "Gráfico PnL": col[0]=metrica, cols[1-12]=months, col[14]=total, cols[16-19]=Q1-Q4
export function parseGraficoPnl(rawRows: string[][]): GraficoPnlRow[] {
  const results: GraficoPnlRow[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const metrica = clean(row[0]);
    if (isSkippableLabel(metrica)) continue;

    const months = parseMonths(row);

    results.push({
      metrica,
      ...months,
      total_anual: parseValor(row[14]),
      q1: parseValor(row[16]),
      q2: parseValor(row[17]),
      q3: parseValor(row[18]),
      q4: parseValor(row[19]),
    });
  }

  return results;
}

// "Objetivo Vs Realizado": same as PnL + cols[21-22]=S1,S2
export function parseObjetivoRealizado(rawRows: string[][]): ObjetivoRealizadoRow[] {
  const results: ObjetivoRealizadoRow[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const metrica = clean(row[0]);
    if (isSkippableLabel(metrica)) continue;

    const months = parseMonths(row);

    results.push({
      metrica,
      ...months,
      total_anual: parseValor(row[14]),
      q1: parseValor(row[16]),
      q2: parseValor(row[17]),
      q3: parseValor(row[18]),
      q4: parseValor(row[19]),
      s1: parseValor(row[21]),
      s2: parseValor(row[22]),
    });
  }

  return results;
}

// "Previsão Comparativamente Ano Anterior": same structure as Objetivo Vs Realizado
export function parsePrevisaoAnoAnterior(rawRows: string[][]): PrevisaoAnoAnteriorRow[] {
  const results: PrevisaoAnoAnteriorRow[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const metrica = clean(row[0]);
    if (isSkippableLabel(metrica)) continue;

    const months = parseMonths(row);

    results.push({
      metrica,
      ...months,
      total_anual: parseValor(row[14]),
      q1: parseValor(row[16]),
      q2: parseValor(row[17]),
      q3: parseValor(row[18]),
      q4: parseValor(row[19]),
      s1: parseValor(row[21]),
      s2: parseValor(row[22]),
    });
  }

  return results;
}
