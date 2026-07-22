"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, MessageCircle, Clock, Send, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getStudentTicketsAction,
  getAllTicketsAction,
  getTicketDetailAction,
  replyToTicketAction,
  updateTicketStatusAction,
} from "@/lib/actions/support";
import type {
  SupportTicket,
  SupportTicketDetail,
  SupportTicketWithStudent,
} from "@/lib/queries/support";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS = {
  aberto:     { label: "Aberto",     cls: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400" },
  em_analise: { label: "Em análise", cls: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400" },
  resolvido:  { label: "Resolvido",  cls: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400" },
} as const;

const STATUS_OPTIONS = [
  { value: "aberto",     label: "Aberto" },
  { value: "em_analise", label: "Em análise" },
  { value: "resolvido",  label: "Resolvido" },
];

const FILTER_TABS = [
  { value: "todos",      label: "Todos" },
  { value: "aberto",     label: "Abertos" },
  { value: "em_analise", label: "Em análise" },
  { value: "resolvido",  label: "Resolvidos" },
] as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ── Ticket thread (staff view) ────────────────────────────────────────────────

interface ThreadProps {
  ticketId: string;
  showStudentName?: boolean;
  onBack: () => void;
  onUpdated: () => void;
}

function StaffTicketThread({ ticketId, showStudentName, onBack, onUpdated }: ThreadProps) {
  const [detail, setDetail] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadDetail() {
    const d = await getTicketDetailAction(ticketId);
    setDetail(d);
    setLoading(false);
  }

  useEffect(() => { loadDetail(); }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.replies.length]);

  async function handleSend() {
    if (!replyBody.trim()) return;
    setSending(true);
    const result = await replyToTicketAction(ticketId, replyBody);
    setSending(false);
    if ("error" in result && result.error) {
      toast.error(typeof result.error === "string" ? result.error : "Erro ao enviar resposta");
      return;
    }
    setReplyBody("");
    await loadDetail();
    onUpdated();
    toast.success("Resposta enviada");
  }

  async function handleStatusChange(newStatus: string) {
    setUpdatingStatus(true);
    const result = await updateTicketStatusAction(
      ticketId,
      newStatus as "aberto" | "em_analise" | "resolvido",
    );
    setUpdatingStatus(false);
    if ("error" in result && result.error) {
      toast.error(typeof result.error === "string" ? result.error : "Erro ao actualizar status");
      return;
    }
    await loadDetail();
    onUpdated();
    toast.success("Status actualizado");
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">A carregar...</div>
    );
  }
  if (!detail) return null;

  const st = STATUS[detail.status] ?? STATUS.aberto;

  return (
    <div className="space-y-0">
      {/* Thread header */}
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{detail.subject}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`rounded-full border text-[10px] font-medium ${st.cls}`}>
            {st.label}
          </Badge>
          {detail.priority === "urgente" && (
            <Badge className="rounded-full border-transparent bg-[#A12B2B] text-white text-[10px]">
              Urgente
            </Badge>
          )}
          <Select
            value={detail.status}
            onValueChange={handleStatusChange}
            disabled={updatingStatus}
          >
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Thread messages */}
      <div className="divide-y">
        <div className="px-4 py-3 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {showStudentName ? "Aluno" : "Tu"}
            </span>
            <Clock className="size-3" />
            <span>{fmtDateTime(detail.created_at)}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{detail.body}</p>
        </div>

        {detail.replies.map((reply) => (
          <div key={reply.id} className="px-4 py-3 bg-muted/30 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{reply.author_name}</span>
              <Clock className="size-3" />
              <span>{fmtDateTime(reply.created_at)}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{reply.body}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="border-t p-4 space-y-2">
        <Textarea
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder="Responde ao aluno..."
          className="resize-none text-sm"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend();
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Ctrl+Enter para enviar</span>
          <Button size="sm" onClick={handleSend} disabled={sending || !replyBody.trim()}>
            <Send className="mr-1.5 size-3" />
            {sending ? "A enviar..." : "Responder"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Ticket row ────────────────────────────────────────────────────────────────

function TicketRow({
  ticket,
  showStudent,
  onClick,
}: {
  ticket: SupportTicket | SupportTicketWithStudent;
  showStudent: boolean;
  onClick: () => void;
}) {
  const st = STATUS[(ticket.status as keyof typeof STATUS)] ?? STATUS.aberto;
  const withStudent = ticket as SupportTicketWithStudent;

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors space-y-1.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {ticket.priority === "urgente" && (
            <AlertTriangle className="size-3.5 text-[#A12B2B] shrink-0" />
          )}
          <p className="text-sm font-medium truncate">{ticket.subject}</p>
        </div>
        <Badge className={`rounded-full border text-[10px] font-medium shrink-0 ${st.cls}`}>
          {st.label}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {showStudent && withStudent.student_name && (
          <span className="font-medium text-foreground">{withStudent.student_name}</span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {fmtDate(ticket.created_at)}
        </span>
        {ticket.reply_count > 0 && (
          <span className="flex items-center gap-1">
            <MessageCircle className="size-3" />
            {ticket.reply_count}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  studentUserId?: string | null;
}

export function StudentSupportDashboard({ studentUserId }: Props) {
  const isGlobal = !studentUserId;
  const [tickets, setTickets] = useState<(SupportTicket | SupportTicketWithStudent)[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"todos" | "aberto" | "em_analise" | "resolvido">("todos");

  function loadTickets() {
    if (studentUserId) {
      getStudentTicketsAction(studentUserId).then((data) => {
        setTickets(data);
        setLoading(false);
      });
    } else {
      getAllTicketsAction().then((data) => {
        setTickets(data);
        setLoading(false);
      });
    }
  }

  useEffect(() => { loadTickets(); }, [studentUserId]);

  const filtered = filter === "todos"
    ? tickets
    : tickets.filter((t) => t.status === filter);

  const openCount = tickets.filter((t) => t.status !== "resolvido").length;

  const cardContent = (
    <>
      {/* Filter tabs */}
      {isGlobal && (
        <div className="flex gap-1 border-b px-4 py-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                filter === tab.value
                  ? "bg-[#A12B2B] text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Thread or list */}
      {selectedId ? (
        <StaffTicketThread
          ticketId={selectedId}
          showStudentName={isGlobal}
          onBack={() => setSelectedId(null)}
          onUpdated={loadTickets}
        />
      ) : loading ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">A carregar...</div>
      ) : filtered.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">
          {tickets.length === 0
            ? isGlobal
              ? "Nenhum ticket de suporte ainda."
              : "Este aluno ainda não submeteu dúvidas."
            : "Nenhum ticket nesta categoria."}
        </div>
      ) : (
        <div className="divide-y">
          {filtered.map((t) => (
            <TicketRow
              key={t.id}
              ticket={t}
              showStudent={isGlobal}
              onClick={() => setSelectedId(t.id)}
            />
          ))}
        </div>
      )}
    </>
  );

  if (isGlobal) {
    return (
      <div className="border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-4 text-[#A12B2B]" />
            <h2 className="font-semibold text-sm">Tickets de Suporte</h2>
            {openCount > 0 && (
              <Badge className="rounded-full border-transparent bg-[#A12B2B] text-white text-xs">
                {openCount} aberto{openCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
        {cardContent}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle className="text-base">Suporte</CardTitle>
        {openCount > 0 && (
          <Badge className="rounded-full border-transparent bg-[#A12B2B] text-white text-xs">
            {openCount}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">{cardContent}</CardContent>
    </Card>
  );
}
