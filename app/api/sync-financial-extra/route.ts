import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import {
  parseGraficoDespesas,
  parseGraficoPnl,
  parseObjetivoRealizado,
  parsePrevisaoAnoAnterior,
} from "@/lib/parsers/financial-extra-parser";

export const dynamic = "force-dynamic";

const SPREADSHEET_ID = process.env.GOOGLE_FINANCEIRO_FLUXO_ID!;

const SHEET_NAMES = {
  despesas: "Gráfico Despesas_26",
  pnl: "Gráfico PnL",
  objetivo: "Objetivo Vs Realizado",
  previsao: "Previsão Comparativamente Ano Anterior",
} as const;

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
    range: `'${sheetName}'`,
    valueRenderOption: "FORMATTED_VALUE",
  });
  return (res.data.values ?? []).map((row) => row.map(String));
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

    // Fetch all 4 sheets in parallel
    const sheets = getSheetsClient();
    const [rawDespesas, rawPnl, rawObjetivo, rawPrevisao] = await Promise.all([
      fetchSheet(sheets, SHEET_NAMES.despesas),
      fetchSheet(sheets, SHEET_NAMES.pnl),
      fetchSheet(sheets, SHEET_NAMES.objetivo),
      fetchSheet(sheets, SHEET_NAMES.previsao),
    ]);

    // Parse
    const despesas = parseGraficoDespesas(rawDespesas);
    const pnl = parseGraficoPnl(rawPnl);
    const objetivo = parseObjetivoRealizado(rawObjetivo);
    const previsao = parsePrevisaoAnoAnterior(rawPrevisao);

    const now = new Date().toISOString();
    const errors: string[] = [];

    // Deduplicate parsed rows before upserting
    const dedupBy = <T>(rows: T[], key: keyof T): T[] =>
      Array.from(
        rows.reduce((map, row) => { map.set(row[key], row); return map; }, new Map<T[keyof T], T>()).values()
      );

    const dedupedDespesas = dedupBy(despesas, "categoria" as keyof (typeof despesas)[number]);
    const dedupedPnl = dedupBy(pnl, "metrica" as keyof (typeof pnl)[number]);
    const dedupedObjetivo = dedupBy(objetivo, "metrica" as keyof (typeof objetivo)[number]);
    const dedupedPrevisao = dedupBy(previsao, "metrica" as keyof (typeof previsao)[number]);

    // Upsert financial_grafico_despesas
    if (dedupedDespesas.length > 0) {
      const { error } = await supabase
        .from("financial_grafico_despesas")
        .upsert(
          dedupedDespesas.map((r) => ({ ...r, updated_at: now })),
          { onConflict: "categoria" }
        );
      if (error) errors.push(`[despesas] ${error.message}`);
    }

    // Upsert financial_grafico_pnl
    if (dedupedPnl.length > 0) {
      const { error } = await supabase
        .from("financial_grafico_pnl")
        .upsert(
          dedupedPnl.map((r) => ({ ...r, updated_at: now })),
          { onConflict: "metrica" }
        );
      if (error) errors.push(`[pnl] ${error.message}`);
    }

    // Upsert financial_objetivo_realizado
    if (dedupedObjetivo.length > 0) {
      const { error } = await supabase
        .from("financial_objetivo_realizado")
        .upsert(
          dedupedObjetivo.map((r) => ({ ...r, updated_at: now })),
          { onConflict: "metrica" }
        );
      if (error) errors.push(`[objetivo] ${error.message}`);
    }

    // Upsert financial_previsao_ano_anterior
    if (dedupedPrevisao.length > 0) {
      const { error } = await supabase
        .from("financial_previsao_ano_anterior")
        .upsert(
          dedupedPrevisao.map((r) => ({ ...r, updated_at: now })),
          { onConflict: "metrica" }
        );
      if (error) errors.push(`[previsao] ${error.message}`);
    }

    return NextResponse.json({
      ok: true,
      summary: {
        [SHEET_NAMES.despesas]: dedupedDespesas.length,
        [SHEET_NAMES.pnl]: dedupedPnl.length,
        [SHEET_NAMES.objetivo]: dedupedObjetivo.length,
        [SHEET_NAMES.previsao]: dedupedPrevisao.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("[sync-financial-extra]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
