import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { parsePagamentos } from "@/lib/parsers/financial-pagamentos-parser";

export const dynamic = "force-dynamic";

const SPREADSHEET_ID = process.env.GOOGLE_FINANCEIRO_PAGAMENTOS_ID!;

const SHEET_CONFIGS = [
  { name: "Jan 26", gid: "1008523799" },
  { name: "Fev 26", gid: "1519947826" },
  { name: "Mar 26", gid: "1855903299" },
  { name: "Abr 26", gid: "159536171" },
  { name: "Mai 26", gid: "424339436" },
  { name: "Jun 26", gid: "76142745" },
  { name: "Jul 26", gid: "1165937905" },
  { name: "Ago 26", gid: "1638263969" },
  { name: "Set 26", gid: "1357423818" },
  { name: "Out 26", gid: "139433300" },
  { name: "Nov 26", gid: "1980321798" },
] as const;

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
    range: `'${sheetName}'!A1:H`,
    valueRenderOption: "FORMATTED_VALUE",
  });
  return (res.data.values ?? []).map((row) => row.map(String));
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST() {
  try {
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

    // Fetch all sheets in parallel
    const sheetsClient = getSheetsClient();
    const rawSheets = await Promise.all(
      SHEET_CONFIGS.map((cfg) => fetchSheet(sheetsClient, cfg.name))
    );

    // Parse all sheets
    const allRows = SHEET_CONFIGS.flatMap((cfg, i) =>
      parsePagamentos(cfg.name, rawSheets[i])
    );

    if (allRows.length === 0) {
      return NextResponse.json({ ok: true, summary: {}, synced: 0 });
    }

    // Deduplicate by (mes, secao, nome) — keep last occurrence
    const deduped = Array.from(
      allRows
        .reduce((map, row) => {
          map.set(`${row.mes}|${row.secao}|${row.nome}`, row);
          return map;
        }, new Map<string, (typeof allRows)[number]>())
        .values()
    );

    // Upsert in one batch
    const { error } = await supabase.from("financial_pagamentos").upsert(
      deduped.map((r) => ({ ...r, updated_at: new Date().toISOString() })),
      { onConflict: "mes,secao,nome" }
    );

    if (error) {
      console.error("[sync-financial-pagamentos] upsert error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Build per-month summary
    const summary: Record<string, number> = {};
    for (const row of deduped) {
      summary[row.mes] = (summary[row.mes] ?? 0) + 1;
    }

    return NextResponse.json({ ok: true, synced: deduped.length, summary });
  } catch (err) {
    console.error("[sync-financial-pagamentos]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
