"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getStudentTickets,
  getTicketDetail,
  getAllTickets,
} from "@/lib/queries/support";
import type {
  SupportTicket,
  SupportTicketDetail,
  SupportTicketWithStudent,
} from "@/lib/queries/support";

// ── Read wrappers (para client components que não podem importar queries) ─────

export async function getStudentTicketsAction(userId: string): Promise<SupportTicket[]> {
  return getStudentTickets(userId);
}

export async function getTicketDetailAction(
  ticketId: string,
): Promise<SupportTicketDetail | null> {
  return getTicketDetail(ticketId);
}

export async function getAllTicketsAction(): Promise<SupportTicketWithStudent[]> {
  return getAllTickets();
}

// ── Criar ticket ──────────────────────────────────────────────────────────────

export async function createTicketAction(
  subject: string,
  body: string,
  priority: "normal" | "urgente" = "normal",
) {
  if (!subject.trim() || !body.trim()) {
    return { error: "Assunto e descrição são obrigatórios" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({ student_id: user.id, subject: subject.trim(), body: body.trim(), priority })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Notificar membros da equipa via service role
  const admin = createAdminClient();
  const [{ data: student }, { data: teamMembers }] = await Promise.all([
    admin.from("students").select("name").eq("user_id", user.id).maybeSingle(),
    admin.from("team_members").select("user_id").eq("active", true),
  ]);

  const studentName = (student as any)?.name ?? "Aluno";
  const recipientIds = ((teamMembers ?? []) as any[])
    .map((m: any) => m.user_id)
    .filter(Boolean) as string[];

  if (recipientIds.length > 0) {
    const isUrgente = priority === "urgente";
    await admin.from("notifications").insert(
      recipientIds.map((uid) => ({
        user_id: uid,
        type: isUrgente ? "ticket_urgente" : "support_ticket_new",
        title: isUrgente ? "Ticket urgente" : "Novo ticket de suporte",
        body: `${studentName}: ${subject.trim()}`,
        link: "/incubadora/suporte",
      })),
    );
  }

  revalidatePath("/incubadora");
  return { data: ticket };
}

// ── Responder a ticket ────────────────────────────────────────────────────────

export async function replyToTicketAction(ticketId: string, body: string) {
  if (!body.trim()) return { error: "Resposta não pode estar vazia" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, subject, student_id")
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket) return { error: "Ticket não encontrado" };

  const { error } = await supabase
    .from("support_ticket_replies")
    .insert({ ticket_id: ticketId, author_id: user.id, body: body.trim() });

  if (error) return { error: error.message };

  await supabase
    .from("support_tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  const admin = createAdminClient();
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  const isStaff = !!teamMember;

  if (isStaff) {
    // Notificar o aluno (se não foi o próprio staff a criar o ticket)
    if ((ticket as any).student_id !== user.id) {
      await admin.from("notifications").insert({
        user_id: (ticket as any).student_id,
        type: "support_ticket_reply",
        title: "Resposta ao teu ticket",
        body: `A tua dúvida "${(ticket as any).subject}" foi respondida`,
        link: "/incubadora",
      });
    }
  } else {
    // Notificar a equipa
    const { data: teamMembers } = await admin
      .from("team_members")
      .select("user_id")
      .eq("active", true);

    const recipientIds = ((teamMembers ?? []) as any[])
      .map((m: any) => m.user_id)
      .filter(Boolean) as string[];

    if (recipientIds.length > 0) {
      await admin.from("notifications").insert(
        recipientIds.map((uid) => ({
          user_id: uid,
          type: "support_ticket_reply",
          title: "Resposta num ticket de suporte",
          body: `Ticket: ${(ticket as any).subject}`,
          link: "/incubadora/suporte",
        })),
      );
    }
  }

  revalidatePath("/incubadora");
  revalidatePath("/incubadora/suporte");
  return { success: true };
}

// ── Actualizar status ─────────────────────────────────────────────────────────

export async function updateTicketStatusAction(
  ticketId: string,
  status: "aberto" | "em_analise" | "resolvido",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: teamMember } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!teamMember) return { error: "Sem permissão" };

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", ticketId)
    .select("subject, student_id")
    .single();

  if (error) return { error: error.message };

  if (status === "resolvido") {
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      user_id: (ticket as any).student_id,
      type: "support_ticket_resolved",
      title: "Ticket resolvido",
      body: `A tua dúvida "${(ticket as any).subject}" foi marcada como resolvida`,
      link: "/incubadora",
    });
  }

  revalidatePath("/incubadora");
  revalidatePath("/incubadora/suporte");
  return { success: true };
}
