import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { parseFluxo } from "@/lib/parsers/financial-fluxo-parser";

export const dynamic = "force-dynamic";

const SPREADSHEET_ID = process.env.GOOGLE_FINANCEIRO_FLUXO_ID!;
const SHEET_NAME = "Fluxo de Caixa 2026";

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

    // Fetch sheet
    const sheets = getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A1:P`,
      valueRenderOption: "FORMATTED_VALUE",
    });
    const rawRows = (res.data.values ?? []).map((row) => row.map(String));

    // Parse
    const rows = parseFluxo(rawRows);

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, synced: 0 });
    }

    // Upsert
    const { error } = await supabase.from("financial_fluxo_caixa").upsert(
      rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })),
      { onConflict: "row_number" }
    );

    if (error) {
      console.error("[sync-financial-fluxo] upsert error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, synced: rows.length });
  } catch (err) {
    console.error("[sync-financial-fluxo]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
