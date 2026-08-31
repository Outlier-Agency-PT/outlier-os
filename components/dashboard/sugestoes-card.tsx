"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Lightbulb, ChevronDown, ChevronUp, X, Paperclip } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

type Attachment = {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
};

type Suggestion = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  rejected_reason: string | null;
  task_id: string | null;
  created_at: string;
  author: { id: string; full_name: string } | null;
  suggestion_attachments: Attachment[];
};

interface Props {
  isAdmin: boolean;
}

export function SugestoesCard({ isAdmin }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, startSubmit] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  // Admin panel
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, startAct] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;

  useEffect(() => {
    if (!isAdmin) return;
    fetchSuggestions();
  }, [isAdmin]);

  async function fetchSuggestions() {
    setLoadingSuggestions(true);
    try {
      const res = await fetch("/api/suggestions");
      const json = await res.json();
      if (json.data) setSuggestions(json.data);
    } catch {
      // ignore
    } finally {
      setLoadingSuggestions(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).filter((f) =>
      f.type.startsWith("image/"),
    );
    setFiles((prev) => [...prev, ...picked]);
    e.target.value = "";
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setFiles([]);
    setSubmitted(false);
  }

  function handleClose(open: boolean) {
    setModalOpen(open);
    if (!open) resetForm();
  }

  function handleSubmit() {
    if (!title.trim() || !description.trim()) {
      toast.error("Preenche o título e a descrição");
      return;
    }
    startSubmit(async () => {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao submeter sugestão");
        return;
      }

      // Upload attachments
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        await fetch(`/api/suggestions/${json.data.id}/attachments`, {
          method: "POST",
          body: fd,
        });
      }

      setSubmitted(true);
      if (isAdmin) fetchSuggestions();
    });
  }

  function handleApprove(id: string) {
    startAct(async () => {
      const res = await fetch(`/api/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) {
        const j = await res.json();
        toast.error(j.error ?? "Erro ao aprovar");
        return;
      }
      toast.success("Sugestão aprovada e tarefa criada no Roadmap");
      fetchSuggestions();
    });
  }

  function handleReject(id: string) {
    startAct(async () => {
      const res = await fetch(`/api/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejected_reason: rejectReason }),
      });
      if (!res.ok) {
        const j = await res.json();
        toast.error(j.error ?? "Erro ao rejeitar");
        return;
      }
      toast.success("Sugestão rejeitada");
      setRejectId(null);
      setRejectReason("");
      fetchSuggestions();
    });
  }

  const pendingSuggestions = suggestions.filter((s) => s.status === "pending");

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Sugestões</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && pendingCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
              </Badge>
            )}
            <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
              + Nova sugestão
            </Button>
          </div>
        </CardHeader>

        {isAdmin && (
          <CardContent className="pt-0">
            {loadingSuggestions ? (
              <p className="text-sm text-muted-foreground">A carregar...</p>
            ) : pendingSuggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem sugestões pendentes.</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setPanelOpen((v) => !v)}
                  className="flex w-full items-center justify-between py-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <span>
                    {panelOpen ? "Ocultar" : "Ver"} sugestões pendentes ({pendingSuggestions.length})
                  </span>
                  {panelOpen ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </button>

                {panelOpen && (
                  <ul className="mt-3 divide-y divide-border">
                    {pendingSuggestions.map((s) => (
                      <li key={s.id} className="py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug">{s.title}</p>
                            {s.author && (
                              <p className="text-[11px] text-muted-foreground">
                                {s.author.full_name} ·{" "}
                                {formatDistanceToNow(new Date(s.created_at), {
                                  addSuffix: true,
                                  locale: pt,
                                })}
                              </p>
                            )}
                            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                              {s.description}
                            </p>

                            {s.suggestion_attachments.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {s.suggestion_attachments.map((att) => (
                                  <a
                                    key={att.id}
                                    href={att.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                  >
                                    {att.file_type.startsWith("image/") ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={att.file_url}
                                        alt={att.file_name}
                                        className="h-16 w-16 rounded border object-cover hover:opacity-80"
                                      />
                                    ) : (
                                      <span className="flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2">
                                        <Paperclip className="size-3" />
                                        {att.file_name}
                                      </span>
                                    )}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {rejectId === s.id ? (
                          <div className="mt-3 space-y-2">
                            <Input
                              placeholder="Motivo da rejeição (opcional)"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(s.id)}
                                disabled={acting}
                              >
                                Confirmar rejeição
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setRejectId(null); setRejectReason(""); }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(s.id)}
                              disabled={acting}
                            >
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectId(s.id)}
                              disabled={acting}
                            >
                              Rejeitar
                            </Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>

      <Dialog open={modalOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova sugestão</DialogTitle>
          </DialogHeader>

          {submitted ? (
            <div className="py-8 text-center">
              <Lightbulb className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="text-sm font-medium">Sugestão submetida!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A equipa de administração vai analisar a tua sugestão.
              </p>
              <Button className="mt-4" onClick={() => handleClose(false)}>
                Fechar
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sug-title">Título</Label>
                  <Input
                    id="sug-title"
                    placeholder="Resumo da tua ideia"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sug-desc">Descrição</Label>
                  <Textarea
                    id="sug-desc"
                    placeholder="Descreve a tua sugestão em detalhe..."
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Imagens{" "}
                    <span className="font-normal text-muted-foreground">(opcional)</span>
                  </Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="mr-1.5 size-3.5" />
                    Adicionar imagem
                  </Button>
                  {files.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {files.map((f, i) => (
                        <div key={i} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={URL.createObjectURL(f)}
                            alt={f.name}
                            className="h-16 w-16 rounded border object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                          >
                            <X className="size-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleClose(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "A submeter..." : "Submeter sugestão"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
