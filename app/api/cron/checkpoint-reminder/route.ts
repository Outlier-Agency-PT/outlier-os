import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWeekStart, getCheckpointStatus } from "@/lib/queries/checkpoints";

export const dynamic = "force-dynamic";

// Chamado às 17h de quinta-feira via Vercel Cron / n8n.
// Envia notificação in-app a quem ainda não preencheu o checkpoint da semana.
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekStart = getCurrentWeekStart();
  const statuses = await getCheckpointStatus(weekStart);
  const pending = statuses.filter((s) => !s.submitted);

  if (pending.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const supabase = createAdminClient();
  const notifications = pending.map((m) => ({
    user_id: m.id,
    type: "checkpoint_reminder",
    title: "Checkpoint Semanal pendente",
    body: "Ainda não preencheste o checkpoint desta semana. Preenche antes da reunião de amanhã às 9h.",
    link: "/dashboard",
    read: false,
  }));

  const { error } = await supabase.from("notifications").insert(notifications);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sent: pending.length });
}
