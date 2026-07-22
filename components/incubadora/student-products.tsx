"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Archive,
  Copy,
  Pencil,
  LayoutList,
  Layers,
  AlertTriangle,
  Send,
  ChevronUp,
  ChevronDown,
  X,
  GripVertical,
  RotateCcw,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SectionStatusBadge } from "@/components/ui/section-status-badge";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { toast } from "sonner";
import {
  getMyProductsAction,
  getMyAudienceProfilesForProductsAction,
  createMyProductAction,
  updateMyProductAction,
  archiveStudentProductAction,
  unarchiveStudentProductAction,
  duplicateStudentProductAction,
  submitProductForReviewAction,
  updateProductSortOrderAction,
} from "@/lib/actions/products";
import type {
  StudentProduct,
  ProductBonus,
  ContentModule,
  ProductCondicoes,
  ProductLinks,
} from "@/lib/types/student-launches";
import type { ReviewStatus } from "@/lib/types/review-status";
import { ALUNO_TRANSITIONS } from "@/lib/types/review-status";

// ── Constants ─────────────────────────────────────────────────────────────────

export const ESCADA_NIVEIS = [
  { key: "lead_magnet", label: "Lead Magnet / Produto Gratuito", min: 0, max: 0 },
  { key: "front_end",   label: "Front End",   min: 0.01,   max: 50 },
  { key: "middle_end",  label: "Middle End",  min: 50.01,  max: 100 },
  { key: "back_end",    label: "Back End",    min: 100.01, max: 500 },
  { key: "high_end",    label: "High End",    min: 500.01, max: 1000 },
  { key: "premium",     label: "Premium",     min: 1000.01, max: 5000 },
  { key: "inner_circle",label: "Inner Circle", min: 5000.01, max: null },
] as const;

export type LadderKey = typeof ESCADA_NIVEIS[number]["key"];

const LADDER_KEY_TO_POSITION: Record<LadderKey, number> = {
  lead_magnet:  0,
  front_end:    1,
  middle_end:   2,
  back_end:     3,
  high_end:     4,
  premium:      5,
  inner_circle: 6,
};

const POSITION_TO_KEY: Record<number, LadderKey> = Object.fromEntries(
  Object.entries(LADDER_KEY_TO_POSITION).map(([k, v]) => [v, k as LadderKey]),
) as Record<number, LadderKey>;

const PRODUCT_FORMATS = [
  "Curso online",
  "Mentoria individual",
  "Mentoria em grupo",
  "Workshop",
  "Webinar",
  "Produto físico",
  "Software / SaaS",
  "Comunidade",
  "Ebook",
  "Evento presencial",
  "Outro",
];

const PRODUCT_STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  activo:   "Activo",
  inactivo: "Inactivo",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtEur(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "€";
}

function getLevelForPrice(price: number | null): LadderKey | null {
  if (price == null) return null;
  for (const nivel of ESCADA_NIVEIS) {
    if (nivel.max === null && price >= nivel.min) return nivel.key;
    if (nivel.max !== null && price >= nivel.min && price <= nivel.max) return nivel.key;
  }
  return null;
}

function priceMatchesLevel(price: number | null, position: number | null): boolean {
  if (price == null || position == null) return true;
  const key = POSITION_TO_KEY[position];
  if (!key) return true;
  const expectedLevel = getLevelForPrice(price);
  return expectedLevel === key;
}

// Detect circular chain: does `targetId` eventually lead back to `startId`?
function hasCircularChain(
  products: StudentProduct[],
  startId: string,
  targetId: string | null,
  direction: "next" | "previous",
  visited = new Set<string>(),
): boolean {
  if (!targetId) return false;
  if (targetId === startId) return true;
  if (visited.has(targetId)) return false;
  visited.add(targetId);
  const target = products.find((p) => p.id === targetId);
  if (!target) return false;
  const next = direction === "next" ? target.next_product_id : target.previous_product_id;
  return hasCircularChain(products, startId, next, direction, visited);
}

// ── ProductStatusBadge ────────────────────────────────────────────────────────

function ProductStatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    rascunho: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
    activo:   "border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400",
    inactivo: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-px text-[10px] font-medium ${classes[status] ?? classes.rascunho}`}>
      {PRODUCT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Default form values ───────────────────────────────────────────────────────

function defaultForm(product?: StudentProduct | null): ProductFormData {
  return {
    name: product?.name ?? "",
    description: product?.description ?? "",
    promise: product?.promise ?? "",
    value_ladder_position: product?.value_ladder_position?.toString() ?? "",
    price: product?.price?.toString() ?? "",
    product_type: product?.product_type ?? "",
    modo_entrega: product?.modo_entrega ?? "",
    estrategia_venda: product?.estrategia_venda ?? "",
    product_status: product?.product_status ?? "rascunho",
    garantia: product?.garantia ?? "",
    // Público
    audiencias: product?.audiencias ?? [],
    // Estrutura
    content_modules: product?.content_modules ?? [],
    // Condições
    condicoes: product?.condicoes ?? {},
    // Bónus
    has_bonus: (product?.bonus?.length ?? 0) > 0,
    bonus: product?.bonus ?? [],
    // Relações
    previous_product_id: product?.previous_product_id ?? null,
    next_product_id: product?.next_product_id ?? null,
    upsells: product?.upsells ?? [],
    downsells: product?.downsells ?? [],
    // Links
    links: product?.links ?? {},
  };
}

interface ProductFormData {
  name: string;
  description: string;
  promise: string;
  value_ladder_position: string;
  price: string;
  product_type: string;
  modo_entrega: string;
  estrategia_venda: string;
  product_status: string;
  garantia: string;
  audiencias: string[];
  content_modules: ContentModule[];
  condicoes: ProductCondicoes;
  has_bonus: boolean;
  bonus: ProductBonus[];
  previous_product_id: string | null;
  next_product_id: string | null;
  upsells: string[];
  downsells: string[];
  links: ProductLinks;
}

// ── SortableProductCard (for escada de valor drag) ───────────────────────────

function SortableProductCard({
  product,
  onEdit,
}: {
  product: StudentProduct;
  onEdit: (p: StudentProduct) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded border bg-card px-3 py-2"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{product.name}</p>
        <p className="text-xs text-muted-foreground">
          {product.price != null ? fmtEur(product.price) : "Sem preço"}
          {product.product_type ? ` · ${product.product_type}` : ""}
        </p>
      </div>
      <ProductStatusBadge status={product.product_status} />
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => onEdit(product)}>
        <Pencil className="size-3.5" />
      </Button>
    </div>
  );
}

// ── ProductFormDialog ─────────────────────────────────────────────────────────

interface ProductFormDialogProps {
  open: boolean;
  product: StudentProduct | null;
  products: StudentProduct[];
  audienceProfiles: { id: string; name: string; is_primary: boolean }[];
  studentId?: string; // for coach; if absent, uses "my" actions
  isCoach?: boolean;
  onClose: () => void;
  onSaved: (p: StudentProduct) => void;
}

export function ProductFormDialog({
  open,
  product,
  products,
  audienceProfiles,
  studentId,
  isCoach = false,
  onClose,
  onSaved,
}: ProductFormDialogProps) {
  const [form, setForm] = useState<ProductFormData>(() => defaultForm(product));
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setForm(defaultForm(product));
  }, [open, product]);

  const set = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Price / level mismatch warning
  const priceNum = form.price ? Number(form.price) : null;
  const levelPos = form.value_ladder_position ? Number(form.value_ladder_position) : null;
  const priceMismatch = !priceMatchesLevel(priceNum, levelPos);

  const otherProducts = products.filter((p) => p.id !== product?.id && !p.is_archived);

  // Circular chain detection for previous/next
  const nextCircular = product
    ? hasCircularChain(products, product.id, form.next_product_id, "next")
    : false;
  const prevCircular = product
    ? hasCircularChain(products, product.id, form.previous_product_id, "previous")
    : false;

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Nome obrigatório"); return; }
    if (!form.value_ladder_position) { toast.error("Nível da escada obrigatório"); return; }
    if (!form.price) { toast.error("Preço obrigatório"); return; }

    setSaving(true);
    const payload = buildPayload(form);

    let result;
    if (product) {
      if (studentId) {
        const { updateStudentProductAction } = await import("@/lib/actions/student-launches");
        result = await updateStudentProductAction(product.id, studentId, payload as any);
      } else {
        result = await updateMyProductAction(product.id, payload as any);
      }
    } else {
      if (studentId) {
        const { createStudentProductAction } = await import("@/lib/actions/student-launches");
        result = await createStudentProductAction(studentId, payload as any);
      } else {
        result = await createMyProductAction(payload as any);
      }
    }

    setSaving(false);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success(product ? "Produto guardado" : "Produto criado");
    onSaved((result as { data: StudentProduct }).data);
  }

  async function handleSubmitForReview() {
    if (!product) return;
    const sid = studentId ?? await resolveMyStudentId();
    if (!sid) return;
    setSubmitting(true);
    const result = await submitProductForReviewAction(product.id, sid);
    setSubmitting(false);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Enviado para revisão");
    onClose();
  }

  const autoSave = useAutosave(async (data: ProductFormData) => {
    if (!product) return;
    const payload = buildPayload(data);
    if (studentId) {
      const { updateStudentProductAction } = await import("@/lib/actions/student-launches");
      await updateStudentProductAction(product.id, studentId, payload as any);
    } else {
      await updateMyProductAction(product.id, payload as any);
    }
  }, 1500);

  function handleChange<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    const next = { ...form, [key]: value };
    setForm(next);
    if (product) autoSave(next);
  }

  const canSubmitForReview =
    !isCoach &&
    product &&
    ALUNO_TRANSITIONS[product.review_status as ReviewStatus]?.includes("pronto_revisao");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="flex-none border-b px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle>{product ? "Editar Produto" : "Novo Produto"}</DialogTitle>
              {product && (
                <div className="flex items-center gap-2">
                  <SectionStatusBadge status={product.review_status as ReviewStatus} />
                  <ProductStatusBadge status={product.product_status} />
                </div>
              )}
            </div>
            {canSubmitForReview && (
              <Button
                size="sm"
                variant="outline"
                disabled={submitting}
                onClick={handleSubmitForReview}
                className="shrink-0"
              >
                <Send className="mr-1.5 size-3.5" />
                {submitting ? "A enviar…" : "Enviar para revisão"}
              </Button>
            )}
          </div>
          {product?.review_status === "alteracoes_pedidas" && product.review_notes && (
            <div className="mt-2 rounded border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400">
              <span className="font-semibold">Coach: </span>{product.review_notes}
            </div>
          )}
        </DialogHeader>

        <Tabs defaultValue="principal" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-6 mt-3 flex-none justify-start rounded-none border-b bg-transparent p-0">
            {[
              ["principal",  "Principal"],
              ["estrutura",  "Estrutura"],
              ["condicoes",  "Condições"],
              ["bonus",      "Bónus"],
              ["relacoes",   "Relações"],
              ["links",      "Links"],
            ].map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-none border-b-2 border-transparent px-4 py-2 text-xs font-medium data-[state=active]:border-foreground data-[state=active]:text-foreground"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            {/* ── Tab: Principal ──────────────────────────────────────────── */}
            <TabsContent value="principal" className="mt-0 p-6 space-y-5">
              <Section title="Informação Principal">
                <div className="space-y-3">
                  <FieldRow>
                    <Field label="Nome *" className="md:col-span-2">
                      <Input
                        value={form.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="Nome do produto"
                      />
                    </Field>
                  </FieldRow>

                  <FieldRow cols={3}>
                    <Field label="Nível da Escada *">
                      <Select
                        value={form.value_ladder_position || "none"}
                        onValueChange={(v) => handleChange("value_ladder_position", v === "none" ? "" : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {ESCADA_NIVEIS.map((n, i) => (
                            <SelectItem key={n.key} value={String(i)}>{n.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Preço (€) *">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.price}
                        onChange={(e) => handleChange("price", e.target.value)}
                        placeholder="0.00"
                      />
                      {priceMismatch && form.price && form.value_ladder_position && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="size-3" />
                          Preço não corresponde ao nível seleccionado.
                        </p>
                      )}
                    </Field>

                    <Field label="Formato *">
                      <Select
                        value={form.product_type || "none"}
                        onValueChange={(v) => handleChange("product_type", v === "none" ? "" : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {PRODUCT_FORMATS.map((f) => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldRow>

                  <FieldRow cols={2}>
                    <Field label="Modo de entrega">
                      <Input
                        value={form.modo_entrega}
                        onChange={(e) => handleChange("modo_entrega", e.target.value)}
                        placeholder="ex: Área de membros, ao vivo, etc."
                      />
                    </Field>
                    <Field label="Estado">
                      <Select
                        value={form.product_status}
                        onValueChange={(v) => handleChange("product_status", v)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rascunho">Rascunho</SelectItem>
                          <SelectItem value="activo">Activo</SelectItem>
                          <SelectItem value="inactivo">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldRow>

                  <Field label="Descrição">
                    <Textarea
                      value={form.description}
                      onChange={(e) => handleChange("description", e.target.value)}
                      rows={3}
                      placeholder="Descrição do produto…"
                    />
                  </Field>

                  <Field label="Promessa">
                    <Input
                      value={form.promise}
                      onChange={(e) => handleChange("promise", e.target.value)}
                      placeholder="O que o cliente vai conseguir…"
                    />
                  </Field>

                  <Field label="Estratégia de venda">
                    <Textarea
                      value={form.estrategia_venda}
                      onChange={(e) => handleChange("estrategia_venda", e.target.value)}
                      rows={2}
                      placeholder="Como este produto é vendido…"
                    />
                  </Field>

                  <Field label="Garantia">
                    <Input
                      value={form.garantia}
                      onChange={(e) => handleChange("garantia", e.target.value)}
                      placeholder="ex: 7 dias de garantia incondicional"
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Público">
                {audienceProfiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem perfis de audiência criados ainda.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {audienceProfiles.map((a) => {
                      const selected = form.audiencias.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            const next = selected
                              ? form.audiencias.filter((id) => id !== a.id)
                              : [...form.audiencias, a.id];
                            handleChange("audiencias", next);
                          }}
                          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                            selected
                              ? "border-foreground bg-foreground text-background"
                              : "border-input bg-background text-muted-foreground hover:border-foreground"
                          }`}
                        >
                          {a.name}
                          {a.is_primary && " ★"}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Section>
            </TabsContent>

            {/* ── Tab: Estrutura ──────────────────────────────────────────── */}
            <TabsContent value="estrutura" className="mt-0 p-6">
              <Section title="Módulos e Componentes">
                <div className="space-y-3">
                  {form.content_modules.map((mod, mi) => (
                    <div key={mi} className="rounded border bg-muted/20 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={mod.titulo}
                          onChange={(e) => {
                            const next = [...form.content_modules];
                            next[mi] = { ...next[mi], titulo: e.target.value };
                            handleChange("content_modules", next);
                          }}
                          placeholder={`Módulo ${mi + 1}`}
                          className="h-8 flex-1 text-sm"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            const next = form.content_modules.filter((_, i) => i !== mi);
                            handleChange("content_modules", next);
                          }}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                      <Input
                        value={mod.descricao ?? ""}
                        onChange={(e) => {
                          const next = [...form.content_modules];
                          next[mi] = { ...next[mi], descricao: e.target.value || undefined };
                          handleChange("content_modules", next);
                        }}
                        placeholder="Descrição do módulo (opcional)"
                        className="h-7 text-xs"
                      />
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">Componentes</p>
                        {mod.componentes.map((comp, ci) => (
                          <div key={ci} className="flex items-center gap-1">
                            <Input
                              value={comp}
                              onChange={(e) => {
                                const next = [...form.content_modules];
                                const comps = [...next[mi].componentes];
                                comps[ci] = e.target.value;
                                next[mi] = { ...next[mi], componentes: comps };
                                handleChange("content_modules", next);
                              }}
                              className="h-7 flex-1 text-xs"
                              placeholder={`Componente ${ci + 1}`}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                const next = [...form.content_modules];
                                next[mi] = {
                                  ...next[mi],
                                  componentes: next[mi].componentes.filter((_, i) => i !== ci),
                                };
                                handleChange("content_modules", next);
                              }}
                            >
                              <X className="size-3" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs"
                          onClick={() => {
                            const next = [...form.content_modules];
                            next[mi] = { ...next[mi], componentes: [...next[mi].componentes, ""] };
                            handleChange("content_modules", next);
                          }}
                        >
                          <Plus className="mr-1 size-3" /> Componente
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      handleChange("content_modules", [
                        ...form.content_modules,
                        { titulo: "", componentes: [] },
                      ]);
                    }}
                  >
                    <Plus className="mr-1 size-3.5" /> Adicionar Módulo
                  </Button>
                </div>
              </Section>
            </TabsContent>

            {/* ── Tab: Condições ──────────────────────────────────────────── */}
            <TabsContent value="condicoes" className="mt-0 p-6 space-y-4">
              <Section title="Condições de Venda">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Parcelamento</Label>
                      <p className="text-xs text-muted-foreground">Permite pagamento em prestações</p>
                    </div>
                    <Switch
                      checked={form.condicoes.parcelamento ?? false}
                      onCheckedChange={(v) =>
                        handleChange("condicoes", { ...form.condicoes, parcelamento: v })
                      }
                    />
                  </div>
                  {form.condicoes.parcelamento && (
                    <Field label="Número de prestações">
                      <Input
                        type="number"
                        min={2}
                        value={form.condicoes.num_prestacoes?.toString() ?? ""}
                        onChange={(e) =>
                          handleChange("condicoes", {
                            ...form.condicoes,
                            num_prestacoes: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className="max-w-[120px]"
                      />
                    </Field>
                  )}

                  <div className="flex items-center justify-between border-t pt-4">
                    <div>
                      <Label className="text-sm">Vagas limitadas</Label>
                      <p className="text-xs text-muted-foreground">Limita o número de inscrições</p>
                    </div>
                    <Switch
                      checked={form.condicoes.vagas_limitadas ?? false}
                      onCheckedChange={(v) =>
                        handleChange("condicoes", { ...form.condicoes, vagas_limitadas: v })
                      }
                    />
                  </div>
                  {form.condicoes.vagas_limitadas && (
                    <Field label="Número de vagas">
                      <Input
                        type="number"
                        min={1}
                        value={form.condicoes.num_vagas?.toString() ?? ""}
                        onChange={(e) =>
                          handleChange("condicoes", {
                            ...form.condicoes,
                            num_vagas: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className="max-w-[120px]"
                      />
                    </Field>
                  )}

                  <div className="border-t pt-4">
                    <Field label="Duração do acesso">
                      <Input
                        value={form.condicoes.duracao ?? ""}
                        onChange={(e) =>
                          handleChange("condicoes", {
                            ...form.condicoes,
                            duracao: e.target.value || undefined,
                          })
                        }
                        placeholder="ex: Vitalício, 12 meses, 6 meses…"
                        className="max-w-xs"
                      />
                    </Field>
                  </div>
                </div>
              </Section>
            </TabsContent>

            {/* ── Tab: Bónus ─────────────────────────────────────────────── */}
            <TabsContent value="bonus" className="mt-0 p-6 space-y-4">
              <Section title="Bónus">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Este produto tem bónus</Label>
                    <Switch
                      checked={form.has_bonus}
                      onCheckedChange={(v) => handleChange("has_bonus", v)}
                    />
                  </div>

                  {form.has_bonus && (
                    <div className="space-y-3 pt-2">
                      {form.bonus.map((b, bi) => (
                        <div key={bi} className="rounded border bg-muted/20 p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="flex-1 text-xs font-medium">Bónus {bi + 1}</p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                handleChange("bonus", form.bonus.filter((_, i) => i !== bi));
                              }}
                            >
                              <X className="size-3.5" />
                            </Button>
                          </div>
                          <Input
                            value={b.nome}
                            onChange={(e) => {
                              const next = [...form.bonus];
                              next[bi] = { ...next[bi], nome: e.target.value };
                              handleChange("bonus", next);
                            }}
                            placeholder="Nome do bónus"
                            className="h-8 text-sm"
                          />
                          <Textarea
                            value={b.descricao ?? ""}
                            onChange={(e) => {
                              const next = [...form.bonus];
                              next[bi] = { ...next[bi], descricao: e.target.value || undefined };
                              handleChange("bonus", next);
                            }}
                            placeholder="Descrição"
                            rows={2}
                            className="text-xs"
                          />
                          <div className="grid gap-2 sm:grid-cols-3">
                            <Input
                              value={b.formato ?? ""}
                              onChange={(e) => {
                                const next = [...form.bonus];
                                next[bi] = { ...next[bi], formato: e.target.value || undefined };
                                handleChange("bonus", next);
                              }}
                              placeholder="Formato"
                              className="h-7 text-xs"
                            />
                            <Input
                              value={b.valor_percebido ?? ""}
                              onChange={(e) => {
                                const next = [...form.bonus];
                                next[bi] = { ...next[bi], valor_percebido: e.target.value || undefined };
                                handleChange("bonus", next);
                              }}
                              placeholder="Valor percebido"
                              className="h-7 text-xs"
                            />
                            <Input
                              value={b.disponibilidade ?? ""}
                              onChange={(e) => {
                                const next = [...form.bonus];
                                next[bi] = { ...next[bi], disponibilidade: e.target.value || undefined };
                                handleChange("bonus", next);
                              }}
                              placeholder="Disponibilidade"
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleChange("bonus", [...form.bonus, { nome: "" }])
                        }
                      >
                        <Plus className="mr-1 size-3.5" /> Adicionar Bónus
                      </Button>
                    </div>
                  )}
                </div>
              </Section>
            </TabsContent>

            {/* ── Tab: Relações ───────────────────────────────────────────── */}
            <TabsContent value="relacoes" className="mt-0 p-6 space-y-4">
              <Section title="Escada de Valor — Relações">
                <div className="space-y-4">
                  {(nextCircular || prevCircular) && (
                    <div className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                      Relação circular detectada — guarda o rascunho mas revê as ligações antes de publicar.
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Produto anterior na escada">
                      <Select
                        value={form.previous_product_id ?? "none"}
                        onValueChange={(v) => handleChange("previous_product_id", v === "none" ? null : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="— Nenhum —" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Nenhum —</SelectItem>
                          {otherProducts.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Produto seguinte na escada">
                      <Select
                        value={form.next_product_id ?? "none"}
                        onValueChange={(v) => handleChange("next_product_id", v === "none" ? null : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="— Nenhum —" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Nenhum —</SelectItem>
                          {otherProducts.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium">Possíveis Upsells</p>
                    <div className="flex flex-wrap gap-2">
                      {otherProducts.map((p) => {
                        const sel = form.upsells.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              const next = sel
                                ? form.upsells.filter((id) => id !== p.id)
                                : [...form.upsells, p.id];
                              handleChange("upsells", next);
                            }}
                            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                              sel
                                ? "border-foreground bg-foreground text-background"
                                : "border-input bg-background text-muted-foreground hover:border-foreground"
                            }`}
                          >
                            {p.name}
                          </button>
                        );
                      })}
                      {otherProducts.length === 0 && (
                        <p className="text-xs text-muted-foreground">Sem outros produtos.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium">Possíveis Downsells</p>
                    <div className="flex flex-wrap gap-2">
                      {otherProducts.map((p) => {
                        const sel = form.downsells.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              const next = sel
                                ? form.downsells.filter((id) => id !== p.id)
                                : [...form.downsells, p.id];
                              handleChange("downsells", next);
                            }}
                            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                              sel
                                ? "border-foreground bg-foreground text-background"
                                : "border-input bg-background text-muted-foreground hover:border-foreground"
                            }`}
                          >
                            {p.name}
                          </button>
                        );
                      })}
                      {otherProducts.length === 0 && (
                        <p className="text-xs text-muted-foreground">Sem outros produtos.</p>
                      )}
                    </div>
                  </div>
                </div>
              </Section>
            </TabsContent>

            {/* ── Tab: Links ──────────────────────────────────────────────── */}
            <TabsContent value="links" className="mt-0 p-6 space-y-4">
              <Section title="Links">
                <div className="space-y-3">
                  <Field label="URL da página de vendas">
                    <Input
                      type="url"
                      value={form.links.pagina ?? ""}
                      onChange={(e) =>
                        handleChange("links", { ...form.links, pagina: e.target.value || undefined })
                      }
                      placeholder="https://…"
                    />
                  </Field>

                  <Field label="URL do checkout">
                    <Input
                      type="url"
                      value={form.links.checkout ?? ""}
                      onChange={(e) =>
                        handleChange("links", { ...form.links, checkout: e.target.value || undefined })
                      }
                      placeholder="https://…"
                    />
                  </Field>

                  <div className="space-y-2">
                    <p className="text-xs font-medium">Recursos adicionais</p>
                    {(form.links.recursos ?? []).map((url, ri) => (
                      <div key={ri} className="flex items-center gap-2">
                        <Input
                          type="url"
                          value={url}
                          onChange={(e) => {
                            const next = [...(form.links.recursos ?? [])];
                            next[ri] = e.target.value;
                            handleChange("links", { ...form.links, recursos: next });
                          }}
                          placeholder="https://…"
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            const next = (form.links.recursos ?? []).filter((_, i) => i !== ri);
                            handleChange("links", { ...form.links, recursos: next });
                          }}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleChange("links", {
                          ...form.links,
                          recursos: [...(form.links.recursos ?? []), ""],
                        });
                      }}
                    >
                      <Plus className="mr-1 size-3.5" /> Adicionar recurso
                    </Button>
                  </div>
                </div>
              </Section>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex-none border-t px-6 py-4 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "A guardar…" : product ? "Guardar alterações" : "Criar produto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Section / Field helpers ───────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function FieldRow({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className={`grid gap-3 ${cols === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium">{label}</label>
      {children}
    </div>
  );
}

// ── buildPayload ──────────────────────────────────────────────────────────────

function buildPayload(form: ProductFormData) {
  return {
    name: form.name.trim(),
    description: form.description || null,
    promise: form.promise || null,
    price: form.price ? Number(form.price) : null,
    product_type: form.product_type || null,
    value_ladder_position: form.value_ladder_position ? Number(form.value_ladder_position) : null,
    modo_entrega: form.modo_entrega || null,
    estrategia_venda: form.estrategia_venda || null,
    product_status: form.product_status,
    garantia: form.garantia || null,
    audiencias: form.audiencias,
    content_modules: form.content_modules,
    condicoes: form.condicoes,
    bonus: form.has_bonus ? form.bonus.filter((b) => b.nome.trim()) : [],
    previous_product_id: form.previous_product_id,
    next_product_id: form.next_product_id,
    upsells: form.upsells,
    downsells: form.downsells,
    links: form.links,
  };
}

// ── resolveMyStudentId helper ─────────────────────────────────────────────────

async function resolveMyStudentId(): Promise<string | null> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.id ?? null;
}

// ── Main StudentProducts component ────────────────────────────────────────────

interface StudentProductsProps {
  studentId?: string;
  isCoach?: boolean;
}

export function StudentProducts({ studentId, isCoach = false }: StudentProductsProps) {
  const [products, setProducts]           = useState<StudentProduct[]>([]);
  const [audienceProfiles, setAudience]   = useState<{ id: string; name: string; is_primary: boolean; is_archived: boolean }[]>([]);
  const [loading, setLoading]             = useState(true);
  const [view, setView]                   = useState<"biblioteca" | "escada">("biblioteca");
  const [showArchived, setShowArchived]   = useState(false);
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [editing, setEditing]             = useState<StudentProduct | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    if (studentId) {
      const { getStudentProductsWithAudienceAction } = await import("@/lib/actions/products");
      const res = await getStudentProductsWithAudienceAction(studentId);
      setProducts(res.products);
      setAudience(res.audienceProfiles);
    } else {
      const [prods, aud] = await Promise.all([
        getMyProductsAction(),
        getMyAudienceProfilesForProductsAction(),
      ]);
      setProducts(prods);
      setAudience(aud);
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  const activeProducts   = products.filter((p) => !p.is_archived);
  const archivedProducts = products.filter((p) => p.is_archived);
  const visibleList      = showArchived ? archivedProducts : activeProducts;

  function openNew()  { setEditing(null); setDialogOpen(true); }
  function openEdit(p: StudentProduct) { setEditing(p); setDialogOpen(true); }

  async function handleArchive(p: StudentProduct) {
    const sid = studentId ?? await resolveMyStudentId();
    if (!sid) return;
    const result = await archiveStudentProductAction(p.id, sid);
    if ("error" in result) { toast.error(result.error); return; }
    if (result.warning) toast.warning(result.warning, { duration: 6000 });
    else toast.success("Produto arquivado");
    await load();
  }

  async function handleUnarchive(p: StudentProduct) {
    const sid = studentId ?? await resolveMyStudentId();
    if (!sid) return;
    const result = await unarchiveStudentProductAction(p.id, sid);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Produto reactivado");
    await load();
  }

  async function handleDuplicate(p: StudentProduct) {
    const sid = studentId ?? await resolveMyStudentId();
    if (!sid) return;
    const result = await duplicateStudentProductAction(p.id, sid);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Produto duplicado");
    await load();
  }

  // ── Drag-and-drop (escada de valor) ────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(event: DragEndEvent, levelProducts: StudentProduct[], _levelIndex: number) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = levelProducts.findIndex((p) => p.id === active.id);
    const newIndex = levelProducts.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(levelProducts, oldIndex, newIndex);
    // Optimistic update
    setProducts((prev) => {
      const others = prev.filter((p) => !levelProducts.find((lp) => lp.id === p.id));
      return [...others, ...reordered.map((p, i) => ({ ...p, sort_order: i }))];
    });
    const sid = studentId ?? await resolveMyStudentId();
    if (sid) {
      await updateProductSortOrderAction(
        reordered.map((p, i) => ({ id: p.id, sort_order: i })),
        sid,
      );
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Produtos</h3>
          {activeProducts.length > 0 && (
            <Badge className="rounded-full border border-zinc-200 bg-zinc-100 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {activeProducts.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-md border">
            <button
              onClick={() => setView("biblioteca")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                view === "biblioteca"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              } rounded-l-md`}
            >
              <LayoutList className="size-3.5" /> Biblioteca
            </button>
            <button
              onClick={() => setView("escada")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                view === "escada"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              } rounded-r-md border-l`}
            >
              <Layers className="size-3.5" /> Escada
            </button>
          </div>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1 size-3.5" /> Novo Produto
          </Button>
        </div>
      </div>

      {loading && (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">A carregar…</div>
      )}

      {!loading && (
        <div className="p-5">
          {/* ── Biblioteca View ───────────────────────────────────────────── */}
          {view === "biblioteca" && (
            <div className="space-y-3">
              {/* Filter: active / archived */}
              <div className="flex gap-1">
                <button
                  onClick={() => setShowArchived(false)}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    !showArchived
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Activos ({activeProducts.length})
                </button>
                <button
                  onClick={() => setShowArchived(true)}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    showArchived
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Arquivados ({archivedProducts.length})
                </button>
              </div>

              {visibleList.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {showArchived ? "Nenhum produto arquivado." : "Nenhum produto criado ainda."}
                </p>
              )}

              {visibleList.map((p) => {
                const level = p.value_ladder_position != null
                  ? ESCADA_NIVEIS[p.value_ladder_position]
                  : null;
                const mismatch = !priceMatchesLevel(p.price, p.value_ladder_position);

                return (
                  <div
                    key={p.id}
                    className="flex items-start gap-3 rounded border bg-background px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm">{p.name}</span>
                        <ProductStatusBadge status={p.product_status} />
                        <SectionStatusBadge status={p.review_status as ReviewStatus} />
                        {mismatch && p.price != null && p.value_ladder_position != null && (
                          <span className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="size-3" /> Preço/nível
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {level && <span>{level.label}</span>}
                        {p.price != null && <span>{fmtEur(p.price)}</span>}
                        {p.product_type && <span>{p.product_type}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {!showArchived && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
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
                      {showArchived && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => handleUnarchive(p)}
                        >
                          <RotateCcw className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Escada de Valor View ─────────────────────────────────────── */}
          {view === "escada" && (
            <div className="space-y-2">
              {ESCADA_NIVEIS.map((nivel, nivelIndex) => {
                const levelProducts = activeProducts
                  .filter((p) => p.value_ladder_position === nivelIndex)
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
                    className={`rounded border ${
                      levelProducts.length > 0
                        ? "border-foreground/20 bg-muted/30"
                        : "border-dashed border-muted-foreground/30"
                    }`}
                  >
                    <div className="flex items-center justify-between px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{nivel.label}</span>
                        <span className="text-xs text-muted-foreground">{range}</span>
                        {levelProducts.length > 0 && (
                          <Badge className="rounded-full border border-zinc-200 bg-zinc-100 text-[10px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {levelProducts.length}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {levelProducts.length > 0 && (
                      <div className="border-t px-4 pb-3 pt-2 space-y-2">
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(e) => handleDragEnd(e, levelProducts, nivelIndex)}
                        >
                          <SortableContext
                            items={levelProducts.map((p) => p.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {levelProducts.map((p) => {
                              const mismatch = !priceMatchesLevel(p.price, p.value_ladder_position);
                              return (
                                <div key={p.id}>
                                  <SortableProductCard product={p} onEdit={openEdit} />
                                  {mismatch && p.price != null && (
                                    <p className="mt-0.5 flex items-center gap-1 pl-6 text-[10px] text-amber-600 dark:text-amber-400">
                                      <AlertTriangle className="size-3" />
                                      Preço {fmtEur(p.price)} não corresponde ao nível.
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </SortableContext>
                        </DndContext>
                      </div>
                    )}

                    {levelProducts.length === 0 && (
                      <p className="px-4 pb-3 text-xs text-muted-foreground/60">Sem produtos neste nível</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ProductFormDialog
        open={dialogOpen}
        product={editing}
        products={products}
        audienceProfiles={audienceProfiles}
        studentId={studentId}
        isCoach={isCoach}
        onClose={() => setDialogOpen(false)}
        onSaved={async () => { setDialogOpen(false); await load(); }}
      />
    </div>
  );
}
