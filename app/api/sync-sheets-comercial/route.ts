import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const COMERCIAL_SHEET_ID = "1wq-eICmp7kYjyS39mXE6M4hNHLfam5zV_TWxj043tDI";
const MARKETING_SHEET_ID = "1g7orkqW-3PcN39H83AuhIsBxL8zwKttm";

const GIDS = {
  dailyCloserIncubadora:  "1812700955",
  dailySdrIncubadora:     "1606284721",
  dailyCloserServicos:    "5859456",
  dailySdrServicos:       "170274727",
  dailyOutboundBdr:       "1494121402",
  rastreamentoCalls:      "283011562",
  vendasPorFunnil:        "2045679982",
  chamadasPorFunnil:      "1510298644",
  ajusteMeta:             "182654049",
  motivoDeLoss:           "1543678188",
  refundsOte:             "49018326",
  dadosPorMes:            "858900080",
  dadosPorSemana:         "1986011443",
  roasFechos:             "2047610655",
};

// Helper para fetch + parse
async function fetchAndParse<T>(sheetId: string, gid: string, parser: (lines: string[]) => T[]): Promise<T[]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao ler sheet gid=${gid}`);
  const csv = await res.text();
  return parser(csv.split(/\r?\n/));
}

function parseNum(val: string | undefined): number | null {
  if (!val || val.trim() === "" || val.trim() === "0") return null;
  let clean = val.replace(/^"|"$/g, "").replace(/[€\s]/g, "").trim();
  const hasComma = clean.includes(",");
  const hasDot = clean.includes(".");
  if (hasComma && hasDot) {
    if (clean.lastIndexOf(",") > clean.lastIndexOf(".")) {
      // Formato PT: 1.234,56 — remover ponto (milhar) e substituir vírgula por ponto
      clean = clean.replace(/\./g, "").replace(",", ".");
    } else {
      // Formato EN: 1,234.56 — remover vírgula (milhar)
      clean = clean.replace(/,/g, "");
    }
  } else if (hasComma) {
    // Só vírgula — separador decimal PT (108,54)
    clean = clean.replace(",", ".");
  }
  // Só ponto — já está em formato correcto (108.54)
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

function clean(s?: string): string {
  return (s ?? "").replace(/^"|"$/g, "").trim();
}

function parseCols(line: string): string[] {
  return line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) ?? [];
}

function parseCloserSheet(funnel: "incubadora" | "servicos") {
  return function(lines: string[]) {
    const results: Record<string, unknown>[] = [];
    const syncedAt = new Date().toISOString();

    const groups = funnel === "incubadora" ? [
      { name: "TOTAL",                  base: 2,   hasRefund: true  },
      { name: "ALCINO",                 base: 17,  hasRefund: true  },
      { name: "JULIANA",                base: 32,  hasRefund: false },
      { name: "OUTBOUND_ALCINO_DANIEL", base: 45,  hasRefund: false },
      { name: "DANIEL",                 base: 58,  hasRefund: false },
      { name: "RICARDO",                base: 71,  hasRefund: false },
      { name: "SUSANA",                 base: 84,  hasRefund: false },
      { name: "DAVI",                   base: 97,  hasRefund: false },
    ] : [
      { name: "TOTAL",            base: 2,   hasRefund: false },
      { name: "ALCINO",           base: 15,  hasRefund: false },
      { name: "DANIEL",           base: 28,  hasRefund: false },
      { name: "RICARDO",          base: 71,  hasRefund: false },
      { name: "OUTBOUND_LEADS",   base: 84,  hasRefund: false },
      { name: "EVENTO_CHECKOUT",  base: 97,  hasRefund: false },
      { name: "CLOSER_8",         base: 110, hasRefund: false },
    ];

    let currentMonth: string | null = null;
    let currentYear: number = new Date().getFullYear();

    for (const line of lines.slice(2)) {
      const cols = parseCols(line);
      const colA = clean(cols[0]);
      const colB = clean(cols[1]);

      if (colA) currentMonth = colA.trim().toUpperCase();

      const dateMatch = colB.match(/(\d{4})/);
      if (dateMatch && colB.includes("-")) currentYear = parseInt(dateMatch[1]);

      if (colB.toUpperCase() !== "TOTAL" || !currentMonth) continue;

      for (const group of groups) {
        const b = group.base;
        const record: Record<string, unknown> = {
          month_name: currentMonth,
          year: currentYear,
          funnel,
          closer_name: group.name,
          se_agendada: parseNum(cols[b]),
          se_realizada: parseNum(cols[b + 2]),
          se_pitch: parseNum(cols[b + 4]),
          vendas: parseNum(cols[b + 6]),
          reembolsos: group.hasRefund ? parseNum(cols[b + 7]) : null,
          valor_reembolso: group.hasRefund ? parseNum(cols[b + 8]) : null,
          valor_vendas: group.hasRefund ? parseNum(cols[b + 9]) : parseNum(cols[b + 7]),
          cash_collected: group.hasRefund ? parseNum(cols[b + 11]) : parseNum(cols[b + 9]),
          valor_primeira_parcela: group.hasRefund ? parseNum(cols[b + 12]) : parseNum(cols[b + 10]),
          synced_at: syncedAt,
        };
        results.push(record);
      }
    }
    return results;
  };
}

function parseSdrSheet(funnel: "incubadora" | "servicos") {
  return function(lines: string[]) {
    const results: Record<string, unknown>[] = [];
    const syncedAt = new Date().toISOString();

    const groups = funnel === "incubadora" ? [
      { name: "TOTAL",    base: 2  },
      { name: "ALCINO",   base: 10 },
      { name: "JULIANA",  base: 18 },
      { name: "SUSANA",   base: 26 },
      { name: "DAVI",     base: 34 },
      { name: "CATARINA", base: 42 },
    ] : [
      { name: "TOTAL",   base: 2  },
      { name: "ALCINO",  base: 10 },
      { name: "JULIANA", base: 18 },
      { name: "SDR_3",   base: 26 },
      { name: "SDR_4",   base: 34 },
      { name: "SDR_5",   base: 42 },
      { name: "SDR_6",   base: 50 },
      { name: "SDR_7",   base: 58 },
      { name: "SDR_8",   base: 66 },
      { name: "SDR_9",   base: 74 },
      { name: "SDR_10",  base: 82 },
    ];

    let currentMonth: string | null = null;
    let currentYear: number = new Date().getFullYear();

    for (const line of lines.slice(2)) {
      const cols = parseCols(line);
      const colA = clean(cols[0]);
      const colB = clean(cols[1]);

      if (colA) currentMonth = colA.trim().toUpperCase();

      const dateMatch = colB.match(/(\d{4})/);
      if (dateMatch && colB.includes("-")) currentYear = parseInt(dateMatch[1]);

      if (colB.toUpperCase() !== "TOTAL" || !currentMonth) continue;

      for (const group of groups) {
        const b = group.base;
        results.push({
          month_name: currentMonth,
          year: currentYear,
          funnel,
          sdr_name: group.name,
          ligacoes_realizadas: parseNum(cols[b]),
          ligacoes_atendidas: parseNum(cols[b + 2]),
          ligacoes_conversa: parseNum(cols[b + 4]),
          agendamentos: parseNum(cols[b + 6]),
          synced_at: syncedAt,
        });
      }
    }
    return results;
  };
}

function parseBdrSheet(lines: string[]) {
  const results: Record<string, unknown>[] = [];
  const syncedAt = new Date().toISOString();

  const groups = [
    { name: "TOTAL",   base: 2,  hasMensagens: true  },
    { name: "ALCINO",  base: 10, hasMensagens: true  },
    { name: "JULIANA", base: 18, hasMensagens: true  },
    { name: "RICARDO", base: 26, hasMensagens: false },
  ];

  let currentMonth: string | null = null;
  let currentYear: number = new Date().getFullYear();

  for (const line of lines.slice(2)) {
    const cols = parseCols(line);
    const colA = clean(cols[0]);
    const colB = clean(cols[1]);

    if (colA) currentMonth = colA.trim().toUpperCase();
    const dateMatch = colB.match(/(\d{4})/);
    if (dateMatch && colB.includes("-")) currentYear = parseInt(dateMatch[1]);
    if (colB.toUpperCase() !== "TOTAL" || !currentMonth) continue;

    for (const group of groups) {
      const b = group.base;
      results.push({
        month_name: currentMonth,
        year: currentYear,
        bdr_name: group.name,
        mensagens_enviadas:  group.hasMensagens ? parseNum(cols[b])     : null,
        mensagens_recebidas: group.hasMensagens ? parseNum(cols[b + 2]) : null,
        ligacoes_realizadas: group.hasMensagens ? null : parseNum(cols[b]),
        ligacoes_atendidas:  group.hasMensagens ? null : parseNum(cols[b + 2]),
        ligacoes_conversa:   parseNum(cols[b + 4]),
        agendamentos:        parseNum(cols[b + 6]),
        synced_at: syncedAt,
      });
    }
  }
  return results;
}

function parseCallTracking(lines: string[]) {
  const results: Record<string, unknown>[] = [];
  const syncedAt = new Date().toISOString();
  const currentYear = new Date().getFullYear();

  for (const line of lines.slice(1)) {
    const cols = parseCols(line);
    const monthName = clean(cols[0]);
    if (!monthName || monthName.toLowerCase() === "mês" || monthName.toLowerCase() === "mes") continue;

    const chamadas_agendadas  = parseNum(cols[1]);
    const chamadas_canceladas = parseNum(cols[2]);
    const no_show             = parseNum(cols[3]);
    const reagendamentos      = parseNum(cols[4]);
    const chamadas_realizadas = parseNum(cols[5]);
    const chamadas_pitch      = parseNum(cols[6]);
    const vendas              = parseNum(cols[7]);

    if (chamadas_agendadas === null && chamadas_realizadas === null) continue;

    results.push({
      month_name: monthName.toUpperCase(),
      year: currentYear,
      chamadas_agendadas,
      chamadas_canceladas,
      no_show,
      reagendamentos,
      chamadas_realizadas,
      chamadas_pitch,
      vendas,
      synced_at: syncedAt,
    });
  }
  return results;
}

function parseVendasFunnil(lines: string[]) {
  const results: Record<string, unknown>[] = [];
  const syncedAt = new Date().toISOString();
  const year = 2026;

  const monthCols: { month: string; col: number }[] = [
    { month: "JUNHO",    col: 3 },
    { month: "JULHO",    col: 4 },
    { month: "AGOSTO",   col: 5 },
    { month: "SETEMBRO", col: 6 },
    { month: "OUTUBRO",  col: 7 },
    { month: "NOVEMBRO", col: 8 },
    { month: "DEZEMBRO", col: 9 },
  ];

  const blocks = [
    { startIdx: 9,  endIdx: 25, saleType: "direto"     },
    { startIdx: 29, endIdx: 41, saleType: "recuperacao" },
  ];

  for (const block of blocks) {
    const blockLines = lines.slice(block.startIdx, block.endIdx + 1);
    for (const line of blockLines) {
      const cols = parseCols(line);
      const funnelName = clean(cols[1]);
      if (!funnelName || funnelName.toUpperCase() === "TOTAL" || funnelName.toUpperCase().includes("FOLLOW")) continue;

      for (const { month, col } of monthCols) {
        const vendas = parseNum(cols[col]);
        if (vendas === null) continue;
        results.push({
          month_name: month,
          year,
          funnel_name: funnelName,
          sale_type: block.saleType,
          vendas,
          synced_at: syncedAt,
        });
      }
    }
  }
  return results;
}

function parseChamadasFunnil(lines: string[]) {
  const results: Record<string, unknown>[] = [];
  const syncedAt = new Date().toISOString();
  const month_name = "OUTUBRO";
  const year = 2026;

  let currentFunnel: string | null = null;
  let agendadas: number | null = null;
  let realizadas: number | null = null;
  let vendas: number | null = null;

  for (const line of lines) {
    const cols = parseCols(line);
    const colB = clean(cols[1]);
    const colC = clean(cols[2]);

    if (!colB) continue;

    const isHeader = colB && !colB.toLowerCase().includes("reuniões") && !colB.toLowerCase().includes("vendas") && isNaN(Number(colC));

    if (isHeader && colB.toUpperCase() !== "NÚMERO DE REUNIOES POR FUNNIL") {
      if (currentFunnel && (agendadas !== null || realizadas !== null)) {
        results.push({ month_name, year, funnel_name: currentFunnel, reunioes_agendadas: agendadas, reunioes_realizadas: realizadas, vendas, synced_at: syncedAt });
      }
      currentFunnel = colB.trim();
      agendadas = null;
      realizadas = null;
      vendas = null;
    } else if (colB.toLowerCase().includes("agendadas")) {
      agendadas = parseNum(colC);
    } else if (colB.toLowerCase().includes("realizadas")) {
      realizadas = parseNum(colC);
    } else if (colB.toLowerCase() === "vendas") {
      vendas = parseNum(colC);
    }
  }

  if (currentFunnel && (agendadas !== null || realizadas !== null)) {
    results.push({ month_name, year, funnel_name: currentFunnel, reunioes_agendadas: agendadas, reunioes_realizadas: realizadas, vendas, synced_at: syncedAt });
  }

  return results;
}

function parseAjusteMeta(lines: string[]) {
  const results: Record<string, unknown>[] = [];
  const syncedAt = new Date().toISOString();
  const year = 2026;

  const metaMap = new Map<string, { meta_faturamento: number | null; meta_conversao: number | null }>();

  for (const line of lines.slice(2, 15)) {
    const cols = parseCols(line);
    const monthName = clean(cols[0]).toUpperCase();
    if (!monthName) continue;
    const meta_faturamento = parseNum(cols[1]);
    if (meta_faturamento === null) continue;
    metaMap.set(monthName, { meta_faturamento, meta_conversao: null });
  }

  for (const line of lines.slice(209, 222)) {
    const cols = parseCols(line);
    const monthName = clean(cols[0]).toUpperCase();
    if (!monthName) continue;
    const meta_conversao = parseNum(cols[1]);
    if (meta_conversao === null) continue;
    const existing = metaMap.get(monthName);
    if (existing) {
      existing.meta_conversao = meta_conversao;
    } else {
      metaMap.set(monthName, { meta_faturamento: null, meta_conversao });
    }
  }

  for (const [month_name, data] of metaMap.entries()) {
    results.push({ month_name, year, ...data, synced_at: syncedAt });
  }
  return results;
}

function parseMotivoLoss(lines: string[]) {
  const results: Record<string, unknown>[] = [];
  const syncedAt = new Date().toISOString();

  const now = new Date();
  const month_name = now.toLocaleString("pt-PT", { month: "long" }).toUpperCase();
  const year = now.getFullYear();

  for (const line of lines.slice(3, 13)) {
    const cols = parseCols(line);
    const reason = clean(cols[1]);
    const count = parseNum(cols[2]);
    if (!reason || reason.toLowerCase() === "total") continue;
    results.push({ role: "closer", reason, count, month_name, year, synced_at: syncedAt });
  }

  for (const line of lines.slice(15, 21)) {
    const cols = parseCols(line);
    const reason = clean(cols[1]);
    const count = parseNum(cols[2]);
    if (!reason || reason.toLowerCase() === "total") continue;
    results.push({ role: "sdr", reason, count, month_name, year, synced_at: syncedAt });
  }

  return results;
}

function parseRefunds(lines: string[]) {
  const results: Record<string, unknown>[] = [];
  const syncedAt = new Date().toISOString();

  for (const line of lines.slice(1)) {
    const cols = parseCols(line);
    const data_fecho_raw = clean(cols[0]);
    if (!data_fecho_raw) continue;

    const nome_cliente = clean(cols[2]);
    const produto = clean(cols[3]);
    if (!nome_cliente || !produto) continue;

    results.push({
      data_fecho: data_fecho_raw || null,
      nome_cliente,
      produto,
      valor_com_iva: parseNum(cols[4]),
      data_refund: clean(cols[5]) || null,
      comissao_original_paga: parseNum(cols[8]),
      notas: clean(cols[11]) || null,
      synced_at: syncedAt,
    });
  }
  return results;
}

function parseMarketingMensal(lines: string[]) {
  const results: Record<string, unknown>[] = [];
  const syncedAt = new Date().toISOString();
  const year = 2026;

  const monthCols: { month: string; col: number }[] = [
    { month: "Jan", col: 2  },
    { month: "Fev", col: 3  },
    { month: "Mar", col: 4  },
    { month: "Abr", col: 5  },
    { month: "Mai", col: 6  },
    { month: "Jun", col: 7  },
    { month: "Jul", col: 8  },
    { month: "Ago", col: 9  },
    { month: "Set", col: 10 },
    { month: "Out", col: 11 },
    { month: "Nov", col: 12 },
    { month: "Dez", col: 13 },
  ];

  const funnelRows: { rowIdx: number; funnel: string; field: string }[] = [
    { rowIdx: 4,  funnel: "conteudos",  field: "alcance"       },
    { rowIdx: 5,  funnel: "conteudos",  field: "visitas_perfil" },
    { rowIdx: 6,  funnel: "conteudos",  field: "seguidores"    },
    { rowIdx: 7,  funnel: "conteudos",  field: "budget"        },
    { rowIdx: 10, funnel: "conteudos",  field: "vendas_texto"  },
    { rowIdx: 12, funnel: "incubadora", field: "alcance"       },
    { rowIdx: 13, funnel: "incubadora", field: "leads"         },
    { rowIdx: 14, funnel: "incubadora", field: "mql"           },
    { rowIdx: 15, funnel: "incubadora", field: "sql_count"     },
    { rowIdx: 16, funnel: "incubadora", field: "budget"        },
    { rowIdx: 20, funnel: "incubadora", field: "vendas_texto"  },
    { rowIdx: 22, funnel: "outlier",    field: "alcance"       },
    { rowIdx: 23, funnel: "outlier",    field: "leads"         },
    { rowIdx: 24, funnel: "outlier",    field: "mql"           },
    { rowIdx: 25, funnel: "outlier",    field: "sql_count"     },
    { rowIdx: 26, funnel: "outlier",    field: "budget"        },
    { rowIdx: 30, funnel: "outlier",    field: "vendas_texto"  },
    { rowIdx: 32, funnel: "ebook",      field: "alcance"       },
    { rowIdx: 33, funnel: "ebook",      field: "leads"         },
    { rowIdx: 34, funnel: "ebook",      field: "mql"           },
    { rowIdx: 35, funnel: "ebook",      field: "sql_count"     },
    { rowIdx: 36, funnel: "ebook",      field: "budget"        },
  ];

  const dataMap = new Map<string, Record<string, unknown>>();

  for (const { rowIdx, funnel, field } of funnelRows) {
    const line = lines[rowIdx];
    if (!line) continue;
    const cols = parseCols(line);

    for (const { month, col } of monthCols) {
      const key = `${funnel}__${month}`;
      if (!dataMap.has(key)) {
        dataMap.set(key, { month_name: month, year, funnel, synced_at: syncedAt });
      }
      const record = dataMap.get(key)!;
      const raw = clean(cols[col]);
      if (!raw) continue;

      if (field === "vendas_texto") {
        record[field] = raw;
      } else {
        const num = parseNum(raw);
        if (num !== null) record[field] = num;
      }
    }
  }

  for (const record of dataMap.values()) {
    results.push(record);
  }
  return results;
}

function toIsoDate(raw: string): string | null {
  if (!raw) return null;
  const parts = raw.split("/");
  if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  return null;
}

function parseMarketingSemanal(lines: string[]) {
  const results: Record<string, unknown>[] = [];
  const syncedAt = new Date().toISOString();

  // Dados a partir da row 5 (índice 4) — header na row 4 (índice 3)
  for (const line of lines.slice(4)) {
    const cols = parseCols(line);
    const weekLabel = clean(cols[0]);
    const weekStartRaw = clean(cols[1]);
    const weekEndRaw = clean(cols[2]);

    if (!weekLabel || !weekLabel.toLowerCase().includes("semana")) continue;

    // Extrair year do week_start (formato DD/MM/YYYY)
    const yearMatch = weekStartRaw.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : 2026;

    // Campos de input — ignorar calculados
    // Conteúdos: cols 3–6
    const conteudos_alcance        = parseNum(cols[3]);
    const conteudos_visitas_perfil = parseNum(cols[4]);
    const conteudos_seguidores     = parseNum(cols[5]);
    const conteudos_budget         = parseNum(cols[6]);
    // cols 7–8 calculados — ignorar

    // Incubadora: cols 9–13
    const incubadora_alcance = parseNum(cols[9]);
    const incubadora_leads   = parseNum(cols[10]);
    const incubadora_mql     = parseNum(cols[11]);
    const incubadora_sql     = parseNum(cols[12]);
    const incubadora_budget  = parseNum(cols[13]);
    // cols 14–16 calculados — ignorar

    // Ebook: cols 17–21
    const ebook_alcance = parseNum(cols[17]);
    const ebook_leads   = parseNum(cols[18]);
    const ebook_mql     = parseNum(cols[19]);
    const ebook_sql     = parseNum(cols[20]);
    const ebook_budget  = parseNum(cols[21]);
    // cols 22–31 calculados — ignorar

    // Ignorar semanas completamente vazias
    const hasData = [
      conteudos_alcance, incubadora_alcance, incubadora_leads,
      ebook_alcance, ebook_leads
    ].some(v => v !== null && v > 0);
    if (!hasData) continue;

    results.push({
      week_label: weekLabel,
      week_start: toIsoDate(weekStartRaw),
      week_end: toIsoDate(weekEndRaw),
      year,
      conteudos_alcance,
      conteudos_visitas_perfil,
      conteudos_seguidores,
      conteudos_budget,
      incubadora_alcance,
      incubadora_leads,
      incubadora_mql,
      incubadora_sql,
      incubadora_budget,
      ebook_alcance,
      ebook_leads,
      ebook_mql,
      ebook_sql,
      ebook_budget,
      synced_at: syncedAt,
    });
  }
  return results;
}

function parseRoasFechos(lines: string[]) {
  const results: Record<string, unknown>[] = [];
  const syncedAt = new Date().toISOString();
  const year = 2026;

  const monthCols: { month: string; col: number }[] = [
    { month: "Jan", col: 1  },
    { month: "Fev", col: 2  },
    { month: "Mar", col: 3  },
    { month: "Abr", col: 4  },
    { month: "Mai", col: 5  },
    { month: "Jun", col: 6  },
    { month: "Jul", col: 7  },
    { month: "Ago", col: 8  },
    { month: "Set", col: 9  },
    { month: "Out", col: 10 },
    { month: "Nov", col: 11 },
    { month: "Dez", col: 12 },
  ];

  let receitaRowIdx: number | null = null;
  let fechosRowIdx: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const cols = parseCols(lines[i]);
    const colA = clean(cols[0]).toLowerCase();
    if (colA.includes("receita") && colA.includes("fecha")) receitaRowIdx = i;
    if (colA === "fechos") fechosRowIdx = i;
    if (receitaRowIdx !== null && fechosRowIdx !== null) break;
  }

  if (receitaRowIdx === null || fechosRowIdx === null) return results;

  const receitaCols = parseCols(lines[receitaRowIdx]);
  const fechosCols = parseCols(lines[fechosRowIdx]);

  for (const { month, col } of monthCols) {
    const receita_fechada = parseNum(receitaCols[col]);
    const fechos = parseNum(fechosCols[col]);
    if (receita_fechada === null && fechos === null) continue;
    results.push({ month_name: month, year, receita_fechada, fechos, synced_at: syncedAt });
  }
  return results;
}

function parsePlaceholder(_lines: string[]): never[] { return []; }

export async function POST() {
  try {
    const supabase = createAdminClient();

    const [
      closerIncubadoraRows,
      sdrIncubadoraRows,
      closerServicosRows,
      sdrServicosRows,
      bdrRows,
      callTrackingRows,
      vendasFunnilRows,
      chamadasFunnilRows,
      metasRows,
      lossRows,
      refundsRows,
      marketingMensalRows,
      marketingSemanalRows,
      roasRows,
    ] = await Promise.all([
      fetchAndParse(COMERCIAL_SHEET_ID, GIDS.dailyCloserIncubadora, parseCloserSheet("incubadora")),
      fetchAndParse(COMERCIAL_SHEET_ID, GIDS.dailySdrIncubadora, parseSdrSheet("incubadora")),
      fetchAndParse(COMERCIAL_SHEET_ID, GIDS.dailyCloserServicos, parseCloserSheet("servicos")),
      fetchAndParse(COMERCIAL_SHEET_ID, GIDS.dailySdrServicos, parseSdrSheet("servicos")),
      fetchAndParse(COMERCIAL_SHEET_ID, GIDS.dailyOutboundBdr, parseBdrSheet),
      fetchAndParse(COMERCIAL_SHEET_ID, GIDS.rastreamentoCalls, parseCallTracking),
      fetchAndParse(COMERCIAL_SHEET_ID, GIDS.vendasPorFunnil, parseVendasFunnil),
      fetchAndParse(COMERCIAL_SHEET_ID, GIDS.chamadasPorFunnil, parseChamadasFunnil),
      fetchAndParse(COMERCIAL_SHEET_ID, GIDS.ajusteMeta, parseAjusteMeta),
      fetchAndParse(COMERCIAL_SHEET_ID, GIDS.motivoDeLoss, parseMotivoLoss),
      fetchAndParse(COMERCIAL_SHEET_ID, GIDS.refundsOte, parseRefunds),
      fetchAndParse(MARKETING_SHEET_ID, GIDS.dadosPorMes, parseMarketingMensal),
      fetchAndParse(MARKETING_SHEET_ID, GIDS.dadosPorSemana, parseMarketingSemanal),
      fetchAndParse(MARKETING_SHEET_ID, GIDS.roasFechos, parseRoasFechos),
    ]);

    const refundsResult = await supabase
      .from("commercial_refunds")
      .upsert(refundsRows, { onConflict: "data_fecho,nome_cliente,produto" });

    if (refundsResult.error) {
      console.error("REFUNDS ERROR:", JSON.stringify(refundsResult.error));
    }

    await Promise.all([
      supabase.from("commercial_closer_metrics").upsert(closerIncubadoraRows, { onConflict: "month_name,year,funnel,closer_name" }),
      supabase.from("commercial_closer_metrics").upsert(closerServicosRows, { onConflict: "month_name,year,funnel,closer_name" }),
      supabase.from("commercial_sdr_metrics").upsert(sdrIncubadoraRows, { onConflict: "month_name,year,funnel,sdr_name" }),
      supabase.from("commercial_sdr_metrics").upsert(sdrServicosRows, { onConflict: "month_name,year,funnel,sdr_name" }),
      supabase.from("commercial_bdr_metrics").upsert(bdrRows, { onConflict: "month_name,year,bdr_name" }),
      supabase.from("commercial_call_tracking").upsert(callTrackingRows, { onConflict: "month_name,year" }),
      supabase.from("commercial_sales_by_funnel").upsert(vendasFunnilRows, { onConflict: "month_name,year,funnel_name,sale_type" }),
      supabase.from("commercial_calls_by_funnel").upsert(chamadasFunnilRows, { onConflict: "month_name,year,funnel_name" }),
      supabase.from("commercial_monthly_targets").upsert(metasRows, { onConflict: "month_name,year" }),
      supabase.from("commercial_loss_reasons").upsert(lossRows, { onConflict: "role,reason,month_name,year" }),
      supabase.from("marketing_funnel_monthly").upsert(marketingMensalRows, { onConflict: "month_name,year,funnel" }),
      supabase.from("marketing_funnel_weekly").upsert(marketingSemanalRows, { onConflict: "week_start" }),
      supabase.from("marketing_roas_monthly").upsert(roasRows, { onConflict: "month_name,year" }),
    ]);

    return NextResponse.json({
      ok: true,
      synced: {
        closer_incubadora: closerIncubadoraRows.length,
        closer_servicos: closerServicosRows.length,
        sdr_incubadora: sdrIncubadoraRows.length,
        sdr_servicos: sdrServicosRows.length,
        bdr: bdrRows.length,
        call_tracking: callTrackingRows.length,
        vendas_funnil: vendasFunnilRows.length,
        chamadas_funnil: chamadasFunnilRows.length,
        metas: metasRows.length,
        loss_reasons: lossRows.length,
        refunds: refundsRows.length,
        marketing_mensal: marketingMensalRows.length,
        marketing_semanal: marketingSemanalRows.length,
        roas: roasRows.length,
      }
    });

  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
