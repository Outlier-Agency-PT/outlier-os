"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  CheckCircle2,
  RotateCcw,
  Archive,
  Copy,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionStatusBadge } from "@/components/ui/section-status-badge";
import { toast } from "sonner";
import {
  getStudentProductsWithAudienceAction,
  archiveStudentProductAction,
  duplicateStudentProductAction,
  updateProductReviewStatusAction,
} from "@/lib/actions/products";
import {
  ProductFormDialog,
  ESCADA_NIVEIS,
  fmtProductType,
} from "@/components/incubadora/student-products";
import type { StudentProduct } from "@/lib/types/student-launches";
import type { ReviewStatus } from "@/lib/types/review-status";
import { COACH_TRANSITIONS } from "@/lib/types/review-status";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtEur(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "€";
}

function ProductStatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    rascunho: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
    activo:   "border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400",
    inactivo: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-px text-[10px] font-medium ${classes[status] ?? classes.rascunho}`}>
      {status === "rascunho" ? "Rascunho" : status === "activo" ? "Activo" : "Inactivo"}
    </span>
  );
}

// ── ReviewDialog ──────────────────────────────────────────────────────────────

interface ReviewDialogProps {
  product: StudentProduct;
  studentId: string;
  onClose: () => void;
  onSaved: () => void;
}

function ReviewDialog({ product, studentId, onClose, onSaved }: ReviewDialogProps) {
  const [status, setStatus] = useState<ReviewStatus>(product.review_status as ReviewStatus);
  const [notes, setNotes]   = useState(product.review_notes ?? "");
  const [saving, setSaving] = useState(false);

  const transitions = COACH_TRANSITIONS[product.review_status as ReviewStatus] ?? [];

  async function handleSave() {
    setSaving(true);
    const result = await updateProductReviewStatusAction(product.id, studentId, status, notes || null);
    setSaving(false);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Estado de revisão actualizado");
    onSaved();
    onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Revisão — {product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium">Estado de revisão</label>
            <Select value={status} onValueChange={(v) => setStatus(v as ReviewStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {transitions.length === 0 && (
                  <SelectItem value={status} disabled>Sem transições disponíveis</SelectItem>
                )}
                {[status, ...transitions].filter((v, i, a) => a.indexOf(v) === i).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "aprovado" ? "Aprovado"
                      : s === "alteracoes_pedidas" ? "Alterações pedidas"
                      : s === "arquivado" ? "Arquivado"
                      : s === "pronto_revisao" ? "Pronto para revisão"
                      : s === "em_preenchimento" ? "Em preenchimento"
                      : "Não iniciado"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(status === "alteracoes_pedidas" || notes) && (
            <div>
              <label className="mb-1 block text-xs font-medium">
                Notas {status === "alteracoes_pedidas" ? "(obrigatório)" : "(opcional)"}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="O que precisa de ser alterado…"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={saving || (status === "alteracoes_pedidas" && !notes.trim())}
          >
            {saving ? "A guardar…" : "Guardar revisão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface StudentProductsCoachProps {
  studentId: string;
}

export function StudentProductsCoach({ studentId }: StudentProductsCoachProps) {
  const [products, setProducts]         = useState<StudentProduct[]>([]);
  const [audience, setAudience]         = useState<{ id: string; name: string; is_primary: boolean; is_archived: boolean }[]>([]);
  const [loading, setLoading]           = useState(true);
  const [view, setView]                 = useState<"lista" | "escada">("lista");
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen]         = useState(false);
  const [editing, setEditing]           = useState<StudentProduct | null>(null);
  const [reviewProduct, setReviewProduct] = useState<StudentProduct | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getStudentProductsWithAudienceAction(studentId);
    setProducts(res.products);
    setAudience(res.audienceProfiles);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  const activeProducts   = products.filter((p) => !p.is_archived);
  const archivedProducts = products.filter((p) => p.is_archived);
  const list = showArchived ? archivedProducts : activeProducts;

  async function handleArchive(p: StudentProduct) {
    const result = await archiveStudentProductAction(p.id, studentId);
    if ("error" in result) { toast.error(result.error); return; }
    if (result.warning) toast.warning(result.warning, { duration: 6000 });
    else toast.success("Produto arquivado");
    await load();
  }

  async function handleDuplicate(p: StudentProduct) {
    const result = await duplicateStudentProductAction(p.id, studentId);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Produto duplicado");
    await load();
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border text-xs">
            <button
              onClick={() => setView("lista")}
              className={`px-3 py-1.5 transition-colors rounded-l-md ${view === "lista" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              Lista
            </button>
            <button
              onClick={() => setView("escada")}
              className={`px-3 py-1.5 transition-colors rounded-r-md border-l ${view === "escada" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Layers className="mr-1 inline size-3" />Escada
            </button>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => { setEditing(null); setFormOpen(true); }}
        >
          <Plus className="mr-1 size-3.5" /> Novo Produto
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">A carregar…</p>}

      {!loading && view === "lista" && (
        <div className="space-y-2">
          <div className="flex gap-1 text-xs">
            <button
              onClick={() => setShowArchived(false)}
              className={`rounded px-2.5 py-1 font-medium ${!showArchived ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              Activos ({activeProducts.length})
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={`rounded px-2.5 py-1 font-medium ${showArchived ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              Arquivados ({archivedProducts.length})
            </button>
          </div>

          {list.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {showArchived ? "Nenhum produto arquivado." : "Nenhum produto criado."}
            </p>
          )}

          {list.map((p) => {
            const level = p.value_ladder_position != null ? ESCADA_NIVEIS[p.value_ladder_position] : null;
            const transitions = COACH_TRANSITIONS[p.review_status as ReviewStatus] ?? [];
            const pendingReview = p.review_status === "pronto_revisao";

            return (
              <div key={p.id} className="flex items-start gap-3 rounded border bg-background px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-sm">{p.name}</span>
                    <ProductStatusBadge status={p.product_status} />
                    <SectionStatusBadge status={p.review_status as ReviewStatus} />
                    {pendingReview && (
                      <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="size-3" /> Aguarda revisão
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {level && <span>{level.label}</span>}
                    {p.price != null && <span>{fmtEur(p.price)}</span>}
                    {p.product_type && <span>{fmtProductType(p.product_type)}</span>}
                  </div>
                  {p.review_notes && (
                    <p className="mt-1 text-xs text-orange-600 dark:text-orange-400 line-clamp-1">
                      {p.review_notes}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {transitions.length > 0 && (
                    <Button
                      size="sm"
                      variant={pendingReview ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => setReviewProduct(p)}
                    >
                      {pendingReview ? "Rever" : "Revisão"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => { setEditing(p); setFormOpen(true); }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  {!showArchived && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleDuplicate(p)}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => handleArchive(p)}
                      >
                        <Archive className="size-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && view === "escada" && (
        <div className="space-y-2">
          {ESCADA_NIVEIS.map((nivel, idx) => {
            const levelProducts = activeProducts
              .filter((p) => p.value_ladder_position === idx)
              .sort((a, b) => a.sort_order - b.sort_order);
            const range =
              nivel.max === null
                ? `> ${nivel.min.toLocaleString("pt-PT")}€`
                : nivel.min === 0 && nivel.max === 0
                ? "Gratuito"
                : `${nivel.min.toLocaleString("pt-PT")}€ – ${nivel.max.toLocaleString("pt-PT")}€`;

            return (
              <div
                key={nivel.key}
                className={`rounded border ${levelProducts.length > 0 ? "border-foreground/20 bg-muted/20" : "border-dashed border-muted-foreground/20"}`}
              >
                <div className="flex items-center gap-2 px-4 py-2">
                  <span className="text-sm font-medium">{nivel.label}</span>
                  <span className="text-xs text-muted-foreground">{range}</span>
                  {levelProducts.length > 0 && (
                    <Badge className="rounded-full border border-zinc-200 bg-zinc-100 text-[10px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {levelProducts.length}
                    </Badge>
                  )}
                </div>
                {levelProducts.length > 0 && (
                  <div className="border-t px-4 pb-3 pt-2 space-y-1.5">
                    {levelProducts.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 rounded border bg-card px-3 py-1.5">
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium">{p.name}</span>
                          {p.price != null && (
                            <span className="ml-2 text-xs text-muted-foreground">{fmtEur(p.price)}</span>
                          )}
                        </div>
                        <SectionStatusBadge status={p.review_status as ReviewStatus} />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 shrink-0"
                          onClick={() => { setEditing(p); setFormOpen(true); }}
                        >
                          <Pencil className="size-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {levelProducts.length === 0 && (
                  <p className="px-4 pb-2.5 text-xs text-muted-foreground/50">Sem produtos</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Product form dialog */}
      <ProductFormDialog
        open={formOpen}
        product={editing}
        products={products}
        audienceProfiles={audience}
        studentId={studentId}
        isCoach
        onClose={() => setFormOpen(false)}
        onSaved={async () => { setFormOpen(false); await load(); }}
      />

      {/* Review dialog */}
      {reviewProduct && (
        <ReviewDialog
          product={reviewProduct}
          studentId={studentId}
          onClose={() => setReviewProduct(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
