"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, MessageCircle, Plus, Clock, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getStudentTicketsAction,
  getTicketDetailAction,
  createTicketAction,
  replyToTicketAction,
} from "@/lib/actions/support";
import type { SupportTicket, SupportTicketDetail } from "@/lib/queries/support";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS = {
  aberto:     { label: "Aberto",     cls: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400" },
  em_analise: { label: "Em análise", cls: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400" },
  resolvido:  { label: "Resolvido",  cls: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400" },
} as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Thread view ───────────────────────────────────────────────────────────────

interface ThreadProps {
  userId: string;
  ticketId: string;
  onBack: () => void;
  onTicketUpdated: () => void;
}

function TicketThread({ userId, ticketId, onBack, onTicketUpdated }: ThreadProps) {
  const [detail, setDetail] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getTicketDetailAction(ticketId).then((d) => {
      setDetail(d);
      setLoading(false);
    });
  }, [ticketId]);

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
    const updated = await getTicketDetailAction(ticketId);
    setDetail(updated);
    onTicketUpdated();
    toast.success("Resposta enviada");
  }

  if (loading) {
    return (
      <div className="border bg-card p-6">
        <p className="text-sm text-muted-foreground">A carregar...</p>
      </div>
    );
  }

  if (!detail) return null;

  const st = STATUS[detail.status] ?? STATUS.aberto;

  return (
    <div className="border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{detail.subject}</p>
        </div>
        <Badge className={`rounded-full border text-[10px] font-medium shrink-0 ${st.cls}`}>
          {st.label}
        </Badge>
        {detail.priority === "urgente" && (
          <Badge className="rounded-full border-transparent bg-[#A12B2B] text-white text-[10px]">
            Urgente
          </Badge>
        )}
      </div>

      {/* Thread */}
      <div className="divide-y">
        {/* Original body */}
        <div className="px-5 py-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Tu</span>
            <Clock className="size-3" />
            <span>{fmtDateTime(detail.created_at)}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{detail.body}</p>
        </div>

        {/* Replies */}
        {detail.replies.map((reply) => {
          const isOwn = reply.author_id === userId;
          return (
            <div key={reply.id} className={`px-5 py-4 space-y-1 ${isOwn ? "" : "bg-muted/30"}`}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{reply.author_name}</span>
                <Clock className="size-3" />
                <span>{fmtDateTime(reply.created_at)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{reply.body}</p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      {detail.status !== "resolvido" && (
        <div className="border-t p-4 space-y-2">
          <Textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Escreve a tua mensagem..."
            className="resize-none text-sm"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend();
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Ctrl+Enter para enviar</span>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending || !replyBody.trim()}
            >
              <Send className="mr-1.5 size-3" />
              {sending ? "A enviar..." : "Enviar"}
            </Button>
          </div>
        </div>
      )}
      {detail.status === "resolvido" && (
        <div className="border-t px-5 py-3 text-xs text-muted-foreground text-center">
          Este ticket foi resolvido. Se tens uma nova dúvida, abre um novo ticket.
        </div>
      )}
    </div>
  );
}

// ── Ticket list card ──────────────────────────────────────────────────────────

function TicketCard({
  ticket,
  onClick,
}: {
  ticket: SupportTicket;
  onClick: () => void;
}) {
  const st = STATUS[ticket.status] ?? STATUS.aberto;
  return (
    <button
      onClick={onClick}
      className="w-full text-left border bg-card p-4 hover:bg-muted/30 transition-colors space-y-2"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug">{ticket.subject}</p>
        <Badge className={`rounded-full border text-[10px] font-medium shrink-0 ${st.cls}`}>
          {st.label}
        </Badge>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {fmtDate(ticket.created_at)}
        </span>
        {ticket.reply_count > 0 && (
          <span className="flex items-center gap-1">
            <MessageCircle className="size-3" />
            {ticket.reply_count} resposta{ticket.reply_count !== 1 ? "s" : ""}
          </span>
        )}
        {ticket.priority === "urgente" && (
          <Badge className="rounded-full border-transparent bg-[#A12B2B] text-white text-[10px]">
            Urgente
          </Badge>
        )}
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  userId: string;
}

export function StudentSupport({ userId }: Props) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ subject: "", body: "", priority: "normal" as "normal" | "urgente" });
  const [saving, setSaving] = useState(false);

  function loadTickets() {
    getStudentTicketsAction(userId).then((data) => {
      setTickets(data);
      setLoading(false);
    });
  }

  useEffect(() => { loadTickets(); }, [userId]);

  async function handleCreate() {
    if (!form.subject.trim() || !form.body.trim()) {
      toast.error("Preenche o assunto e a descrição");
      return;
    }
    setSaving(true);
    const result = await createTicketAction(form.subject, form.body, form.priority);
    setSaving(false);
    if ("error" in result && result.error) {
      toast.error(typeof result.error === "string" ? result.error : "Erro ao criar dúvida");
      return;
    }
    toast.success("Dúvida submetida — a equipa irá responder em breve");
    setShowDialog(false);
    setForm({ subject: "", body: "", priority: "normal" });
    loadTickets();
  }

  if (selectedTicketId) {
    return (
      <TicketThread
        userId={userId}
        ticketId={selectedTicketId}
        onBack={() => setSelectedTicketId(null)}
        onTicketUpdated={loadTickets}
      />
    );
  }

  const openCount = tickets.filter((t) => t.status !== "resolvido").length;

  return (
    <>
      <div className="border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-4 text-[#A12B2B]" />
            <h3 className="font-semibold text-sm">Suporte</h3>
            {openCount > 0 && (
              <Badge className="rounded-full border-transparent bg-[#A12B2B] text-white text-xs">
                {openCount}
              </Badge>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowDialog(true)}>
            <Plus className="mr-1 size-3" />
            Nova Dúvida
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <div className="px-5 py-6 text-sm text-muted-foreground">A carregar...</div>
        ) : tickets.length === 0 ? (
          <div className="px-5 py-6 text-sm text-muted-foreground">
            Ainda não tens dúvidas submetidas. Usa este espaço para colocar as tuas questões à equipa.
          </div>
        ) : (
          <div className="divide-y">
            {tickets.map((t) => (
              <TicketCard key={t.id} ticket={t} onClick={() => setSelectedTicketId(t.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Dialog nova dúvida */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Dúvida</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Assunto</label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Ex: Como criar o meu primeiro post de autoridade?"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Descreve a tua dúvida em detalhe…"
                className="mt-1 resize-none"
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Prioridade</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, priority: "normal" })}
                  className={`flex-1 rounded border py-2 text-sm font-medium transition-colors ${
                    form.priority === "normal"
                      ? "border-[#A12B2B] bg-[#A12B2B]/5 text-[#A12B2B]"
                      : "border-border text-muted-foreground hover:border-foreground"
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, priority: "urgente" })}
                  className={`flex-1 rounded border py-2 text-sm font-medium transition-colors ${
                    form.priority === "urgente"
                      ? "border-[#A12B2B] bg-[#A12B2B] text-white"
                      : "border-border text-muted-foreground hover:border-foreground"
                  }`}
                >
                  Urgente
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !form.subject.trim() || !form.body.trim()}
            >
              {saving ? "A enviar..." : "Enviar Dúvida"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
