"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const generateSchema = z.object({
  client_id: z.string().uuid(),
  type: z.enum(["semanal", "mensal"]),
  period_start: z.string(),
  period_end: z.string(),
});

export async function generateReportAction(input: z.infer<typeof generateSchema>) {
  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Não autenticado"] } };

  const { client_id, type, period_start, period_end } = parsed.data;

  // Buscar dados agregados em paralelo
  const [
    { data: client },
    { data: closedTaskStatus },
    { data: publishedContentStatus },
  ] = await Promise.all([
    supabase.from("clients").select("name").eq("id", client_id).maybeSingle(),
    supabase.from("task_statuses").select("id").eq("key", "concluido").maybeSingle(),
    supabase.from("content_statuses").select("id").eq("key", "publicado").maybeSingle(),
  ]);

  const closedStatusId = (closedTaskStatus as { id: string } | null)?.id;
  const publishedStatusId = (publishedContentStatus as { id: string } | null)?.id;

  const [tasksClosed, tasksCreated, tasksInProgress, contentsPublished, launchesActive] = await Promise.all([
    closedStatusId
      ? supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("client_id", client_id)
          .eq("status_id", closedStatusId)
          .gte("completed_at", period_start)
          .lte("completed_at", period_end)
      : Promise.resolve({ count: 0 }),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("client_id", client_id)
      .gte("created_at", period_start)
      .lte("created_at", period_end),
    closedStatusId
      ? supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("client_id", client_id)
          .neq("status_id", closedStatusId)
      : Promise.resolve({ count: 0 }),
    publishedStatusId
      ? supabase
          .from("contents")
          .select("*", { count: "exact", head: true })
          .eq("client_id", client_id)
          .eq("status_id", publishedStatusId)
          .gte("publish_date", period_start)
          .lte("publish_date", period_end)
      : Promise.resolve({ count: 0 }),
    supabase
      .from("launches")
      .select("*", { count: "exact", head: true })
      .eq("client_id", client_id),
  ]);

  const kpis = {
    tarefas_concluidas: tasksClosed.count ?? 0,
    tarefas_criadas: tasksCreated.count ?? 0,
    tarefas_em_progresso: tasksInProgress.count ?? 0,
    conteudos_publicados: contentsPublished.count ?? 0,
    lancamentos_ativos: launchesActive.count ?? 0,
  };

  const clientName = (client as { name: string } | null)?.name ?? "Cliente";
  const reportTitle = type === "semanal" ? "Relatório Semanal" : "Relatório Mensal";

  const md = `# ${reportTitle} — ${clientName}
**Período:** ${period_start} a ${period_end}

## Tarefas
- **Concluídas:** ${kpis.tarefas_concluidas}
- **Criadas:** ${kpis.tarefas_criadas}
- **Em progresso:** ${kpis.tarefas_em_progresso}

## Conteúdo
- **Publicados no período:** ${kpis.conteudos_publicados}
- **Lançamentos ativos:** ${kpis.lancamentos_ativos}

## Próximos Passos
- Definir prioridades para o próximo período
- Rever objetivos e alinhamento de estratégia
`;

  const { data, error } = await supabase
    .from("reports")
    .insert({
      client_id,
      type,
      status: "rascunho",
      period_start,
      period_end,
      kpis,
      content_md: md,
      generated_by: user.id,
    })
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };

  revalidatePath("/relatorios");
  return { data };
}

export async function updateReportContentAction(id: string, content_md: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("reports").update({ content_md }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/relatorios/${id}`);
  return { success: true };
}

export async function publishReportAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({ status: "publicado", published_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/relatorios");
  revalidatePath(`/relatorios/${id}`);
  return { success: true };
}

export async function unpublishReportAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({ status: "rascunho", published_at: null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/relatorios");
  return { success: true };
}

export async function deleteReportAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("reports").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/relatorios");
  return { success: true };
}
