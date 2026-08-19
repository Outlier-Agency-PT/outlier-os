// Parser for Mapa de Clientes 2026 — Google Sheets financial spreadsheet.
// Pure functions, no Supabase or network calls.

export interface ClienteRow {
  sheet_name: string;
  data: string | null;          // ISO date or null
  plataforma: string | null;
  vendedor: string | null;
  cliente: string;
  contrato_enviado: boolean | null;
  contrato_assinado: boolean | null;
  link_contrato: string | null;
  contrato: boolean | null;
  servico: string | null;
  contactos: string | null;
  notas: string | null;
  total_faturado: number | null;
}

export interface PagamentoRow {
  // cliente_id filled in by the route after upsert
  mes: string;
  ano: number;
  fatura: boolean | null;
  data_pagamento: number | null;
  valor: number | null;
  pagamento: boolean | null;
  sdr: boolean | null;
  closer: boolean | null;
}

export interface ParsedCliente {
  cliente: ClienteRow;
  pagamentos: PagamentoRow[];
}

// ── Sheet configs ────────────────────────────────────────────────────────────

export type SheetConfig = {
  name: string;
  gid: string;
  // Column index (0-based) for each static field. null = not present on sheet.
  staticCols: {
    data: number | null;
    plataforma: number | null;
    vendedor: number | null;
    cliente: number;
    contrato_enviado: number | null;
    contrato_assinado: number | null;
    link_contrato: number | null;
    contrato: number | null;
    servico: number | null;
    contactos: number | null;
  };
  // TOTAL col label (to detect end of month blocks in row 1)
  // Month blocks: col index of first month block
  monthStartCol: number;
  // Row 1 = months, Row 2 = sub-headers, data starts row 3.
  // Exception: Novo Serviço has months in row 3, sub-headers in row 4, data in row 5.
  headerOffset: number; // 0 = normal (rows 1+2), 2 = Novo Serviço (rows 3+4)
  // Trailing non-month label in row 1 (e.g. "Notas") to collect into notas field
  trailingNotasCol?: number;
};

export const SHEET_CONFIGS: SheetConfig[] = [
  {
    name: "Clientes incubadora",
    gid: "1777572460",
    staticCols: {
      data: 0,
      plataforma: 1,
      vendedor: 2,
      cliente: 3,
      contrato_enviado: 4,
      contrato_assinado: 5,
      link_contrato: 6,
      contrato: null,
      servico: null,
      contactos: null,
    },
    monthStartCol: 7,
    headerOffset: 0,
  },
  {
    name: "Renovações Incubadora",
    gid: "559044581",
    staticCols: {
      data: 0,
      plataforma: 1,
      vendedor: 2,
      cliente: 3,
      contrato_enviado: null,
      contrato_assinado: null,
      link_contrato: null,
      contrato: null,
      servico: null,
      contactos: null,
    },
    monthStartCol: 4,
    headerOffset: 0,
  },
  {
    name: "Clientes Serviço",
    gid: "2124118954",
    staticCols: {
      data: null,
      plataforma: null,
      vendedor: 3,
      cliente: 4,
      contrato_enviado: null,
      contrato_assinado: null,
      link_contrato: 1,
      contrato: 0,
      servico: 2,
      contactos: null,
    },
    monthStartCol: 5,
    headerOffset: 0,
  },
  {
    name: "Google Essential",
    gid: "1596992246",
    staticCols: {
      data: null,
      plataforma: 2,
      vendedor: 3,
      cliente: 4,
      contrato_enviado: null,
      contrato_assinado: null,
      link_contrato: null,
      contrato: 0,
      servico: 1,
      contactos: 5,
    },
    monthStartCol: 6,
    headerOffset: 0,
  },
  {
    name: "Google + Meta Pro",
    gid: "569064899",
    staticCols: {
      data: null,
      plataforma: 2,
      vendedor: 3,
      cliente: 4,
      contrato_enviado: null,
      contrato_assinado: null,
      link_contrato: null,
      contrato: 0,
      servico: 1,
      contactos: 5,
    },
    monthStartCol: 6,
    headerOffset: 0,
    trailingNotasCol: undefined, // detected dynamically from row 1
  },
  {
    name: "Novo Serviço",
    gid: "1939601404",
    staticCols: {
      data: 0,
      plataforma: null,
      vendedor: null,
      cliente: 1,
      contrato_enviado: null,
      contrato_assinado: null,
      link_contrato: null,
      contrato: null,
      servico: null,
      contactos: 2,
    },
    monthStartCol: 3,
    headerOffset: 2, // months in row 3, sub-headers in row 4, data from row 5
  },
  {
    name: "Clientes Maria",
    gid: "1035546915",
    staticCols: {
      data: null,
      plataforma: 2,
      vendedor: 3,
      cliente: 4,
      contrato_enviado: null,
      contrato_assinado: null,
      link_contrato: null,
      contrato: 0,
      servico: 1,
      contactos: null,
    },
    monthStartCol: 5,
    headerOffset: 0,
  },
];

// ── Primitive helpers ────────────────────────────────────────────────────────

function c(v: string | undefined): string {
  return (v ?? "").replace(/^"|"$/g, "").trim();
}

function parseBool(v: string | undefined): boolean | null {
  const s = c(v).toUpperCase();
  if (s === "TRUE") return true;
  if (s === "FALSE") return false;
  return null;
}

function parseValor(v: string | undefined): number | null {
  let s = c(v);
  if (!s) return null;
  // Strip € and leading/trailing whitespace
  s = s.replace(/€/g, "").trim();
  // Remove thousands separators: space before groups of 3 digits (PT style: "1 500,00")
  s = s.replace(/\s(?=\d{3}([,.]|$))/g, "");
  // Also remove dot used as thousands separator when comma is decimal (1.500,00)
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

function parseDate(v: string | undefined): string | null {
  const s = c(v);
  if (!s) return null;
  // DD/MM/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

function parseDay(v: string | undefined): number | null {
  const s = c(v);
  if (!s) return null;
  const n = parseInt(s, 10);
  return isNaN(n) || n < 1 || n > 31 ? null : n;
}

// ── Month block detection ────────────────────────────────────────────────────

const SKIP_MONTH_LABELS = new Set([
  "TOTAL", "TOTAL FATURAÇÃO", "NOTAS",
  "VALOR RENOVAÇÕES MARÇO", // Renovações row 1 col A anomaly
]);

function detectMonthBlocks(
  row1: string[],
  monthStartCol: number
): Array<{ mes: string; startCol: number }> {
  const blocks: Array<{ mes: string; startCol: number }> = [];

  for (let i = monthStartCol; i < row1.length; i++) {
    const label = c(row1[i]).toUpperCase();
    if (!label) continue;
    if (SKIP_MONTH_LABELS.has(label)) continue;
    // A real month name — must not be a static-col label bleeding into row 1
    blocks.push({ mes: c(row1[i]), startCol: i });
  }

  return blocks;
}

// ── Per-row month block extraction ──────────────────────────────────────────

function extractPagamento(
  cols: string[],
  startCol: number,
  nextStartCol: number,
  mes: string,
  ano: number
): PagamentoRow {
  // Sub-columns within block: fatura(+0), data_pagamento(+1), valor(+2), pagamento(+3), sdr(+4?), closer(+5?)
  const blockSize = nextStartCol - startCol;
  const at = (offset: number) => (offset < blockSize ? cols[startCol + offset] : undefined);

  return {
    mes,
    ano,
    fatura: parseBool(at(0)),
    data_pagamento: parseDay(at(1)),
    valor: parseValor(at(2)),
    pagamento: parseBool(at(3)),
    sdr: blockSize >= 5 ? parseBool(at(4)) : null,
    closer: blockSize >= 6 ? parseBool(at(5)) : null,
  };
}

// ── Main parser ──────────────────────────────────────────────────────────────

export function parseSheet(
  sheetName: string,
  rows: string[][],  // raw 2D array from Sheets API
  config: SheetConfig,
  ano = 2026
): ParsedCliente[] {
  const offset = config.headerOffset;
  const row1 = rows[offset] ?? [];       // month name row
  const dataRows = rows.slice(offset + 2); // skip row1 + row2 (sub-headers)

  const monthBlocks = detectMonthBlocks(row1, config.monthStartCol);

  // Sentinel end column: first TOTAL col or end of row
  let totalCol = row1.length;
  for (let i = config.monthStartCol; i < row1.length; i++) {
    const label = c(row1[i]).toUpperCase();
    if (label === "TOTAL" || label === "TOTAL FATURAÇÃO") {
      totalCol = i;
      break;
    }
  }

  // Notas col: "Notas" in row 1 after TOTAL (Google + Meta Pro specific)
  let notasColInRow1: number | null = null;
  for (let i = totalCol + 1; i < row1.length; i++) {
    const label = c(row1[i]).toUpperCase();
    if (label === "NOTAS") {
      notasColInRow1 = i;
      break;
    }
  }

  // Build block boundaries: each block ends where the next starts (or at totalCol)
  const blockBoundaries = monthBlocks.map((block, idx) => ({
    mes: block.mes,
    startCol: block.startCol,
    endCol: idx + 1 < monthBlocks.length ? monthBlocks[idx + 1].startCol : totalCol,
  }));

  const results: ParsedCliente[] = [];

  for (const row of dataRows) {
    const sc = config.staticCols;
    const clienteVal = c(row[sc.cliente]);

    // Skip empty rows and summary rows
    if (!clienteVal) continue;
    if (clienteVal.toUpperCase().includes("TOTAL FATURA")) continue;

    const cliente: ClienteRow = {
      sheet_name: sheetName,
      data: sc.data !== null ? parseDate(row[sc.data]) : null,
      plataforma: sc.plataforma !== null ? c(row[sc.plataforma]) || null : null,
      vendedor: sc.vendedor !== null ? c(row[sc.vendedor]) || null : null,
      cliente: clienteVal,
      contrato_enviado: sc.contrato_enviado !== null ? parseBool(row[sc.contrato_enviado]) : null,
      contrato_assinado: sc.contrato_assinado !== null ? parseBool(row[sc.contrato_assinado]) : null,
      link_contrato: sc.link_contrato !== null ? c(row[sc.link_contrato]) || null : null,
      contrato: sc.contrato !== null ? parseBool(row[sc.contrato]) : null,
      servico: sc.servico !== null ? c(row[sc.servico]) || null : null,
      contactos: sc.contactos !== null ? c(row[sc.contactos]) || null : null,
      notas: notasColInRow1 !== null ? c(row[notasColInRow1]) || null : null,
      total_faturado: totalCol < row.length ? parseValor(row[totalCol]) : null,
    };

    const pagamentos: PagamentoRow[] = blockBoundaries.map((b) =>
      extractPagamento(row, b.startCol, b.endCol, b.mes, ano)
    );

    results.push({ cliente, pagamentos });
  }

  return results;
}
