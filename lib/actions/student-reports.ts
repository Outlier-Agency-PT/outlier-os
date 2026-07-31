"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { ReportSnapshot } from "@/lib/queries/student-reports";

const generateSchema = z.object({
  student_id: z.string().uuid(),
  title: z.string().min(1, "Título obrigatório"),
  period_start: z.string().min(1, "Data de início obrigatória"),
  period_end: z.string().min(1, "Data de fim obrigatória"),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d.includes("T") ? d : d + "T00:00:00").toLocaleDateString("pt-PT");
}

function fmt(v: number | null | undefined, suffix = ""): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-PT") + suffix;
}

function pct(v: number | null | undefined): string {
  if (v == null) return "—";
  return (v * 100).toFixed(1) + "%";
}

// ── Main action ───────────────────────────────────────────────────────────────

export async function generateStudentReportAction(
  input: z.infer<typeof generateSchema>
) {
  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Não autenticado"] } };

  const { student_id, title, period_start, period_end } = parsed.data;
  const periodEndFull = period_end + "T23:59:59";

  // ── Fetch all data in parallel ────────────────────────────────────────────

  const [
    { data: student },
    { data: sessions },
    { data: checklist },
    { data: allNotes },
    { data: revenueHistory },
    { data: briefingData },
    { data: launches },
    { data: products },
    { data: diary },
    { data: meetings },
  ] = await Promise.all([
    supabase
      .from("students")
      .select(`*, coach:team_members!students_coach_id_fkey(id, full_name)`)
      .eq("id", student_id)
      .maybeSingle(),
    supabase
      .from("student_sessions")
      .select(`*, type:student_session_types(key, label)`)
      .eq("student_id", student_id)
      .order("type"),
    supabase
      .from("student_checklist")
      .select("*")
      .eq("student_id", student_id)
      .maybeSingle(),
    supabase
      .from("student_notes")
      .select(`id, contact_type, content, involvement, motivation, created_at, reminder_date, reminder_note, author:team_members!student_notes_author_id_fkey(full_name)`)
      .eq("student_id", student_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("student_revenue_history")
      .select("value, recorded_at, note")
      .eq("student_id", student_id)
      .order("recorded_at", { ascending: false }),
    supabase
      .from("student_briefings")
      .select("negocio, objecoes, is_complete, review_status")
      .eq("student_id", student_id)
      .maybeSingle(),
    supabase
      .from("student_launches")
      .select(`
        id, title, type, status, launch_date, start_date, end_date,
        goal, notes, channels, promise, sub_promise, ticket,
        budget_distribuicao, budget_captacao, budget_antecipacao, budget_remarketing,
        sales_goal_1_count, sales_goal_1_revenue,
        sales_goal_2_count, sales_goal_2_revenue,
        completed_at, created_at,
        debrief:student_launch_debriefs(
          investimento_total,
          leads_totais, visitantes_pagina,
          ao_vivo_maximo, ao_vivo_estavel,
          total_vendas, vendas_dia_evento,
          receita_liquida_fase_venda,
          downsell_vendas, downsell_receita_liquida,
          leads_wpp, referencias_geradas,
          observacoes
        )
      `)
      .eq("student_id", student_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("student_products")
      .select(`
        id, name, description, price, product_type, value_ladder_position,
        promise, product_status, is_archived, garantia,
        beneficios, bonus
      `)
      .eq("student_id", student_id)
      .order("value_ladder_position", { ascending: true }),
    supabase
      .from("student_diary")
      .select("id, content, created_at, updated_at")
      .eq("student_id", student_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("meetings")
      .select(`id, title, scheduled_at, duration_minutes, location, agenda_md, notes_md, meeting_students!inner(student_id)`)
      .eq("meeting_students.student_id", student_id)
      .order("scheduled_at", { ascending: false }),
  ]);

  if (!student) return { error: { _form: ["Aluno não encontrado"] } };

  const s = student as any;
  const coachName = (s.coach as any)?.full_name ?? "Sem coach";

  // ── Derived values ────────────────────────────────────────────────────────

  const sessionsList = (sessions ?? []) as any[];
  const sessionsCompleted = sessionsList.filter((ss) => ss.completed_at).length;

  const cl = checklist as any;
  const checklistDefs = [
    { key: "has_strategy_session",  label: "Sessão de estratégia",   group: "Setup" },
    { key: "has_business_briefing", label: "Briefing de negócio",     group: "Setup" },
    { key: "has_mindmap",           label: "Mapa mental",             group: "Setup" },
    { key: "has_bio_link",          label: "Link na bio",              group: "Presença Digital" },
    { key: "has_organic_content",   label: "Conteúdo orgânico",       group: "Presença Digital" },
    { key: "has_instagram",         label: "Instagram configurado",    group: "Presença Digital" },
    { key: "has_launch_briefing",   label: "Briefing de lançamento",  group: "Lançamento" },
    { key: "has_capture_page",      label: "Página de captura",       group: "Lançamento" },
    { key: "has_leads_goal",        label: "Meta de leads definida",  group: "Lançamento" },
    { key: "has_ads_campaign",      label: "Campanha de anúncios",    group: "Lançamento" },
    { key: "has_launch",            label: "Lançamento realizado",    group: "Lançamento" },
    { key: "has_debrief",           label: "Debrief realizado",       group: "Lançamento" },
  ];
  const checklistTotal = cl ? checklistDefs.length : 0;
  const checklistCompleted = cl ? checklistDefs.filter((d) => cl[d.key]).length : 0;

  const allNotesList   = (allNotes ?? []) as any[];
  const notesInPeriod  = allNotesList.filter(
    (n) => n.created_at >= period_start && n.created_at <= periodEndFull
  );

  const revenueHistoryList = (revenueHistory ?? []) as any[];
  const revenueGenerated   = s.revenue_generated ?? 0;
  const investmentBudget   = s.investment_budget ?? 0;
  const roi = investmentBudget > 0 ? revenueGenerated / investmentBudget : null;

  const briefing = briefingData as any;

  const launchesList      = (launches ?? []) as any[];
  const launchesCompleted = launchesList.filter((l) => l.status === "concluido").length;
  const launchesWithDebrief = launchesList.filter((l) => (l.debrief ?? []).length > 0).length;

  const productsList  = (products ?? []) as any[];
  const productsActive = productsList.filter((p) => p.product_status === "activo" && !p.is_archived);

  const diaryList    = (diary ?? []) as any[];
  const allMeetings  = (meetings ?? []) as any[];
  const meetingsInPeriod = allMeetings.filter(
    (m) => m.scheduled_at >= period_start && m.scheduled_at <= periodEndFull
  );

  // ── Build full structured snapshot ────────────────────────────────────────

  const snapshot: ReportSnapshot = {
    student: {
      name: s.name,
      email: s.email ?? null,
      phone: s.phone ?? null,
      instagram: s.instagram ?? null,
      level: s.level,
      status: s.status,
      turma: s.turma ?? null,
      entry_type: s.entry_type ?? null,
      nicho: s.nicho ?? null,
      subnicho: s.subnicho ?? null,
      priority: s.priority ?? null,
      coach_name: coachName,
      start_date: s.start_date ?? null,
      end_date: s.end_date ?? null,
      revenue_generated: revenueGenerated,
      investment_budget: investmentBudget,
      revenue_goal: s.revenue_goal ?? null,
      renewal_status: s.renewal_status,
      renewal_date: s.renewal_date ?? null,
      renewal_notes: s.renewal_notes ?? null,
      renewal_decided_at: s.renewal_decided_at ?? null,
    },

    aggregate: {
      sessions_total: sessionsList.length,
      sessions_completed: sessionsCompleted,
      checklist_completed: checklistCompleted,
      checklist_total: checklistTotal,
      notes_total: allNotesList.length,
      notes_in_period: notesInPeriod.length,
      revenue_generated: revenueGenerated,
      investment_budget: investmentBudget,
      roi: roi !== null ? Math.round(roi * 100) / 100 : null,
      products_total: productsList.length,
      products_active: productsActive.length,
      launches_total: launchesList.length,
      launches_completed: launchesCompleted,
      launches_with_debrief: launchesWithDebrief,
      diary_entries: diaryList.length,
      meetings_total: allMeetings.length,
      meetings_in_period: meetingsInPeriod.length,
    },

    sessions: sessionsList.map((ss) => ({
      label: ss.type?.label ?? ss.type_id,
      completed: !!ss.completed_at,
      completed_at: ss.completed_at ?? null,
    })),

    checklist: cl
      ? checklistDefs.map((d) => ({ group: d.group, label: d.label, done: !!cl[d.key] }))
      : null,
    checklist_notes: cl?.notes ?? null,

    revenue_history: revenueHistoryList.map((r) => ({
      date: r.recorded_at,
      value: r.value,
      note: r.note ?? null,
    })),

    briefing: briefing
      ? {
          is_complete: briefing.is_complete,
          review_status: briefing.review_status ?? null,
          negocio: briefing.negocio ?? null,
          objecoes: briefing.objecoes ?? [],
        }
      : null,

    products: productsList.map((p) => ({
      name: p.name,
      product_type: p.product_type ?? null,
      product_status: p.product_status,
      price: p.price ?? null,
      is_archived: p.is_archived,
      value_ladder_position: p.value_ladder_position ?? null,
      promise: p.promise ?? null,
      description: p.description ?? null,
      beneficios: (p.beneficios ?? []).map((b: any) => (typeof b === "string" ? b : JSON.stringify(b))),
      bonus: (p.bonus ?? []).map((b: any) => (typeof b === "string" ? b : JSON.stringify(b))),
    })),

    launches: launchesList.map((l) => {
      const debrief = (l.debrief ?? [])[0] ?? null;
      const budgetTotal =
        (l.budget_distribuicao ?? 0) +
        (l.budget_captacao ?? 0) +
        (l.budget_antecipacao ?? 0) +
        (l.budget_remarketing ?? 0);
      return {
        title: l.title,
        type: l.type ?? null,
        status: l.status,
        launch_date: l.launch_date ?? null,
        start_date: l.start_date ?? null,
        end_date: l.end_date ?? null,
        goal: l.goal ?? null,
        ticket: l.ticket ?? null,
        channels: l.channels ?? [],
        promise: l.promise ?? null,
        budget_total: budgetTotal,
        sales_goal_1_count: l.sales_goal_1_count ?? null,
        sales_goal_1_revenue: l.sales_goal_1_revenue ?? null,
        sales_goal_2_count: l.sales_goal_2_count ?? null,
        sales_goal_2_revenue: l.sales_goal_2_revenue ?? null,
        debrief: debrief
          ? {
              investimento_total: debrief.investimento_total ?? null,
              leads_totais: debrief.leads_totais ?? null,
              visitantes_pagina: debrief.visitantes_pagina ?? null,
              total_vendas: debrief.total_vendas ?? null,
              receita_liquida_fase_venda: debrief.receita_liquida_fase_venda ?? null,
              downsell_receita_liquida: debrief.downsell_receita_liquida ?? null,
              ao_vivo_estavel: debrief.ao_vivo_estavel ?? null,
              ao_vivo_maximo: debrief.ao_vivo_maximo ?? null,
              leads_wpp: debrief.leads_wpp ?? null,
              referencias_geradas: debrief.referencias_geradas ?? null,
              downsell_vendas: debrief.downsell_vendas ?? null,
              observacoes: debrief.observacoes ?? null,
            }
          : null,
      };
    }),

    notes_in_period: notesInPeriod.map((n) => ({
      date: n.created_at,
      contact_type: n.contact_type,
      content: n.content,
      author: (n.author as any)?.full_name ?? "—",
      involvement: n.involvement ?? null,
      motivation: n.motivation ?? null,
      reminder_date: n.reminder_date ?? null,
      reminder_note: n.reminder_note ?? null,
    })),

    notes_history: allNotesList
      .filter((n) => !(n.created_at >= period_start && n.created_at <= periodEndFull))
      .map((n) => ({
        date: n.created_at,
        contact_type: n.contact_type,
        content_preview:
          n.content.length > 160 ? n.content.slice(0, 160) + "…" : n.content,
        author: (n.author as any)?.full_name ?? "—",
      })),

    diary: diaryList.map((d) => ({
      date: d.created_at,
      content: d.content,
      updated_at: d.updated_at,
    })),

    meetings_in_period: meetingsInPeriod.map((m) => ({
      title: m.title,
      date: m.scheduled_at,
      duration_minutes: m.duration_minutes ?? null,
      location: m.location ?? null,
      agenda_md: m.agenda_md ?? null,
      notes_md: m.notes_md ?? null,
    })),

    other_meetings: allMeetings
      .filter((m) => !(m.scheduled_at >= period_start && m.scheduled_at <= periodEndFull))
      .map((m) => ({
        title: m.title,
        date: m.scheduled_at,
        duration_minutes: m.duration_minutes ?? null,
      })),
  };

  // ── Build markdown (for PDF export) ──────────────────────────────────────

  const levelLabels: Record<string, string> = {
    aprendiz: "Aprendiz", fazedor: "Fazedor", referencia: "Referência", suspenso: "Suspenso",
  };
  const renewalLabels: Record<string, string> = {
    pendente: "Pendente", renovado: "Renovado", nao_renovado: "Não Renovado", bonus: "Bónus",
  };
  const statusLaunch: Record<string, string> = {
    planeado: "Planeado", em_curso: "Em curso", concluido: "Concluído", cancelado: "Cancelado",
  };
  const priorityLabel: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

  let md = `# ${title}\n\n`;
  md += `**Período:** ${fmtDate(period_start)} → ${fmtDate(period_end)}\n\n`;
  md += `**Gerado em:** ${new Date().toLocaleDateString("pt-PT")}\n\n`;

  md += `---\n\n## 1. Identificação\n\n`;
  md += `| Campo | Valor |\n|---|---|\n`;
  md += `| Nome | ${s.name} |\n`;
  if (s.email) md += `| Email | ${s.email} |\n`;
  if (s.phone) md += `| Telefone | ${s.phone} |\n`;
  if (s.instagram) md += `| Instagram | @${s.instagram} |\n`;
  md += `| Nível | ${levelLabels[s.level] ?? s.level} |\n`;
  md += `| Status | ${s.status} |\n`;
  if (s.turma) md += `| Turma | ${s.turma} |\n`;
  if (s.entry_type) md += `| Tipo de entrada | ${s.entry_type} |\n`;
  if (s.nicho) md += `| Nicho | ${s.nicho} |\n`;
  if (s.subnicho) md += `| Subnicho | ${s.subnicho} |\n`;
  if (s.priority) md += `| Prioridade | ${priorityLabel[s.priority] ?? s.priority} |\n`;
  md += `| Coach | ${coachName} |\n`;
  if (s.start_date) md += `| Início | ${fmtDate(s.start_date)} |\n`;
  if (s.end_date) md += `| Fim | ${fmtDate(s.end_date)} |\n`;
  md += `\n`;

  md += `## 2. Renovação\n\n`;
  md += `| Campo | Valor |\n|---|---|\n`;
  md += `| Status | ${renewalLabels[s.renewal_status] ?? s.renewal_status} |\n`;
  if (s.renewal_date) md += `| Data prevista | ${fmtDate(s.renewal_date)} |\n`;
  if (s.renewal_decided_at) md += `| Decisão em | ${fmtDate(s.renewal_decided_at)} |\n`;
  if (s.renewal_notes) md += `| Notas | ${s.renewal_notes} |\n`;
  md += `\n`;

  if (briefing?.negocio) {
    const n = briefing.negocio as any;
    const objecoes = (briefing.objecoes ?? []) as any[];
    md += `## 3. Briefing do Negócio\n\n`;
    if (n.nome_negocio) md += `**Nome:** ${n.nome_negocio}\n\n`;
    if (n.nicho) md += `**Nicho:** ${n.nicho}\n\n`;
    if (n.proposta_valor) md += `**Proposta de valor:** ${n.proposta_valor}\n\n`;
    if (n.diferencial) md += `**Diferencial:** ${n.diferencial}\n\n`;
    if (n.historia) md += `**História:** ${n.historia}\n\n`;
    if (n.publico_alvo) md += `**Público-alvo:** ${n.publico_alvo}\n\n`;
    if (n.transformacao_entregue) md += `**Transformação:** ${n.transformacao_entregue}\n\n`;
    if ((n.dores_resolvidas ?? []).length > 0) {
      md += `**Dores resolvidas:**\n`;
      for (const d of n.dores_resolvidas) md += `- ${d}\n`;
      md += `\n`;
    }
    if ((n.objetivos ?? []).length > 0) {
      md += `**Objetivos:**\n`;
      for (const o of n.objetivos) md += `- [${priorityLabel[o.prioridade] ?? o.prioridade}] ${o.descricao}\n`;
      md += `\n`;
    }
    if (n.swot) {
      md += `**SWOT — Forças:** ${(n.swot.forcas ?? []).join("; ")}\n\n`;
      md += `**SWOT — Fraquezas:** ${(n.swot.fraquezas ?? []).join("; ")}\n\n`;
    }
    if (objecoes.length > 0) {
      md += `**Objeções:**\n`;
      for (const o of objecoes) md += `- *${o.objecao}* → ${o.resposta}\n`;
      md += `\n`;
    }
  }

  md += `## 4. Financeiro\n\n`;
  md += `| Métrica | Valor |\n|---|---|\n`;
  md += `| Receita gerada | ${fmt(revenueGenerated, "€")} |\n`;
  md += `| Investimento | ${fmt(investmentBudget, "€")} |\n`;
  if (s.revenue_goal) md += `| Objetivo | ${fmt(s.revenue_goal, "€")} |\n`;
  md += `| ROI | ${roi !== null ? pct(roi) : "—"} |\n`;
  md += `\n`;
  if (revenueHistoryList.length > 0) {
    md += `| Data | Valor | Nota |\n|---|---|---|\n`;
    for (const r of revenueHistoryList) md += `| ${fmtDate(r.recorded_at)} | ${fmt(r.value, "€")} | ${r.note ?? "—"} |\n`;
    md += `\n`;
  }

  md += `## 5. Sessões\n\n`;
  md += `**${sessionsCompleted}/${sessionsList.length} concluídas**\n\n`;
  if (sessionsList.length > 0) {
    md += `| Sessão | Estado |\n|---|---|\n`;
    for (const ss of sessionsList) md += `| ${ss.type?.label ?? ss.type_id} | ${ss.completed_at ? "Concluída" : "Pendente"} |\n`;
    md += `\n`;
  }

  if (cl) {
    md += `## 6. Checklist\n\n**${checklistCompleted}/${checklistTotal} itens**\n\n`;
    for (const d of checklistDefs) md += `- [${cl[d.key] ? "x" : " "}] ${d.label}\n`;
    if (cl.notes) md += `\nNotas: ${cl.notes}\n`;
    md += `\n`;
  }

  if (productsList.length > 0) {
    md += `## 7. Produtos\n\n`;
    md += `| Produto | Tipo | Estado | Preço |\n|---|---|---|---|\n`;
    for (const p of productsList) {
      const archived = p.is_archived ? " (arquivado)" : "";
      md += `| ${p.name}${archived} | ${p.product_type ?? "—"} | ${p.product_status} | ${p.price != null ? fmt(p.price, "€") : "—"} |\n`;
    }
    md += `\n`;
  }

  if (launchesList.length > 0) {
    md += `## 8. Lançamentos\n\n`;
    for (const l of launchesList) {
      md += `### ${l.title}\n\n`;
      md += `| Campo | Valor |\n|---|---|\n`;
      md += `| Status | ${statusLaunch[l.status] ?? l.status} |\n`;
      if (l.ticket != null) md += `| Ticket | ${fmt(l.ticket, "€")} |\n`;
      if (l.launch_date) md += `| Data | ${fmtDate(l.launch_date)} |\n`;
      md += `\n`;
      if (l.goal) md += `**Objetivo:** ${l.goal}\n\n`;
      const debrief = (l.debrief ?? [])[0];
      if (debrief) {
        const total = (debrief.receita_liquida_fase_venda ?? 0) + (debrief.downsell_receita_liquida ?? 0);
        md += `**Debrief:** ${debrief.leads_totais ?? "—"} leads · ${debrief.total_vendas ?? "—"} vendas · ${fmt(total, "€")} receita\n\n`;
        if (debrief.observacoes) md += `*${debrief.observacoes}*\n\n`;
      }
    }
  }

  if (notesInPeriod.length > 0) {
    md += `## 9. Acompanhamento no Período\n\n`;
    for (const n of notesInPeriod) {
      md += `### ${n.contact_type} — ${fmtDate(n.created_at)} (${(n.author as any)?.full_name ?? "—"})\n\n${n.content}\n\n`;
    }
  }

  if (diaryList.length > 0) {
    md += `## 10. Diário de Bordo\n\n`;
    for (const d of diaryList) md += `### ${fmtDate(d.created_at)}\n\n${d.content}\n\n`;
  }

  if (meetingsInPeriod.length > 0) {
    md += `## 11. Reuniões no Período\n\n`;
    for (const m of meetingsInPeriod) {
      md += `### ${m.title}\n\n`;
      md += `${new Date(m.scheduled_at).toLocaleString("pt-PT")}`;
      if (m.duration_minutes) md += ` · ${m.duration_minutes} min`;
      if (m.location) md += ` · ${m.location}`;
      md += `\n\n`;
      if (m.agenda_md) md += `**Agenda:**\n\n${m.agenda_md}\n\n`;
      if (m.notes_md) md += `**Notas:**\n\n${m.notes_md}\n\n`;
    }
  }

  if (allMeetings.length > meetingsInPeriod.length) {
    const others = allMeetings.filter(
      (m) => !(m.scheduled_at >= period_start && m.scheduled_at <= periodEndFull)
    );
    md += `## 12. Outras Reuniões\n\n| Data | Reunião |\n|---|---|\n`;
    for (const m of others) md += `| ${fmtDate(m.scheduled_at)} | ${m.title} |\n`;
    md += `\n`;
  }

  if (allNotesList.length > notesInPeriod.length) {
    const hist = allNotesList.filter(
      (n) => !(n.created_at >= period_start && n.created_at <= periodEndFull)
    );
    md += `## 13. Histórico Anterior de Contactos\n\n| Data | Tipo | Autor | Sumário |\n|---|---|---|---|\n`;
    for (const n of hist) {
      const preview = n.content.length > 80 ? n.content.slice(0, 80) + "…" : n.content;
      md += `| ${fmtDate(n.created_at)} | ${n.contact_type} | ${(n.author as any)?.full_name ?? "—"} | ${preview.replace(/\n/g, " ")} |\n`;
    }
    md += `\n`;
  }

  md += `---\n\n*Relatório gerado automaticamente pelo Outlier OS · ${new Date().toLocaleString("pt-PT")}*\n`;

  // ── Insert ────────────────────────────────────────────────────────────────

  const { data, error } = await supabase
    .from("student_reports")
    .insert({
      student_id,
      generated_by: user.id,
      title,
      period_start,
      period_end,
      kpis: snapshot,
      content_md: md,
      status: "rascunho",
    })
    .select()
    .single();

  if (error) return { error: { _form: [error.message] } };

  revalidatePath(`/incubadora/${student_id}`);
  return { data };
}

// ── Publish / unpublish / delete ─────────────────────────────────────────────

export async function publishStudentReportAction(id: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_reports")
    .update({ status: "publicado", published_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/incubadora/${studentId}`);
  return { success: true };
}

export async function unpublishStudentReportAction(id: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_reports")
    .update({ status: "rascunho", published_at: null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/incubadora/${studentId}`);
  return { success: true };
}

export async function deleteStudentReportAction(id: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("student_reports").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/incubadora/${studentId}`);
  return { success: true };
}
