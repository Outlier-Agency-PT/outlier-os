import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamMetricsAdmin } from "@/lib/queries/team-metrics";

export const dynamic = "force-dynamic";

const FROM = "onboarding@resend.dev";
const TO = ["ads@outlieragency.pt"];

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
                  <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjAwIDI4MSI+PHBhdGggZD0iTSAxNzMuNDEgMTc0LjAyIEMxNTQuNjIsMTc4LjgzIDEzNy45OSwxNzcuMDMgMTIwLjYyLDE2OC4zMiBDMTAxLjc5LDE1OC44OCA4OC4zNSwxNDIuNzEgODEuODAsMTIxLjYzIEM3OC41MiwxMTEuMDcgNzguNTQsOTAuNTYgODEuODQsODAuMDQgQzg2LjQzLDY1LjQ0IDkyLjcwLDU1LjI0IDEwMi44OCw0NS44MiBDMTEwLjg5LDM4LjQyIDEyMC4zNCwzMi45MyAxMzEuNTAsMjkuMTggQzEzOC43NiwyNi43NSAxNDAuODgsMjYuNTAgMTU0LjUwLDI2LjUwIEMxNjguOTAsMjYuNTAgMTY5Ljg0LDI2LjYzIDE3OC4wMCwyOS42NyBDMTc4Ljc3LDI5Ljk2IDE3OS41MiwzMC4yNCAxODAuMjUsMzAuNTEgQzIwMC41MiwzOC4wOSAyMDUuNjMsNDAuMDAgMjA5LjEzLDM4LjQwIEMyMTAuNDQsMzcuODAgMjExLjUzLDM2LjcxIDIxMy4wOSwzNS4yNSBDMjE2LjQ5LDMyLjA4IDIxNy4yMywzMC42NiAyMTcuODcsMjYuMDAgQzIxOC45OSwxNy45NiAyMjEuMjMsMTQuMzEgMjI1LjkxLDEyLjkxIEMyMzEuNTksMTEuMjEgMjM2LjMwLDEyLjQzIDIzOS45MiwxNi41NyBDMjQ2Ljg0LDI0LjQ1IDI0Mi4yNSwzNC45NyAyMzEuMDAsMzcuMDEgQzIyNy45OCwzNy41NiAyMjQuMjQsMzguNTIgMjIyLjcwLDM5LjE0IEMyMTYuNjAsNDEuNjIgMjE1LjI2LDUxLjI2IDIxOS41OCw2MS41MCBDMjI4Ljc4LDgzLjMzIDIzMS4wMiw5NC43NSAyMjkuMDIsMTA5Ljc4IEMyMjYuNTksMTI4LjAyIDIxOS45MywxNDEuMjggMjA2LjU1LDE1NC41MCBDMTk2LjAzLDE2NC44OSAxODUuOTksMTcwLjgxIDE3My40MSwxNzQuMDIgWk0gMTQxLjAwIDE1MS41NyBDMTQ3LjUxLDE1My4zOCAxNjEuNjIsMTUzLjMwIDE2OC4wNywxNTEuNDEgQzE4MC44MywxNDcuNjkgMTk0LjcwLDEzNi40NSAyMDAuMzgsMTI1LjI0IEMyMDguNDgsMTA5LjI1IDIwNy45NSw4OC41NSAxOTkuMDYsNzQuMjcgQzE5NC40OSw2Ni45MyAxODUuMjIsNTguMjMgMTc4LjM3LDU0Ljg2IEMxNDUuODgsMzguODYgMTA4LjA4LDU4LjExIDEwMi44OSw5My4zMCBDOTkuMDcsMTE5LjIwIDExNS42MywxNDQuNTEgMTQxLjAwLDE1MS41NyBaTSA5NzEuNzggMTczLjQ0IEM5NjguNTMsMTc1LjcyIDk1Mi43OCwxNzUuNjUgOTUwLjg3LDE3My4zNSBDOTQ5LjgyLDE3Mi4wOCA5NDkuNDMsMTY2LjM3IDk0OS4yMSwxNDguNjAgQzk0OS4wNiwxMzUuODkgOTQ5LjI5LDEyMy40NyA5NDkuNzQsMTIxLjAwIEwgOTUwLjU1IDExNi41MCBMIDk2Mi4yOCAxMTYuMjIgTCA5NzQuMDAgMTE1Ljk0IEwgOTc0LjAwIDExMS42NiBDOTc0LjAwLDEwNS4zMSA5NzguMzcsOTguOTkgOTg1LjA4LDk1LjY1IEM5ODkuODksOTMuMjUgOTkxLjQ3LDkzLjAwIDEwMDEuNzUsOTMuMDAgQzEwMTUuNjcsOTMuMDAgMTAyMC42OCw5MS44MiAxMDI1Ljk3LDg3LjMwIEMxMDMxLjM3LDgyLjY3IDEwMzMuMDAsNzkuMjUgMTAzMy4wMCw3Mi41MSBDMTAzMy4wMCw2My4zNiAxMDI4Ljc5LDU3LjA3IDEwMjAuMDAsNTMuMDggQzEwMTUuNzgsNTEuMTcgMTAxMy41Miw1MS4wNCA5ODQuMDAsNTEuMDEgQzk2NS45NCw1MC45OSA5NTEuODYsNTAuNTYgOTUxLjAwLDUwLjAyIEM5NDkuODUsNDkuMjkgOTQ5LjUwLDQ3LjAyIDk0OS41Miw0MC4yOSBDOTQ5LjUyLDM1LjQ1IDk0OS44NSwzMC43MSA5NTAuMjMsMjkuNzUgQzk1MC44OCwyOC4xMyA5NTMuMzgsMjguMDAgOTgyLjcyLDI4LjAyIEMxMDA2LjgxLDI4LjAzIDEwMTYuMTksMjguMzkgMTAyMS41MCwyOS41MSBDMTA0MC4yOSwzMy40NiAxMDUzLjYzLDQ2LjQzIDEwNTcuMDMsNjQuMDcgQzEwNTguNDUsNzEuNDAgMTA1Ny40Niw3OC4yNyAxMDUzLjkzLDg1LjYzIEMxMDUwLjE2LDkzLjQ5IDEwNDQuNTMsOTguMTYgMTAzNC44OSwxMDEuNDAgQzEwMzAuODQsMTAyLjc3IDEwMjguMjAsMTA0LjA5IDEwMjkuMDEsMTA0LjM0IEMxMDI5LjgzLDEwNC41OSAxMDMzLjYxLDEwNS41MiAxMDM3LjQwLDEwNi40MCBDMTA0NS4wNSwxMDguMTcgMTA1MC4xNiwxMTEuNDggMTA1Mi42MywxMTYuMjUgQzEwNTQuNDksMTE5Ljg1IDEwNTUuNjksMTMzLjcwIDEwNTYuMTYsMTU2Ljg0IEwgMTA1Ni4xOCAxNTguMTcgQzEwNTYuMzgsMTY3LjYxIDEwNTYuNDYsMTcxLjc2IDEwNTQuNDUsMTczLjU4IEMxMDUyLjg3LDE3NS4wMSAxMDUwLjAwLDE3NS4wMSAxMDQ0Ljg4LDE3NS4wMCBDMTA0NC41OCwxNzUuMDAgMTA0NC4yOCwxNzUuMDAgMTA0My45NiwxNzUuMDAgQzEwNDMuNTIsMTc1LjAwIDEwNDMuMDksMTc1LjAwIDEwNDIuNjgsMTc1LjAwIEMxMDM4LjUyLDE3NS4wMSAxMDM1Ljk5LDE3NS4wMiAxMDM0LjQzLDE3My43OSBDMTAzMS45OSwxNzEuODUgMTAzMS45OCwxNjYuODQgMTAzMS45NSwxNTMuOTYgQzEwMzEuOTUsMTUzLjE0IDEwMzEuOTUsMTUyLjMwIDEwMzEuOTUsMTUxLjQyIEMxMDMxLjg5LDEyOC4zMiAxMDMxLjAxLDExOC4yNSAxMDI4Ljk0LDExNi45NCBDMTAyOC4xNSwxMTYuNDQgMTAxNS40NiwxMTYuMDIgMTAwMC43NSwxMTYuMDIgTCA5NzQuMDAgMTE2LjAwIEwgOTc0LjAwIDE0My45NCBDOTc0LjAwLDE3MS42OSA5NzMuOTgsMTcxLjkwIDk3MS43OCwxNzMuNDQgWk0gMzU2LjUwIDE3NC40NiBDMzQ5LjEzLDE3Ni4zOCAzMzUuOTAsMTc3LjA5IDMyOC41MCwxNzUuOTYgQzMwNS45OCwxNzIuNTIgMjg4LjA2LDE1Ni41OCAyODIuMzcsMTM0LjkxIEMyODAuOTMsMTI5LjQ0IDI4MC42MiwxMjEuMzEgMjgwLjI3LDc5LjY5IEMyNzkuOTUsNDIuNzMgMjgwLjE0LDMwLjU0IDI4MS4wNSwyOS40NCBDMjgyLjY4LDI3LjQ4IDMwMi4yMywyNy4zNiAzMDMuODQsMjkuMzEgQzMwNC41OCwzMC4yMCAzMDUuMDIsNDYuNDggMzA1LjIxLDgwLjU2IEMzMDUuNTAsMTMwLjQ1IDMwNS41MCwxMzAuNTAgMzA3LjgxLDEzNS4xNCBDMzEzLjE3LDE0NS45MiAzMjMuMjQsMTUyLjExIDMzNi41NSwxNTIuODEgQzM0OC4zMywxNTMuNDMgMzU0LjU5LDE1MS4yOSAzNjIuMjAsMTQ0LjA2IEMzNzEuMjUsMTM1LjQ2IDM3Mi4wMCwxMzIuNDIgMzcyLjAxLDEwNC4yNyBDMzcyLjAyLDkxLjc1IDM3Mi4zMCw3OS44MCAzNzIuNjUsNzcuNzIgTCAzNzMuMjcgNzMuOTQgTCAzODQuODkgNzQuMjIgTCAzOTYuNTAgNzQuNTAgTCAzOTYuNDQgMTAxLjUwIEMzOTYuMzksMTI0LjEwIDM5Ni4wOSwxMjkuNTYgMzk0LjYwLDEzNS4wMCBDMzg5LjMzLDE1NC4zNCAzNzQuNDAsMTY5Ljc5IDM1Ni41MCwxNzQuNDYgWk0gODk1LjkxIDE3My4zNSBDODk0LjE2LDE3NC41OCA4ODYuNTEsMTc0LjgzIDg0OC42MSwxNzQuOTUgQzgwNS4yNywxNzUuMDggODAzLjMyLDE3NS4wMSA4MDEuNjYsMTczLjE4IEM4MDAuMDYsMTcxLjQxIDc5OS45NSwxNjcuMzYgODAwLjIyLDExOC44OCBDODA0LjQ5LDY3LjQ0IDgwMC41NCw2Ni40MyA4MDIuNjUsNjIuNTAgQzgwNi41Myw1NS4zMCA4MTMuMTksNTEuMDAgODIwLjQ3LDUxLjAwIEwgODIzLjk2IDUxLjAwIEwgODI0LjUwIDkxLjUwIEwgODg5LjUwIDkyLjUwIEwgODg5Ljc5IDEwMi4zNSBDODg5Ljk3LDEwOC43NiA4ODkuNjcsMTEyLjY5IDg4OC45MSwxMTMuNjAgQzg4Ny45NywxMTQuNzUgODgxLjk1LDExNS4wMCA4NTUuODgsMTE1LjAwIEwgODI0LjAwIDExNS4wMCBMIDgyNC4wMCAxNTEuMDAgTCA4NTkuODAgMTUxLjAwIEM4ODYuMzEsMTUxLjAwIDg5NS45MSwxNTEuMzEgODk2LjgwLDE1Mi4yMCBDODk3LjU2LDE1Mi45NiA4OTguMDAsMTU2Ljc5IDg5OC4wMCwxNjIuNjQgQzg5OC4wMCwxNzAuODggODk3Ljc3LDE3Mi4wNSA4OTUuOTEsMTczLjM1IFpNIDQ5Mi45MyAxNzQuMDQgQzQ4OS43NywxNzUuNzMgNDc0LjIzLDE3NC44OCA0NzIuNDQsMTcyLjkyIEM0NzEuMjIsMTcxLjU4IDQ3MS4wMCwxNjIuMTEgNDcxLjAwLDExMS4xNyBMIDQ3MS4wMCA1MS4wMCBMIDQ0OC4xMiA1MS4wMCBDNDI5Ljc1LDUxLjAwIDQyNS4wMiw1MC43MiA0MjQuMDgsNDkuNjAgQzQyMy4zMyw0OC42OSA0MjMuMDMsNDQuNzYgNDIzLjIxLDM4LjM1IEwgNDIzLjUwIDI4LjUwIEwgNDgyLjUwIDI4LjI0IEM1MzcuMDgsMjguMDAgNTQxLjU5LDI4LjExIDU0Mi43NSwyOS42OCBDNTQzLjUxLDMwLjcxIDU0NC4wMCwzNC41OSA1NDQuMDAsMzkuNTQgQzU0NC4wMCw0MC4wMiA1NDQuMDAsNDAuNDkgNTQ0LjAwLDQwLjk0IEM1NDQuMDIsNDQuNjIgNTQ0LjAzLDQ2Ljk2IDU0Mi45MSw0OC40NCBDNTQwLjk2LDUxLjAyIDUzNS41OSw1MS4wMSA1MjAuOTAsNTEuMDAgQzUxOS44Nyw1MS4wMCA1MTguNzksNTEuMDAgNTE3LjY3LDUxLjAwIEwgNDk1LjAwIDUxLjAwIEwgNDk1LjAwIDExMS45NiBDNDk1LjAwLDE3Mi41OCA0OTQuOTksMTcyLjk0IDQ5Mi45MywxNzQuMDQgWk0gNjcxLjE3IDE3My4zNSBDNjY5LjU0LDE3NC44MiA2NjUuNDMsMTc1LjAwIDYzMy4yNCwxNzUuMDAgQzYwMS43NiwxNzUuMDAgNTk2Ljk0LDE3NC44MCA1OTUuNTcsMTczLjQzIEM1OTQuMzYsMTcyLjIxIDU5NC4wMCwxNjkuNjMgNTk0LjAwLDE2MS45OSBMIDU5NC4wMCAxNTIuMTIgTCA1ODkuNDMgMTUxLjQ0IEM1ODIuNTgsMTUwLjQxIDU3Ni4wNCwxNDUuNTYgNTcyLjc1LDEzOS4wNyBMIDU3MC4wMCAxMzMuNjQgTCA1NzAuMDIgODIuMDcgQzU3MC4wMiw1My43MSA1NzAuNDAsMjkuOTIgNTcwLjg1LDI5LjIxIEM1NzEuNDUsMjguMjcgNTc0LjUyLDI4LjAwIDU4Mi41OCwyOC4yMSBMIDU5My41MCAyOC41MCBMIDU5NC4wMiAxNTEuMDAgTCA2MzEuOTMgMTUxLjAwIEM2NTIuNzgsMTUxLjAwIDY3MC41NSwxNTEuMjcgNjcxLjQyLDE1MS42MSBDNjczLjkyLDE1Mi41NyA2NzMuNzEsMTcxLjA1IDY3MS4xNywxNzMuMzUgWk0gNzQ3LjAwIDE3My4wMCBDNzQ1LjMyLDE3NC42OCA3NDMuNjcsMTc1LjAwIDczNi42OSwxNzUuMDAgQzczNS40OSwxNzUuMDAgNzM0LjQwLDE3NS4wNSA3MzMuNDIsMTc1LjEwIEM3MzEuMDYsMTc1LjIxIDcyOS4zMiwxNzUuMjkgNzI4LjAzLDE3NC41NyBDNzI0LjQwLDE3Mi41MiA3MjQuMzcsMTY0LjA3IDcyNC4yNiwxMzEuNzQgQzcyNC4yNCwxMjYuOTggNzI0LjIyLDEyMS42OSA3MjQuMTksMTE1LjgzIEM3MjQuMDIsODQuODUgNzI0LjE3LDU3LjUzIDcyNC41Miw1NS4xMyBMIDcyNS4xNiA1MC43NyBMIDczMC41OSA1MS4yMiBDNzM4LjcyLDUxLjg5IDc0Ni4xNSw1OC40NCA3NDguMDQsNjYuNTggQzc0OC41NCw2OC43MyA3NDguOTYsOTMuMTEgNzQ4Ljk4LDEyMC43NSBDNzQ5LjAwLDE2OS42OCA3NDguOTUsMTcxLjA1IDc0Ny4wMCwxNzMuMDAgWk0gODU5Ljg2IDUxLjAwIEwgODI0LjAwIDUxLjAwIEwgODI0LjAyIDQwLjc1IEM4MjQuMDIsMzUuMTEgODI0LjM5LDI5LjkzIDgyNC44MywyOS4yNCBDODI1LjQ2LDI4LjI1IDgzMy40OCwyOC4wMyA4NjEuNTcsMjguMjQgTCA4OTcuNTAgMjguNTAgTCA4OTcuNzkgMzguMzUgQzg5Ny45Nyw0NC43NiA4OTcuNjcsNDguNjkgODk2LjkxLDQ5LjYwIEM4OTUuOTYsNTAuNzUgODg5LjM4LDUxLjAwIDg1OS44Niw1MS4wMCBaTSA2MDEuNzggMjQ1LjY4IEM2MDEuNTIsMjU3LjcyIDYwMS4zOCwyNTguNTIgNTk5LjQ2LDI1OC43OSBDNTk4LjM0LDI1OC45NSA1OTcuMTAsMjU4Ljc3IDU5Ni43MSwyNTguMzggQzU5Ni4zMiwyNTcuOTkgNTk2LjAwLDI1MC45OSA1OTYuMDAgMjQyLjgzIEwgNTk2LjAwIDIyOC4wMCBMIDYwNy42OSAyMjguMDAgTCA2MTIuNTYgMjQwLjUwIEM2MTUuMjQsMjQ3LjM4IDYxNy43OCwyNTMuMDAgNjE4LjIxLDI1My4wMCBDNjE4LjkwLDI1My4wMCA2MTkuNTksMjM4Ljg0IDYxOS4zMCwyMzAuNzUgQzYxOS4yMSwyMjguMjcgNjE5LjU0LDIyOC4wMCA2MjIuNjMsMjI4LjAwIEwgNjI2LjA1IDIyOC4wMCBMIDYyNS43OCAyNDMuMjUgTCA2MjUuNTAgMjU4LjUwIEwgNjEzLjU0IDI1OC41MCBMIDYwOC45NCAyNDYuMDYgQzYwNi40MiwyMzkuMjIgNjAzLjgzLDIzMy40NCA2MDMuMjEsMjMzLjI0IEM2MDIuNDAsMjMyLjk3IDYwMS45OCwyMzYuNjAgNjAxLjc4LDI0NS42OCBaTSAxMTEyLjE3IDE3NC45NyBDMTExMS45MCwxNzUuMDQgMTExMS42NSwxNzUuMTEgMTExMS40MiwxNzUuMTggQzExMDkuNDksMTc1LjcyIDExMDguNTksMTc1Ljk3IDExMDcuNzYsMTc1LjgzIEMxMTA2LjkyLDE3NS42OSAxMTA2LjE2LDE3NS4xNiAxMTA0LjUwLDE3NC4xNCBDMTA5Ny43MCwxNjkuOTQgMTA5NS4yNywxNjMuMjQgMTA5OC4zOCwxNTcuMjIgQzExMDAuNzQsMTUyLjY4IDExMDMuNzMsMTUxLjAwIDExMDkuNTAsMTUxLjAwIEMxMTE3LjMxLDE1MS4wMCAxMTIyLjAwLDE1NS42NiAxMTIyLjAwLDE2My40MiBDMTEyMi4wMCwxNjcuOTYgMTExNy4yMywxNzMuNTYgMTExMi4xNywxNzQuOTcgWk0gNTAwLjg0IDI1Ny40MCBDNDk4LjQxLDI1OS4xMCA0OTEuODgsMjU5LjQzIDQ4OC4zOSwyNTguMDIgQzQ4My40MSwyNTYuMDEgNDc5LjI1LDI0Ni43NyA0ODAuNTYsMjQwLjY3IEM0ODIuNDMsMjMxLjk4IDQ4Ny4yOCwyMjguMDEgNDk2LjAwLDIyOC4wMSBDNTAyLjQ1LDIyOC4wMSA1MDcuNjIsMjMwLjY0IDUwOC41NywyMzQuNDEgQzUwOS44MSwyMzkuMzYgNTA2LjEyLDI0MC43MCA1MDIuODIsMjM2LjUwIEM1MDEuMjAsMjM0LjQ0IDQ5OS45OSwyMzQuMDAgNDk1LjkzLDIzNC4wMCBDNDkyLjM1LDIzNC4wMCA0OTAuNDYsMjM0LjU0IDQ4OS4wMywyMzUuOTcgQzQ4NC40OCwyNDAuNTIgNDg1LjQzLDI0OC4wMiA0OTEuMDMsMjUxLjgwIEM0OTYuNzQsMjU1LjY2IDUwNC4wMCwyNTIuODQgNTA0LjAwLDI0Ni43OCBDNTA0LjAwLDI0NC4xOSA1MDQuMzEsMjQzLjkwIDUwNi43NSwyNDQuMTggQzUwOS40NiwyNDQuNTAgNTA5LjUwLDI0NC42MSA1MDkuNTAsMjUxLjQ5IEM1MDkuNTAsMjU3LjYwIDUwOS4yNiwyNTguNTIgNTA3LjU3LDI1OC44NSBDNTA2LjUwLDI1OS4wNSA1MDUuMDcsMjU4LjQ1IDUwNC4zOCwyNTcuNTEgQzUwMy4yMywyNTUuOTMgNTAyLjk1LDI1NS45MiA1MDAuODQsMjU3LjQwIFpNIDY4My4wMCAyNTUuMzggQzY3OS40NSwyNTguNTkgNjc4LjM5LDI1OS4wMCA2NzMuNjUsMjU5LjAwIEM2NjEuMTMsMjU5LjAwIDY1My45MCwyNDYuMDcgNjYwLjE2LDIzNC45MiBDNjYyLjc5LDIzMC4yNSA2NjcuMTgsMjI4LjAwIDY3My42NSwyMjguMDAgQzY4MS4zNCwyMjguMDEgNjg4LjQ3LDIzMy43MyA2ODYuNjYsMjM4LjQ0IEM2ODYuMDEsMjQwLjE0IDY4Mi4wMCwyNDAuNjIgNjgyLjAwLDIzOS4wMCBDNjgyLjAwLDIzNi4zMSA2NzcuODgsMjM0LjAwIDY3My4wNywyMzQuMDAgQzY2OC45NCwyMzQuMDAgNjY3LjgxLDIzNC40MyA2NjYuMDcsMjM2LjYzIEM2NjMuNzMsMjM5LjYxIDY2My4yOSwyNDYuNTIgNjY1LjI4LDI0OS4wNSBDNjY3LjM4LDI1MS43MSA2NzEuMzUsMjU0LjAwIDY3My44NSwyNTQuMDAgQzY3NS4zMSwyNTQuMDAgNjc3LjU3LDI1Mi42MiA2NzkuNTYsMjUwLjUwIEM2ODMuNDksMjQ2LjM0IDY4Ny4wMCwyNDUuODEgNjg3LjAwLDI0OS4zOCBDNjg3LjAwLDI1MC45MCA2ODUuNTQsMjUzLjA5IDY4My4wMCwyNTUuMzggWk0gNDI5LjAwIDI0NC43NiBDNDI0Ljc2LDI1Ny43MSA0MjQuMzQsMjU4LjUyIDQyMS43NSwyNTguODIgQzQyMC4wMCwyNTkuMDIgNDE4Ljk4LDI1OC42NiA0MTguOTYsMjU3LjgyIEM0MTguOTMsMjU3LjA5IDQyMS4wNywyNTAuMDkgNDIzLjcxLDI0Mi4yNSBMIDQyOC41MCAyMjguMDEgTCA0MzQuNTUgMjI4LjAwIEwgNDQwLjYxIDIyOC4wMCBMIDQ0NS4zMyAyNDIuNTUgQzQ0Ny45MywyNTAuNTYgNDQ5Ljc5LDI1Ny41MyA0NDkuNDcsMjU4LjA1IEM0NDkuMTUsMjU4LjU3IDQ0Ny44OCwyNTkuMDAgNDQ2LjY2LDI1OS4wMCBDNDQ0LjcwLDI1OS4wMCA0NDMuOTMsMjU3LjQyIDQzOS45MywyNDUuMzIgQzQzNy40NCwyMzcuNzkgNDM0Ljk4LDIzMS41MCA0MzQuNDUsMjMxLjMzIEM0MzMuOTMsMjMxLjE2IDQzMS40OCwyMzcuMjEgNDI5LjAwLDI0NC43NiBaTSA3MzUuMDAgMjU0LjAwIEM3MzUuMDAsMjU4LjU3IDczNC44MCwyNTkuMDAgNzMyLjY3LDI1OS4wMCBDNzI5LjU0LDI1OS4wMCA3MjkuMDAsMjU4LjI5IDcyOS4wMCwyNTQuMTcgQzcyOS4wMCwyNTEuODkgNzI3LjA3LDI0Ni45MCA3MjMuNTAsMjM5LjkxIEM3MjAuNDcsMjM0LjAwIDcxOC4wMCwyMjguOTAgNzE4LjAwLDIyOC41OCBDNzE4LjAwLDIyOC4yNiA3MTkuMzQsMjI4LjAwIDcyMC45OSwyMjguMDAgQzcyMy43MiwyMjguMDAgNzI0LjMyLDIyOC42OCA3MjguMDAsMjM2LjAwIEM3MzAuMjEsMjQwLjQwIDczMi4yMCwyNDQuMDAgNzMyLjQxLDI0NC4wMCBDNzMyLjYzLDI0NC4wMCA3MzQuNTAsMjQwLjQwIDczNi41NiwyMzYuMDAgQzczOS45NiwyMjguNzYgNzQwLjU4LDIyOC4wMCA3NDMuMTYsMjI4LjAwIEM3NDQuNzIsMjI4LjAwIDc0Ni4wMCwyMjguMzggNzQ2LjAwLDIyOC44MyBDNzQ2LjAwLDIyOS4yOSA3NDQuMzcsMjMzLjAxIDc0Mi4zOSwyMzcuMDggQzc0MC40MCwyNDEuMTYgNzM4LjM4LDI0NS41MSA3MzcuOTEsMjQ2Ljc1IEM3MzcuNDQsMjQ3Ljk5IDczNi41OSwyNDkuMDAgNzM2LjAyLDI0OS4wMCBDNzM1LjQ2LDI0OS4wMCA3MzUuMDAsMjUxLjI1IDczNS4wMCwyNTQuMDAgWk0gNTYzLjgyIDI1NS43NSBMIDU2My41MCAyNTguNTAgTCA1NTMuMjUgMjU4Ljc4IEwgNTQzLjAwIDI1OS4wNyBMIDU0My4wMCAyNTMuMDAgTCA1NjQuMTMgMjUzLjAwIFpNIDU2My44MiAyMzAuNzUgTCA1NjMuNTAgMjMzLjUwIEwgNTUzLjk1IDIzMy43OCBDNTQ4LjcwLDIzMy45NCA1NDQuMDksMjMzLjc1IDU0My43MCwyMzMuMzcgQzU0My4zMiwyMzIuOTggNTQzLjAwLDIzMS42MiA1NDMuMDAsMjMwLjMzIEM1NDMuMDAsMjI4LjA0IDU0My4xNiwyMjguMDAgNTUzLjU3LDIyOC4wMCBMIDU2NC4xMyAyMjguMDAgWk0gNTYzLjgyIDI0My4yNSBDNTYzLjUyLDI0NS4zOSA1NjMuMDIsMjQ1LjUxIDU1My4yNSwyNDUuNzggTCA1NDMuMDAgMjQ2LjA3IEwgNTQzLjAwIDI0MS4wMCBMIDU1My41NyAyNDEuMDAgQzU2My45NiwyNDEuMDAgNTY0LjEzLDI0MS4wNCA1NjMuODIsMjQzLjI1IFoiIGZpbGw9IiNmZmZmZmYiLz48L3N2Zz4=" alt="Outlier OS" height="28" style="display:block;height:28px;border:0;" />
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

export async function POST(request: Request) {
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

    const [{ global: g, members }, overdueTasksResult] = await Promise.all([
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
    const dateLabel = fmtDate(y);
    const subject   = `Relatório Diário Outlier OS: ${dateLabel}`;
    const html      = buildEmailHtml(dateLabel, g, members, overdueTasks);

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
