// Parser for Mapa de Pagamentos 2026 — Google Sheets.
// Pure functions — no Supabase or network calls.

export interface PagamentoRow {
  mes: string;
  ano: number;
  secao: string;
  nome: string;
  valor: number | null;
  iban_referencia: string | null;
  agendamento: boolean | null;
  aceite_daniel: boolean | null;
  pagamento_efetuada_a: string | null;
  numero_fatura: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function clean(v: string | undefined): string {
  return (v ?? "").trim();
}

function parseValor(v: string | undefined): number | null {
  let s = clean(v);
  if (!s) return null;
  s = s.replace(/€/g, "").trim();
  s = s.replace(/\s(?=\d{3}([,.]|$))/g, "");
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

function parseBool(v: string | undefined): boolean | null {
  const s = clean(v).toUpperCase();
  if (s === "TRUE") return true;
  if (s === "FALSE") return false;
  return null;
}

// ── Main parser ──────────────────────────────────────────────────────────────

export function parsePagamentos(
  sheetName: string,
  rawRows: string[][],
  ano = 2026
): PagamentoRow[] {
  const results: PagamentoRow[] = [];
  let currentSecao = "";

  for (const row of rawRows) {
    const colA = clean(row[0]);
    const nome = clean(row[1]);

    // Skip sub-header repeats and grand total
    if (nome === "Nome" || nome === "Total") continue;

    // Skip rows with no nome
    if (!nome) continue;

    // Update section if col A is non-empty
    if (colA && colA !== "Nome") {
      currentSecao = colA;
    }

    // Need a section to assign rows to
    if (!currentSecao) continue;

    results.push({
      mes: sheetName,
      ano,
      secao: currentSecao,
      nome,
      valor: parseValor(row[2]),
      iban_referencia: clean(row[3]) || null,
      agendamento: parseBool(row[4]),
      aceite_daniel: parseBool(row[5]),
      pagamento_efetuada_a: clean(row[6]) || null,
      numero_fatura: clean(row[7]) || null,
    });
  }

  return results;
}
