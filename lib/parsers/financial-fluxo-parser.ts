// Parser for Mapa de Fluxo de Caixa 2026.
// Pure functions — no Supabase or network calls.

export interface FluxoRow {
  row_number: number;
  group_label: string | null;  // col B
  label: string | null;        // col C
  categoria: string | null;    // col D
  is_subtotal: boolean;
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

// ── Known row classifications ────────────────────────────────────────────────

const SKIP_ROWS = new Set([1, 2, 3, 4]);

const SUBTOTAL_LABELS = new Set([
  "total receita c/iva",
  "iva",
  "total receita sem iva",
  "recursos humanos",
  "prestação de serviços",
  "escritório",
  "softwares",
  "marketing",
  "outras despesas fixas",
  "total despesas fixas agência",
  "outras despesas variáveis",
  "formação + networking",
  "total despesas variáveis agência",
  "total de despesas",
  "ebitda",
  "ebitda %",
  "impostos",
  "lucro liquido (c/ crédito)",
  "lucro liquido %",
  "lucro liquido (s/ crédito)",
  "saldo caixa",
  "pagamento iva",
]);

// Month column indices (0-based): E=4 … P=15
const MONTH_COLS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;

const MONTH_KEYS: (keyof FluxoRow)[] = [
  "janeiro", "fevereiro", "marco", "abril",
  "maio", "junho", "julho", "agosto",
  "setembro", "outubro", "novembro", "dezembro",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function clean(v: string | undefined): string {
  return (v ?? "").trim();
}

function parseValor(v: string | undefined): number | null {
  let s = clean(v);
  if (!s) return null;
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

// ── Main parser ──────────────────────────────────────────────────────────────

export function parseFluxo(rawRows: string[][]): FluxoRow[] {
  const results: FluxoRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 1;

    if (SKIP_ROWS.has(rowNumber)) continue;

    const row = rawRows[i];
    const groupLabel = clean(row[1]) || null;
    const label = clean(row[2]) || null;
    const categoria = clean(row[3]) || null;

    // Skip rows where both label and group_label are empty
    if (!groupLabel && !label) continue;

    const is_subtotal = label != null && SUBTOTAL_LABELS.has(label.toLowerCase().trim());

    const months: Partial<FluxoRow> = {};
    for (let m = 0; m < MONTH_COLS.length; m++) {
      (months as Record<string, number | null>)[MONTH_KEYS[m] as string] =
        parseValor(row[MONTH_COLS[m]]);
    }

    // total_anual: sum of non-null month values (sheet may not have a dedicated total col)
    const monthValues = MONTH_KEYS.map(
      (k) => (months as Record<string, number | null>)[k as string]
    ).filter((v): v is number => v !== null);
    const total_anual = monthValues.length > 0
      ? monthValues.reduce((a, b) => a + b, 0)
      : null;

    results.push({
      row_number: rowNumber,
      group_label: groupLabel,
      label,
      categoria,
      is_subtotal,
      janeiro: (months as Record<string, number | null>)["janeiro"] ?? null,
      fevereiro: (months as Record<string, number | null>)["fevereiro"] ?? null,
      marco: (months as Record<string, number | null>)["marco"] ?? null,
      abril: (months as Record<string, number | null>)["abril"] ?? null,
      maio: (months as Record<string, number | null>)["maio"] ?? null,
      junho: (months as Record<string, number | null>)["junho"] ?? null,
      julho: (months as Record<string, number | null>)["julho"] ?? null,
      agosto: (months as Record<string, number | null>)["agosto"] ?? null,
      setembro: (months as Record<string, number | null>)["setembro"] ?? null,
      outubro: (months as Record<string, number | null>)["outubro"] ?? null,
      novembro: (months as Record<string, number | null>)["novembro"] ?? null,
      dezembro: (months as Record<string, number | null>)["dezembro"] ?? null,
      total_anual,
    });
  }

  return results;
}
