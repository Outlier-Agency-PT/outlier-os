import { createClient } from "@/lib/supabase/server";

export interface SupportTicket {
  id: string;
  student_id: string;
  subject: string;
  body: string;
  status: "aberto" | "em_analise" | "resolvido";
  priority: "normal" | "urgente";
  created_at: string;
  updated_at: string;
  reply_count: number;
}

export interface SupportTicketReply {
  id: string;
  ticket_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export interface SupportTicketDetail extends SupportTicket {
  replies: SupportTicketReply[];
}

export interface SupportTicketWithStudent extends SupportTicket {
  student_name: string;
}

// ── Tickets do aluno (vista do aluno) ────────────────────────────────────────

export async function getStudentTickets(userId: string): Promise<SupportTicket[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("support_tickets")
    .select("*, reply_count:support_ticket_replies(count)")
    .eq("student_id", userId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as any[]).map(rowToTicket);
}

// ── Detalhe de um ticket com thread de respostas ──────────────────────────────

export async function getTicketDetail(ticketId: string): Promise<SupportTicketDetail | null> {
  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("*, reply_count:support_ticket_replies(count)")
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket) return null;

  const { data: replies } = await supabase
    .from("support_ticket_replies")
    .select("id, ticket_id, author_id, body, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  // Resolve author names: team members and students both store user_id separately
  const authorIds = [...new Set(((replies ?? []) as any[]).map((r) => r.author_id))];
  const nameMap: Record<string, string> = {};

  if (authorIds.length > 0) {
    const [{ data: members }, { data: students }] = await Promise.all([
      supabase.from("team_members").select("user_id, full_name").in("user_id", authorIds),
      supabase.from("students").select("user_id, name").in("user_id", authorIds),
    ]);

    for (const m of (members ?? []) as any[]) {
      if (m.user_id) nameMap[m.user_id] = m.full_name;
    }
    for (const s of (students ?? []) as any[]) {
      if (s.user_id && !nameMap[s.user_id]) nameMap[s.user_id] = s.name;
    }
  }

  return {
    ...rowToTicket(ticket),
    replies: ((replies ?? []) as any[]).map((r) => ({
      id: r.id,
      ticket_id: r.ticket_id,
      author_id: r.author_id,
      author_name: nameMap[r.author_id] ?? "Utilizador",
      body: r.body,
      created_at: r.created_at,
    })),
  };
}

// ── Todos os tickets (vista da equipa) ────────────────────────────────────────

export async function getAllTickets(): Promise<SupportTicketWithStudent[]> {
  const supabase = await createClient();

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("*, reply_count:support_ticket_replies(count)")
    .order("status", { ascending: true })      // aberto → em_analise → resolvido
    .order("priority", { ascending: false })   // urgente antes de normal
    .order("created_at", { ascending: false });

  if (!tickets || tickets.length === 0) return [];

  const studentIds = [...new Set((tickets as any[]).map((t) => t.student_id))];
  const { data: students } = await supabase
    .from("students")
    .select("user_id, name")
    .in("user_id", studentIds);

  const nameMap: Record<string, string> = {};
  for (const s of (students ?? []) as any[]) {
    if (s.user_id) nameMap[s.user_id] = s.name;
  }

  return (tickets as any[]).map((row) => ({
    ...rowToTicket(row),
    student_name: nameMap[row.student_id] ?? "Aluno",
  }));
}

// ── Helper ────────────────────────────────────────────────────────────────────

function rowToTicket(row: any): SupportTicket {
  return {
    id: row.id,
    student_id: row.student_id,
    subject: row.subject,
    body: row.body,
    status: row.status,
    priority: row.priority,
    created_at: row.created_at,
    updated_at: row.updated_at,
    reply_count: Number(row.reply_count?.[0]?.count ?? 0),
  };
}
