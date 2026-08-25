import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamMetricsAdmin } from "@/lib/queries/team-metrics";

export const dynamic = "force-dynamic";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtMinutes(min: number): string {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fmtEstimated(h: number): string {
  if (!h) return "—";
  return h % 1 === 0 ? `${h}h` : `${Number(h.toFixed(1))}h`;
}

function fmtDueDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtDate(d: Date): string {
  const s = d.toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Email template ────────────────────────────────────────────────────────────

type GlobalMetrics = {
  tarefas_criadas: number;
  tarefas_realizadas: number;
  tarefas_em_atraso: number;
  horas_realizadas_minutos: number;
  horas_estimadas: number;
};

type MemberMetrics = {
  full_name: string;
  tarefas_criadas: number;
  tarefas_realizadas: number;
  tarefas_em_atraso: number;
  horas_realizadas_minutos: number;
  horas_estimadas: number;
};

type OverdueTask = { title: string; assignee: string; due_date: string };
type CompletedTask = { title: string; assignee: string; estimate_points: number | null };
type MissedTask = { title: string; assignee: string };
type AgendaTask = { title: string; assignee: string };

function buildEmailHtml(
  dateLabel: string,
  todayLabel: string,
  g: GlobalMetrics,
  members: MemberMetrics[],
  overdueTasks: OverdueTask[],
  completedYesterday: CompletedTask[],
  missedYesterday: MissedTask[],
  todayAgenda: AgendaTask[],
): string {
  const statCell = (label: string, value: string | number, highlight = false) => `
    <td style="padding:16px 12px;text-align:center;border-right:1px solid #e5e7eb;">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#9ca3af;margin-bottom:8px;">${label}</div>
      <div style="font-size:28px;font-weight:300;color:${highlight ? "#dc2626" : "#111111"};line-height:1;">${value}</div>
    </td>`;

  const memberRow = (m: MemberMetrics, i: number) => `
    <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f9fafb"};">
      <td style="padding:10px 16px;font-size:13px;color:#111111;font-weight:500;border-right:1px solid #e5e7eb;">${m.full_name}</td>
      <td style="padding:10px 8px;text-align:center;font-size:13px;color:${m.tarefas_criadas ? "#111111" : "#d1d5db"};border-right:1px solid #e5e7eb;">${m.tarefas_criadas || "—"}</td>
      <td style="padding:10px 8px;text-align:center;font-size:13px;color:${m.tarefas_realizadas ? "#111111" : "#d1d5db"};border-right:1px solid #e5e7eb;">${m.tarefas_realizadas || "—"}</td>
      <td style="padding:10px 8px;text-align:center;font-size:13px;color:${m.tarefas_em_atraso > 0 ? "#dc2626" : "#d1d5db"};font-weight:${m.tarefas_em_atraso > 0 ? "600" : "400"};border-right:1px solid #e5e7eb;">${m.tarefas_em_atraso || "—"}</td>
      <td style="padding:10px 8px;text-align:center;font-size:13px;color:${m.horas_realizadas_minutos ? "#111111" : "#d1d5db"};border-right:1px solid #e5e7eb;">${fmtMinutes(m.horas_realizadas_minutos)}</td>
      <td style="padding:10px 8px;text-align:center;font-size:13px;color:${m.horas_estimadas ? "#111111" : "#d1d5db"};">${fmtEstimated(m.horas_estimadas)}</td>
    </tr>`;

  const completedSection = completedYesterday.length > 0 ? `
  <tr>
    <td style="background:#ffffff;padding:24px 32px;border-top:1px solid #e5e7eb;">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.16em;color:#16a34a;margin-bottom:16px;">Concluídas Ontem</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #bbf7d0;border-collapse:collapse;">
        <thead>
          <tr style="background:#f0fdf4;border-bottom:1px solid #bbf7d0;">
            <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;border-right:1px solid #bbf7d0;">Tarefa</th>
            <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;border-right:1px solid #bbf7d0;">Responsável</th>
            <th style="padding:8px 12px;text-align:center;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;">H. Est.</th>
          </tr>
        </thead>
        <tbody>
          ${completedYesterday.map((t, i) => `
          <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f0fdf4"};">
            <td style="padding:10px 16px;font-size:13px;color:#111111;border-right:1px solid #bbf7d0;">${t.title}</td>
            <td style="padding:10px 12px;font-size:13px;color:#374151;border-right:1px solid #bbf7d0;">${t.assignee}</td>
            <td style="padding:10px 12px;text-align:center;font-size:13px;color:${t.estimate_points ? "#111111" : "#d1d5db"};">${t.estimate_points ? fmtEstimated(t.estimate_points) : "—"}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </td>
  </tr>` : "";

  const missedSection = missedYesterday.length > 0 ? `
  <tr>
    <td style="background:#ffffff;padding:24px 32px;border-top:1px solid #e5e7eb;">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.16em;color:#d97706;margin-bottom:16px;">Due Ontem — Não Concluídas</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fde68a;border-collapse:collapse;">
        <thead>
          <tr style="background:#fffbeb;border-bottom:1px solid #fde68a;">
            <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;border-right:1px solid #fde68a;">Tarefa</th>
            <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;">Responsável</th>
          </tr>
        </thead>
        <tbody>
          ${missedYesterday.map((t, i) => `
          <tr style="background:${i % 2 === 0 ? "#ffffff" : "#fffbeb"};">
            <td style="padding:10px 16px;font-size:13px;color:#111111;border-right:1px solid #fde68a;">${t.title}</td>
            <td style="padding:10px 12px;font-size:13px;color:#374151;">${t.assignee}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </td>
  </tr>` : "";

  // Group today's agenda by assignee
  const agendaByAssignee: Record<string, string[]> = {};
  for (const t of todayAgenda) {
    if (!agendaByAssignee[t.assignee]) agendaByAssignee[t.assignee] = [];
    agendaByAssignee[t.assignee].push(t.title);
  }
  const agendaEntries = Object.entries(agendaByAssignee);

  const agendaSection = agendaEntries.length > 0 ? `
  <tr>
    <td style="background:#ffffff;padding:24px 32px;border-top:1px solid #e5e7eb;">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.16em;color:#6366f1;margin-bottom:16px;">Agenda de Hoje — ${todayLabel}</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e7ff;border-collapse:collapse;">
        <thead>
          <tr style="background:#f5f3ff;border-bottom:1px solid #e0e7ff;">
            <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;border-right:1px solid #e0e7ff;">Responsável</th>
            <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;">Tarefas</th>
          </tr>
        </thead>
        <tbody>
          ${agendaEntries.map(([assignee, tasks], i) => `
          <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f5f3ff"};">
            <td style="padding:10px 16px;font-size:13px;color:#111111;font-weight:500;vertical-align:top;border-right:1px solid #e0e7ff;">${assignee}</td>
            <td style="padding:10px 12px;font-size:13px;color:#374151;">
              ${tasks.map(t => `<div style="margin-bottom:4px;">• ${t}</div>`).join("")}
            </td>
          </tr>`).join("")}
        </tbody>
      </table>
    </td>
  </tr>` : "";

  const overdueSection = overdueTasks.length > 0 ? `
  <tr>
    <td style="background:#ffffff;padding:24px 32px;border-top:1px solid #e5e7eb;">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.16em;color:#dc2626;margin-bottom:16px;">Tarefas em Atraso</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fecaca;border-collapse:collapse;">
        <thead>
          <tr style="background:#fff5f5;border-bottom:1px solid #fecaca;">
            <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;border-right:1px solid #fecaca;">Tarefa</th>
            <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;border-right:1px solid #fecaca;">Responsável</th>
            <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;">Data Limite</th>
          </tr>
        </thead>
        <tbody>
          ${overdueTasks.map((t, i) => `
          <tr style="background:${i % 2 === 0 ? "#ffffff" : "#fff5f5"};">
            <td style="padding:10px 16px;font-size:13px;color:#111111;border-right:1px solid #fecaca;">${t.title}</td>
            <td style="padding:10px 12px;font-size:13px;color:#374151;border-right:1px solid #fecaca;">${t.assignee}</td>
            <td style="padding:10px 12px;font-size:13px;color:#dc2626;font-weight:500;">${fmtDueDate(t.due_date)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </td>
  </tr>` : "";

  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relatório Diário</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">
        <tr>
          <td style="background:#111111;padding:24px 32px;border-radius:4px 4px 0 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <img src="https://dsfzhrodcxtlayxcfjpx.supabase.co/storage/v1/object/public/assets/outlierlogofundopreto.svg" alt="Outlier OS" height="40" style="display:block;height:40px;border:0;" />
                  <div style="font-size:13px;color:#9ca3af;margin-top:8px;">Relatório Diário de Equipa</div>
                </td>
                <td align="right">
                  <div style="font-size:12px;color:#6b7280;text-transform:capitalize;">${dateLabel}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:24px 32px;border-bottom:1px solid #e5e7eb;">
            <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.16em;color:#9ca3af;margin-bottom:16px;">Totais da Equipa</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-right:none;">
              <tr>
                ${statCell("Tarefas Criadas", g.tarefas_criadas)}
                ${statCell("Realizadas", g.tarefas_realizadas)}
                ${statCell("Em Atraso", g.tarefas_em_atraso, g.tarefas_em_atraso > 0)}
                ${statCell("H. Realizadas", fmtMinutes(g.horas_realizadas_minutos))}
                ${statCell("H. Estimadas", fmtEstimated(g.horas_estimadas))}
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:24px 32px;">
            <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.16em;color:#9ca3af;margin-bottom:16px;">Por Pessoa</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-collapse:collapse;">
              <thead>
                <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
                  <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;border-right:1px solid #e5e7eb;">Membro</th>
                  <th style="padding:8px 8px;text-align:center;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;border-right:1px solid #e5e7eb;">Criadas</th>
                  <th style="padding:8px 8px;text-align:center;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;border-right:1px solid #e5e7eb;">Realizadas</th>
                  <th style="padding:8px 8px;text-align:center;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;border-right:1px solid #e5e7eb;">Em Atraso</th>
                  <th style="padding:8px 8px;text-align:center;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;border-right:1px solid #e5e7eb;">H. Real.</th>
                  <th style="padding:8px 8px;text-align:center;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;">H. Est.</th>
                </tr>
              </thead>
              <tbody>
                ${members.length === 0
                  ? `<tr><td colspan="6" style="padding:24px;text-align:center;color:#9ca3af;font-size:13px;">Sem membros activos.</td></tr>`
                  : members.map((m, i) => memberRow(m, i)).join("")
                }
              </tbody>
            </table>
          </td>
        </tr>
        ${completedSection}
        ${missedSection}
        ${agendaSection}
        ${overdueSection}
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;border-radius:0 0 4px 4px;">
            <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
              <em>Em Atraso</em> reflecte o estado actual da plataforma.<br>
              <em>H. Estimadas</em> = soma das horas estimadas nas tarefas concluídas ontem.<br>
              <em>Concluídas Ontem</em> = tarefas marcadas como concluídas ontem.<br>
              <em>Due Ontem</em> = tarefas com prazo ontem que ficaram por concluir.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Assignee resolution helper ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveAssignee(t: any, membersMap: Record<string, string>): string {
  const assigneeObj = Array.isArray(t.assignee) ? t.assignee[0] : t.assignee;
  if (assigneeObj?.full_name) return assigneeObj.full_name;
  if ((t.assignees as string[] | null)?.length) {
    const names = (t.assignees as string[]).map((id) => membersMap[id]).filter(Boolean);
    if (names.length) return names.join(", ");
  }
  return "—";
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    // Auth
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Supabase vars missing" }, { status: 500 });
    }

    // Period — yesterday
    const now = new Date();
    const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
    const periodStart = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate(), 0, 0, 0, 0));
    const periodEnd   = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate(), 23, 59, 59, 999));

    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const todayStr     = now.toISOString().slice(0, 10);

    const supabase = createAdminClient();

    // Fetch concluded status id
    const { data: statusData, error: statusError } = await supabase
      .from("task_statuses")
      .select("id")
      .eq("key", "concluido")
      .maybeSingle();
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: 500 });
    }
    const concludedStatusId = statusData?.id ?? null;

    // Fetch all team members for name resolution
    const { data: membersRaw } = await supabase.from("team_members").select("id, full_name");
    const membersMap: Record<string, string> = Object.fromEntries(
      (membersRaw ?? []).map((m: { id: string; full_name: string }) => [m.id, m.full_name]),
    );

    const taskSelect = "title, due_date, estimate_points, assignee_id, assignees, assignee:team_members!tasks_assignee_id_fkey(full_name)";

    // Run all queries in parallel
    const [
      { global: g, members },
      { data: overdueRaw },
      { data: completedRaw },
      { data: missedRaw },
      { data: agendaRaw },
    ] = await Promise.all([
      getTeamMetricsAdmin(periodStart, periodEnd, concludedStatusId),

      // Overdue: due_date < today, not concluded
      supabase
        .from("tasks")
        .select(taskSelect)
        .not("due_date", "is", null)
        .lt("due_date", todayStr)
        .neq("status_id", concludedStatusId ?? "")
        .order("due_date", { ascending: true }),

      // Completed yesterday: completed_at within yesterday's UTC window
      concludedStatusId
        ? supabase
            .from("tasks")
            .select(taskSelect + ", completed_at")
            .eq("status_id", concludedStatusId)
            .not("completed_at", "is", null)
            .gte("completed_at", periodStart.toISOString())
            .lte("completed_at", periodEnd.toISOString())
            .order("completed_at", { ascending: false })
        : Promise.resolve({ data: [] }),

      // Missed: due_date = yesterday, not concluded
      concludedStatusId
        ? supabase
            .from("tasks")
            .select(taskSelect)
            .eq("due_date", yesterdayStr)
            .neq("status_id", concludedStatusId)
            .order("title", { ascending: true })
        : Promise.resolve({ data: [] }),

      // Today's agenda: due_date = today (any status)
      supabase
        .from("tasks")
        .select(taskSelect)
        .eq("due_date", todayStr)
        .order("title", { ascending: true }),
    ]);

    console.log("[daily-report] period:", periodStart.toISOString(), "→", periodEnd.toISOString());
    console.log("[daily-report] yesterdayStr:", yesterdayStr, "todayStr:", todayStr);
    console.log("[daily-report] concludedStatusId:", concludedStatusId);
    console.log("[daily-report] overdueRaw count:", overdueRaw?.length ?? 0);
    console.log("[daily-report] completedRaw count:", completedRaw?.length ?? 0);
    console.log("[daily-report] missedRaw count:", missedRaw?.length ?? 0);
    console.log("[daily-report] agendaRaw count:", agendaRaw?.length ?? 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overdueTasks: OverdueTask[] = (overdueRaw ?? []).map((t: any) => ({
      title: t.title as string,
      assignee: resolveAssignee(t, membersMap),
      due_date: t.due_date as string,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completedYesterday: CompletedTask[] = (completedRaw ?? []).map((t: any) => ({
      title: t.title as string,
      assignee: resolveAssignee(t, membersMap),
      estimate_points: t.estimate_points as number | null,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const missedYesterday: MissedTask[] = (missedRaw ?? []).map((t: any) => ({
      title: t.title as string,
      assignee: resolveAssignee(t, membersMap),
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const todayAgenda: AgendaTask[] = (agendaRaw ?? []).map((t: any) => ({
      title: t.title as string,
      assignee: resolveAssignee(t, membersMap),
    }));

    const dateLabel  = fmtDate(yesterday);
    const todayLabel = fmtDate(now);
    const subject    = `Relatório Diário Outlier OS: ${dateLabel}`;
    const html       = buildEmailHtml(
      dateLabel,
      todayLabel,
      g,
      members,
      overdueTasks,
      completedYesterday,
      missedYesterday,
      todayAgenda,
    );

    return NextResponse.json({
      html,
      subject,
      date: yesterdayStr,
      debug: {
        period: { start: periodStart.toISOString(), end: periodEnd.toISOString() },
        concludedStatusId,
        counts: {
          overdue: overdueTasks.length,
          completedYesterday: completedYesterday.length,
          missedYesterday: missedYesterday.length,
          todayAgenda: todayAgenda.length,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack   = err instanceof Error ? (err.stack ?? null) : null;
    return NextResponse.json({ error: message, stack }, { status: 500 });
  }
}
