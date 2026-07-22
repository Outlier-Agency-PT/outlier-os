"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  createWhiteboardAction,
  deleteWhiteboardAction,
} from "@/lib/actions/whiteboards";
import type { WhiteboardSummary } from "@/lib/queries/whiteboards";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── New whiteboard dialog ─────────────────────────────────────────────────────

function NewWhiteboardDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const result = await createWhiteboardAction(title, description);
    setSaving(false);
    if ("error" in result && result.error) {
      toast.error(typeof result.error === "string" ? result.error : "Erro ao criar whiteboard");
      return;
    }
    toast.success("Whiteboard criado");
    onClose();
    if ("id" in result && result.id) router.push(`/whiteboard/${result.id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md border border-border bg-card shadow-xl">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold">Novo Whiteboard</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Título *
            </label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Estratégia Q3"
              required
              style={{ borderRadius: 3 }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Descrição
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional…"
              rows={3}
              className="resize-none"
              style={{ borderRadius: 3 }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} size="sm">
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !title.trim()}
              className="bg-[#A12B2B] text-white hover:bg-[#8a2424]"
              style={{ borderRadius: 9999 }}
            >
              {saving ? "A criar…" : "Criar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Whiteboard card ───────────────────────────────────────────────────────────

function WhiteboardCard({
  board,
  isAdmin,
  onDelete,
}: {
  board: WhiteboardSummary;
  isAdmin: boolean;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Eliminar "${board.title}"? Esta acção é irreversível.`)) return;
    setDeleting(true);
    const result = await deleteWhiteboardAction(board.id);
    if ("error" in result && result.error) {
      toast.error(typeof result.error === "string" ? result.error : "Erro ao eliminar");
      setDeleting(false);
      return;
    }
    toast.success("Whiteboard eliminado");
    onDelete(board.id);
  }

  return (
    <div className="group flex flex-col border border-border bg-card transition-shadow hover:shadow-sm">
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug">{board.title}</h3>
          {isAdmin && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="shrink-0 text-muted-foreground/40 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              title="Eliminar whiteboard"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
        {board.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {board.description}
          </p>
        )}
        <div className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-muted-foreground/60">
          <Clock className="size-3" />
          <span>{fmtDate(board.updated_at)}</span>
        </div>
      </div>
      <div className="border-t border-border p-3">
        <Button
          onClick={() => router.push(`/whiteboard/${board.id}`)}
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 text-xs"
        >
          <Pencil className="size-3" />
          Abrir
        </Button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function WhiteboardList({
  whiteboards: initial,
  isAdmin,
}: {
  whiteboards: WhiteboardSummary[];
  isAdmin: boolean;
}) {
  const [boards, setBoards] = useState<WhiteboardSummary[]>(initial);
  const [showDialog, setShowDialog] = useState(false);

  function handleDelete(id: string) {
    setBoards((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="p-4 md:p-8">
      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {boards.length} board{boards.length !== 1 ? "s" : ""}
        </span>
        <Button
          onClick={() => setShowDialog(true)}
          size="sm"
          className="gap-1.5 bg-[#A12B2B] text-white hover:bg-[#8a2424]"
          style={{ borderRadius: 9999 }}
        >
          <Plus className="size-3.5" />
          Novo Whiteboard
        </Button>
      </div>

      {/* Grid */}
      {boards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <p className="text-sm text-muted-foreground">
            Ainda não tens whiteboards. Cria o primeiro para começar.
          </p>
          <Button
            onClick={() => setShowDialog(true)}
            size="sm"
            className="gap-1.5 bg-[#A12B2B] text-white hover:bg-[#8a2424]"
            style={{ borderRadius: 9999 }}
          >
            <Plus className="size-3.5" />
            Criar Whiteboard
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <WhiteboardCard
              key={board.id}
              board={board}
              isAdmin={isAdmin}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showDialog && (
        <NewWhiteboardDialog onClose={() => setShowDialog(false)} />
      )}
    </div>
  );
}
