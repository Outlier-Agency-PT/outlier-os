import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface FeedbackPayload {
  clientId: string;
  name?: string;
  body: string;
}

export async function POST(request: Request) {
  try {
    const payload: FeedbackPayload = await request.json();
    if (!payload.clientId || !payload.body || payload.body.length > 5000) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Validar que o cliente existe e tem partilha ativa
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", payload.clientId)
      .eq("public_share_enabled", true)
      .maybeSingle();
    if (!client) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Inserir feedback
    const { error } = await supabase.from("content_feedback").insert({
      client_id: payload.clientId,
      author_name: payload.name?.slice(0, 100) ?? "Cliente",
      body: payload.body,
      is_from_client: true,
      read_by_team: false,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown" },
      { status: 500 },
    );
  }
}
