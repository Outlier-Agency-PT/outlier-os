import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import {
  SHEET_CONFIGS,
  parseSheet,
  type ParsedCliente,
} from "@/lib/parsers/financial-clientes-parser";

export const dynamic = "force-dynamic";

const SPREADSHEET_ID = "1kaQFN1nhv9mY3nEV4cUH_uKkydh1X3L4Xg57Vfzwqqw";
const ANO = 2026;

// ── Google Sheets client ─────────────────────────────────────────────────────

function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error("Google service account credentials not configured");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: rawKey.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
}

async function fetchSheet(
  sheets: ReturnType<typeof google.sheets>,
  sheetName: string
): Promise<string[][]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A1:BZ`,
    valueRenderOption: "FORMATTED_VALUE",
  });
  return (res.data.values ?? []).map((row) => row.map(String));
}

// ── Sync one sheet into Supabase ─────────────────────────────────────────────

async function syncSheet(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parsed: ParsedCliente[],
  sheetName: string
): Promise<{ clientes: number; pagamentos: number; errors: string[] }> {
  const errors: string[] = [];
  let clienteCount = 0;
  let pagamentoCount = 0;

  for (const { cliente, pagamentos } of parsed) {
    // Upsert cliente
    const { data: upserted, error: clienteErr } = await supabase
      .from("financial_clientes")
      .upsert(
        {
          sheet_name: cliente.sheet_name,
          data: cliente.data,
          plataforma: cliente.plataforma,
          vendedor: cliente.vendedor,
          cliente: cliente.cliente,
          contrato_enviado: cliente.contrato_enviado,
          contrato_assinado: cliente.contrato_assinado,
          link_contrato: cliente.link_contrato,
          contrato: cliente.contrato,
          servico: cliente.servico,
          contactos: cliente.contactos,
          notas: cliente.notas,
          total_faturado: cliente.total_faturado,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "sheet_name,cliente" }
      )
      .select("id")
      .single();

    if (clienteErr || !upserted) {
      errors.push(`[${sheetName}] cliente "${cliente.cliente}": ${clienteErr?.message ?? "no id returned"}`);
      continue;
    }

    clienteCount++;
    const clienteId = upserted.id;

    // Filter out months with no billing data at all
    const activePagamentos = pagamentos.filter(
      (p) =>
        p.fatura !== null ||
        p.valor !== null ||
        p.pagamento !== null ||
        p.data_pagamento !== null
    );

    if (activePagamentos.length === 0) continue;

    const { error: pagErr } = await supabase.from("financial_clientes_pagamentos").upsert(
      activePagamentos.map((p) => ({
        cliente_id: clienteId,
        mes: p.mes,
        ano: p.ano,
        fatura: p.fatura,
        data_pagamento: p.data_pagamento,
        valor: p.valor,
        pagamento: p.pagamento,
        sdr: p.sdr,
        closer: p.closer,
      })),
      { onConflict: "cliente_id,mes,ano" }
    );

    if (pagErr) {
      errors.push(`[${sheetName}] pagamentos for "${cliente.cliente}": ${pagErr.message}`);
    } else {
      pagamentoCount += activePagamentos.length;
    }
  }

  return { clientes: clienteCount, pagamentos: pagamentoCount, errors };
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST() {
  try {
    // Auth: require admin
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (!member || member.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Fetch all 7 sheets in parallel
    const sheets = getSheetsClient();
    const rawSheets = await Promise.all(
      SHEET_CONFIGS.map((cfg) => fetchSheet(sheets, cfg.name))
    );

    // Parse all sheets
    const allParsed = SHEET_CONFIGS.map((cfg, i) =>
      parseSheet(cfg.name, rawSheets[i], cfg, ANO)
    );

    // Sync each sheet sequentially (upserts depend on cliente id from previous step)
    const summary: Record<string, { clientes: number; pagamentos: number }> = {};
    const allErrors: string[] = [];

    for (let i = 0; i < SHEET_CONFIGS.length; i++) {
      const cfg = SHEET_CONFIGS[i];
      const result = await syncSheet(supabase, allParsed[i], cfg.name);
      summary[cfg.name] = { clientes: result.clientes, pagamentos: result.pagamentos };
      allErrors.push(...result.errors);
    }

    return NextResponse.json({
      ok: true,
      summary,
      errors: allErrors.length > 0 ? allErrors : undefined,
    });
  } catch (err) {
    console.error("[sync-financial-clientes]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
