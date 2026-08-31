import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ROADMAP_LIST_ID = "00000000-0000-0000-0000-000000000021";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (member?.role !== "admin") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const { action, rejected_reason } = body;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: suggestion, error: fetchErr } = await admin
    .from("suggestions")
    .select("id, title, description, author_id, status")
    .eq("id", id)
    .single();

  if (fetchErr || !suggestion) {
    return NextResponse.json({ error: "Sugestão não encontrada" }, { status: 404 });
  }

  if (suggestion.status !== "pending") {
    return NextResponse.json({ error: "Sugestão já foi processada" }, { status: 409 });
  }

  if (action === "approve") {
    // Get default open status
    const { data: openStatus } = await admin
      .from("task_statuses")
      .select("id")
      .eq("key", "aberto")
      .maybeSingle();

    const { data: task, error: taskErr } = await admin
      .from("tasks")
      .insert({
        title: suggestion.title,
        description: suggestion.description,
        list_id: ROADMAP_LIST_ID,
        source: "suggestion",
        status_id: openStatus?.id ?? null,
        priority: "sem_prioridade",
      })
      .select("id")
      .single();

    if (taskErr) return NextResponse.json({ error: taskErr.message }, { status: 500 });

    await admin
      .from("suggestions")
      .update({ status: "approved", task_id: task.id, updated_at: new Date().toISOString() })
      .eq("id", id);

    await admin.from("notifications").insert({
      user_id: suggestion.author_id,
      type: "suggestion_approved",
      title: "A tua sugestão foi aprovada!",
      body: suggestion.title,
      link: `/tarefas?taskId=${task.id}&list=${ROADMAP_LIST_ID}`,
    });
  } else {
    await admin
      .from("suggestions")
      .update({
        status: "rejected",
        rejected_reason: rejected_reason?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    await admin.from("notifications").insert({
      user_id: suggestion.author_id,
      type: "suggestion_rejected",
      title: "A tua sugestão não foi aprovada",
      body: rejected_reason?.trim()
        ? `${suggestion.title} — ${rejected_reason.trim()}`
        : suggestion.title,
      link: "/dashboard",
    });
  }

  return NextResponse.json({ success: true });
}
