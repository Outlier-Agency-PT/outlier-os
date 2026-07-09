import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWeekStart, getCheckpointStatus } from "@/lib/queries/checkpoints";

export const dynamic = "force-dynamic";

const DANIEL_UUID = "1c8bcc1b-d22b-4479-a6f2-534516742842";

// Chamado às 8h30 de sexta-feira via Vercel Cron / n8n.
// Envia ao admin um resumo de quem submeteu e quem não submeteu.
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekStart = getCurrentWeekStart();
  const statuses = await getCheckpointStatus(weekStart);

  const submitted = statuses.filter((s) => s.submitted).map((s) => s.full_name);
  const pending = statuses.filter((s) => !s.submitted).map((s) => s.full_name);

  const submittedText = submitted.length > 0 ? submitted.join(", ") : "nenhum";
  const pendingText = pending.length > 0 ? pending.join(", ") : "nenhum";

  const supabase = createAdminClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: DANIEL_UUID,
    type: "checkpoint_summary",
    title: "Resumo Checkpoints — Reunião de hoje",
    body: `Submeteram: ${submittedText}. Pendentes: ${pendingText}.`,
    link: "/dashboard",
    read: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ submitted: submitted.length, pending: pending.length });
}
