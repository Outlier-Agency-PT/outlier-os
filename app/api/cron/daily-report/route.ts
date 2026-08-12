import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamMetricsAdmin } from "@/lib/queries/team-metrics";

export const dynamic = "force-dynamic";

// Não instanciar ao nível do módulo — Resend v6 lança excepção se a key for
// undefined, o que crasha o módulo inteiro antes de qualquer handler correr.
const FROM = "ads@outlieragency.pt";
const TO = ["suzyany@outlieragency.pt"];

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

function fmtDate(d: Date): string {
  return d.toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
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

        <!-- Header -->
        <tr>
          <td style="background:#111111;padding:24px 32px;border-radius:4px 4px 0 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#ffffff;">OUTLIER OS</div>
                  <div style="font-size:13px;color:#9ca3af;margin-top:4px;">Relatório Diário de Equipa</div>
                </td>
                <td align="right">
                  <div style="font-size:12px;color:#6b7280;text-transform:capitalize;">${dateLabel}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Global stats -->
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

        <!-- Per-member table -->
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

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;border-radius:0 0 4px 4px;">
            <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
              <em>Em Atraso</em> reflecte o estado actual da plataforma (tarefas com prazo vencido e não concluídas),
              independentemente do período do relatório.<br>
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

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[daily-report] start");

  // Validate required env vars up front so the error is explicit
  if (!process.env.RESEND_API_KEY) {
    console.error("[daily-report] RESEND_API_KEY not set");
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[daily-report] Supabase env vars missing");
    return NextResponse.json({ error: "Supabase env vars not configured" }, { status: 500 });
  }

  // Instanciar aqui, depois de confirmar que a key existe
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    // Period = yesterday (UTC full day)
    const now = new Date();
    const y = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
    const periodStart = new Date(Date.UTC(y.getUTCFullYear(), y.getUTCMonth(), y.getUTCDate(), 0, 0, 0, 0));
    const periodEnd = new Date(Date.UTC(y.getUTCFullYear(), y.getUTCMonth(), y.getUTCDate(), 23, 59, 59, 999));
    console.log("[daily-report] period", periodStart.toISOString(), "→", periodEnd.toISOString());

    // Get concluded status id via admin client (no user session in cron)
    const supabase = createAdminClient();
    console.log("[daily-report] querying task_statuses");
    const { data: statusData, error: statusError } = await supabase
      .from("task_statuses")
      .select("id")
      .eq("key", "concluido")
      .maybeSingle();
    if (statusError) {
      console.error("[daily-report] task_statuses query error:", statusError);
      return NextResponse.json({ error: "DB error: task_statuses", detail: statusError.message }, { status: 500 });
    }
    const concludedStatusId = statusData?.id ?? null;
    console.log("[daily-report] concludedStatusId:", concludedStatusId);

    console.log("[daily-report] fetching team metrics");
    const { global: g, members } = await getTeamMetricsAdmin(periodStart, periodEnd, concludedStatusId);
    console.log("[daily-report] metrics ok — members:", members.length, "global:", g);

    const dateLabel = fmtDate(y);
    const subject = `Relatório Diário Outlier OS — ${dateLabel}`;
    const html = buildEmailHtml(dateLabel, g, members);
    console.log("[daily-report] html built, length:", html.length);

    console.log("[daily-report] sending via Resend from:", FROM, "to:", TO);
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: FROM,
      to: TO,
      subject,
      html,
    });

    if (emailError) {
      console.error("[daily-report] Resend error:", JSON.stringify(emailError));
      return NextResponse.json({ error: "Failed to send email", detail: emailError }, { status: 500 });
    }

    console.log("[daily-report] email sent, id:", emailData?.id);
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
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[daily-report] unexpected error:", message, stack);
    return NextResponse.json({ error: "Internal server error", detail: message }, { status: 500 });
  }
}
