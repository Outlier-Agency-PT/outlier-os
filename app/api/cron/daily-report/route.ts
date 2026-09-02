import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamMetricsAdmin, WorkedTask } from "@/lib/queries/team-metrics";

export const dynamic = "force-dynamic";

const FROM = "onboarding@resend.dev";
const TO = ["ads@outlieragency.pt", "daniel@danielgodinho.pt", "mariajoao@danielgodinho.pt"];

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

function buildEmailHtml(
  dateLabel: string,
  g: {
    tarefas_criadas: number;
    tarefas_realizadas: number;
    tarefas_em_atraso: number;
    horas_realizadas_minutos: number;
    horas_estimadas: number;
  },
  members: {
    full_name: string;
    tarefas_criadas: number;
    tarefas_realizadas: number;
    tarefas_em_atraso: number;
    horas_realizadas_minutos: number;
    horas_estimadas: number;
  }[],
  overdueTasks: { title: string; assignee: string; due_date: string }[],
  workedTasks: WorkedTask[],
  memberNameMap: Record<string, string>,
): string {
  const statCell = (label: string, value: string | number, highlight = false) => `
    <td style="padding:16px 12px;text-align:center;border-right:1px solid #e5e7eb;">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#9ca3af;margin-bottom:8px;">${label}</div>
      <div style="font-size:28px;font-weight:300;color:${highlight ? "#dc2626" : "#111111"};line-height:1;">${value}</div>
    </td>`;

  const memberRow = (m: typeof members[number], i: number) => `
    <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f9fafb"};">
      <td style="padding:10px 16px;font-size:13px;color:#111111;font-weight:500;border-right:1px solid #e5e7eb;">${m.full_name}</td>
      <td style="padding:10px 8px;text-align:center;font-size:13px;color:${m.tarefas_criadas ? "#111111" : "#d1d5db"};border-right:1px solid #e5e7eb;">${m.tarefas_criadas || "—"}</td>
      <td style="padding:10px 8px;text-align:center;font-size:13px;color:${m.tarefas_realizadas ? "#111111" : "#d1d5db"};border-right:1px solid #e5e7eb;">${m.tarefas_realizadas || "—"}</td>
      <td style="padding:10px 8px;text-align:center;font-size:13px;color:${m.tarefas_em_atraso > 0 ? "#dc2626" : "#d1d5db"};font-weight:${m.tarefas_em_atraso > 0 ? "600" : "400"};border-right:1px solid #e5e7eb;">${m.tarefas_em_atraso || "—"}</td>
      <td style="padding:10px 8px;text-align:center;font-size:13px;color:${m.horas_realizadas_minutos ? "#111111" : "#d1d5db"};border-right:1px solid #e5e7eb;">${fmtMinutes(m.horas_realizadas_minutos)}</td>
      <td style="padding:10px 8px;text-align:center;font-size:13px;color:${m.horas_estimadas ? "#111111" : "#d1d5db"};">${fmtEstimated(m.horas_estimadas)}</td>
    </tr>`;

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
        ${workedTasks.length > 0 ? `
        <tr>
          <td style="background:#ffffff;padding:24px 32px;border-top:1px solid #e5e7eb;">
            <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.16em;color:#9ca3af;margin-bottom:16px;">Trabalhado Ontem</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-collapse:collapse;">
              <thead>
                <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
                  <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;border-right:1px solid #e5e7eb;">Tarefa</th>
                  <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;border-right:1px solid #e5e7eb;">Quem Trabalhou</th>
                  <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;border-right:1px solid #e5e7eb;">Estado</th>
                  <th style="padding:8px 12px;text-align:right;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;">Tempo</th>
                </tr>
              </thead>
              <tbody>
                ${workedTasks.map((t, i) => {
                  const statusText = t.status_key === "concluido"
                    ? `✅ ${t.status_label ?? "Concluído"}`
                    : (t.status_label ?? "—");
                  const workerNames = t.worked_by.map((id) => memberNameMap[id]).filter(Boolean).join(", ") || "—";
                  return `
                <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f9fafb"};">
                  <td style="padding:10px 16px;font-size:13px;color:#111111;border-right:1px solid #e5e7eb;">${t.title}</td>
                  <td style="padding:10px 12px;font-size:13px;color:#374151;border-right:1px solid #e5e7eb;">${workerNames}</td>
                  <td style="padding:10px 12px;font-size:13px;color:#374151;border-right:1px solid #e5e7eb;">${statusText}</td>
                  <td style="padding:10px 12px;font-size:13px;color:#374151;text-align:right;">${fmtMinutes(t.total_duration_minutes)}</td>
                </tr>`;
                }).join("")}
              </tbody>
            </table>
          </td>
        </tr>` : ""}
        ${overdueTasks.length > 0 ? `
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
        </tr>` : ""}
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;border-radius:0 0 4px 4px;">
            <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
              <em>Em Atraso</em> reflecte o estado actual da plataforma.<br>
              <em>H. Estimadas</em> = soma das horas estimadas nas tarefas concluídas ontem.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    // Step 1 — auth
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2 — env
    const env = {
      RESEND_API_KEY: process.env.RESEND_API_KEY ? "set" : "MISSING",
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING",
    };
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ step: "env", env, error: "RESEND_API_KEY missing" }, { status: 500 });
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ step: "env", env, error: "Supabase vars missing" }, { status: 500 });
    }

    // Step 3 — period
    const now = new Date();
    const y = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
    const periodStart = new Date(Date.UTC(y.getUTCFullYear(), y.getUTCMonth(), y.getUTCDate(), 0, 0, 0, 0));
    const periodEnd   = new Date(Date.UTC(y.getUTCFullYear(), y.getUTCMonth(), y.getUTCDate(), 23, 59, 59, 999));

    // Step 4 — concluded status id
    const supabase = createAdminClient();
    const { data: statusData, error: statusError } = await supabase
      .from("task_statuses")
      .select("id")
      .eq("key", "concluido")
      .maybeSingle();
    if (statusError) {
      return NextResponse.json({ step: "task_statuses", error: statusError.message }, { status: 500 });
    }
    const concludedStatusId = statusData?.id ?? null;

    // Step 5 — metrics + overdue task details
    const today = now.toISOString().slice(0, 10);

    const [{ global: g, members, workedTasks }, overdueTasksResult] = await Promise.all([
      getTeamMetricsAdmin(periodStart, periodEnd, concludedStatusId),
      concludedStatusId
        ? Promise.all([
            supabase
              .from("tasks")
              .select("title, due_date, assignee_id, assignees, assignee:team_members!tasks_assignee_id_fkey(full_name)")
              .not("due_date", "is", null)
              .lt("due_date", today)
              .neq("status_id", concludedStatusId)
              .order("due_date", { ascending: true }),
            supabase.from("team_members").select("id, full_name"),
          ])
        : Promise.resolve(null),
    ]);

    let overdueTasks: { title: string; assignee: string; due_date: string }[] = [];
    if (overdueTasksResult) {
      const [{ data: overdueRaw }, { data: membersRaw }] = overdueTasksResult;
      const membersMap: Record<string, string> = Object.fromEntries(
        (membersRaw ?? []).map((m: { id: string; full_name: string }) => [m.id, m.full_name]),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      overdueTasks = (overdueRaw ?? []).map((t: any) => {
        const assigneeObj = Array.isArray(t.assignee) ? t.assignee[0] : t.assignee;
        let assignee = "—";
        if (assigneeObj?.full_name) {
          assignee = assigneeObj.full_name;
        } else if ((t.assignees as string[] | null)?.length) {
          const names = (t.assignees as string[]).map((id) => membersMap[id]).filter(Boolean);
          if (names.length) assignee = names.join(", ");
        }
        return { title: t.title as string, assignee, due_date: t.due_date as string };
      });
    }

    // Step 6 — build + send
    const memberNameMap: Record<string, string> = Object.fromEntries(
      members.map((m) => [m.member_id, m.full_name]),
    );
    const dateLabel = fmtDate(y);
    const subject   = `Relatório Diário Outlier OS: ${dateLabel}`;
    const html      = buildEmailHtml(dateLabel, g, members, overdueTasks, workedTasks, memberNameMap);

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: FROM,
      to: TO,
      subject,
      html,
    });

    if (emailError) {
      return NextResponse.json({ step: "resend_send", error: emailError }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      emailId: emailData?.id,
      period: { start: periodStart.toISOString(), end: periodEnd.toISOString() },
      recipients: TO,
      global: g,
      members: members.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack   = err instanceof Error ? (err.stack ?? null) : null;
    return NextResponse.json({ step: "uncaught", error: message, stack }, { status: 500 });
  }
}
