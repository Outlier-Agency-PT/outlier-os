"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Plus, Search, BookOpen, ChevronRight, ChevronDown, FileText, Folder, Users, TrendingUp, Palette, PenLine, Settings, Briefcase, DollarSign, FolderOpen, Target, Circle, Sparkles, Info, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { createProcessAction, updateProcessAction, type ProcessInput, type DecisionData } from "@/lib/actions/processes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/components/processes/rich-text-editor";
import { ChecklistItemsEditor } from "@/components/processes/checklist-items-editor";
import { DOC_TYPES, TEMPLATE_TARGETS, type TemplateTarget } from "@/lib/constants/process-types";
import type { Process, ProcessCategory } from "@/lib/queries/processes";
import type { TeamMember } from "@/lib/types";

interface Props {
  processes: Process[];
  categories: ProcessCategory[];
  members: TeamMember[];
  search: string;
  categoryId: string | null;
  subcategoryFilter: string | null;
  isSemanticSearch?: boolean;
  similarityMap?: Record<string, number>;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'processos-para-clientes': Users,
  'trafego': TrendingUp,
  'design': Palette,
  'copy': PenLine,
  'plataformas-internas': Settings,
  'administrativo': Briefcase,
  'financeiro': DollarSign,
  'gestao-de-projetos': FolderOpen,
  'prospeccao': Target,
  'glossario': BookOpen,
};

function parseSubcategory(subcategory: string): { group: string | null; subgroup: string } {
  const sep = " › ";
  const idx = subcategory.indexOf(sep);
  if (idx === -1) return { group: null, subgroup: subcategory };
  return { group: subcategory.slice(0, idx), subgroup: subcategory.slice(idx + sep.length) };
}

type SidebarItem =
  | { type: "flat"; sub: string }
  | { type: "group"; group: string; children: string[] };

function buildSidebarTree(subs: string[]): SidebarItem[] {
  const items: SidebarItem[] = [];
  const seenGroups = new Set<string>();
  for (const sub of subs) {
    const { group } = parseSubcategory(sub);
    if (group === null) {
      items.push({ type: "flat", sub });
    } else if (!seenGroups.has(group)) {
      seenGroups.add(group);
      items.push({
        type: "group",
        group,
        children: subs.filter((s) => parseSubcategory(s).group === group),
      });
    }
  }
  return items;
}

function buildUrl(params: { search?: string; category?: string | null; subcategory?: string | null }) {
  const p = new URLSearchParams();
  if (params.search) p.set("search", params.search);
  if (params.category) p.set("category", params.category);
  if (params.subcategory) p.set("subcategory", params.subcategory);
  const qs = p.toString();
  return `/processos${qs ? `?${qs}` : ""}`;
}

function normalizedDotClass(normalizedScore: number | undefined): string | null {
  if (normalizedScore === undefined) return null;
  if (normalizedScore >= 0.66) return "bg-green-500";
  if (normalizedScore >= 0.33) return "bg-yellow-500";
  return "bg-orange-400";
}

function ProcessRow({ process, showCategory, normalizedScore }: { process: Process; showCategory?: boolean; normalizedScore?: number }) {
  const dotClass = normalizedDotClass(normalizedScore);
  return (
    <Link href={`/processos/${process.id}`} className="block">
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-accent/50">
        {dotClass ? (
          <span className={cn("size-2 shrink-0 rounded-full", dotClass)} />
        ) : (
          <FileText className="size-3.5 shrink-0 text-muted-foreground/60" />
        )}
        <span className="flex-1 font-normal leading-snug">{process.title}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          {showCategory && process.category && (
            <Badge
              variant="outline"
              className="text-[10px]"
              style={{ borderColor: process.category.color, color: process.category.color }}
            >
              {process.category.label}
            </Badge>
          )}
          {!process.published && (
            <Badge variant="secondary" className="text-[10px]">Rascunho</Badge>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProcessesView({ processes, categories, members, search, categoryId, subcategoryFilter, isSemanticSearch = false, similarityMap = {} }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const currentProcessId = pathname.startsWith("/processos/") ? pathname.split("/")[2] ?? null : null;
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(search);
  const isFirstRender = useRef(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() =>
    categoryId ? new Set([categoryId]) : new Set()
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      router.push(buildUrl({ search: searchInput, category: categoryId, subcategory: subcategoryFilter }));
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (categoryId) {
      setExpandedCategories((prev) => {
        if (prev.has(categoryId)) return prev;
        return new Set([...prev, categoryId]);
      });
    }
  }, [categoryId]);

  const handleCategory = useCallback((id: string | null) => {
    router.push(buildUrl({ search: searchInput, category: id, subcategory: null }));
  }, [searchInput, router]);

  const handleSubcategory = useCallback((catId: string, sub: string) => {
    const isAlreadyActive = categoryId === catId && subcategoryFilter === sub;
    router.push(buildUrl({ search: searchInput, category: catId, subcategory: isAlreadyActive ? null : sub }));
  }, [searchInput, router, categoryId, subcategoryFilter]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Subcategories per category, preserving insertion order
  const subcategoriesByCategory = new Map<string, string[]>();
  for (const p of processes) {
    if (p.category_id && p.subcategory) {
      if (!subcategoriesByCategory.has(p.category_id)) subcategoriesByCategory.set(p.category_id, []);
      const list = subcategoriesByCategory.get(p.category_id)!;
      if (!list.includes(p.subcategory)) list.push(p.subcategory);
    }
  }

  const isSearching = Boolean(search);

  // Root doc: process with no category (top-level library guide)
  const rootDoc = !isSearching ? processes.find((p) => p.category_id === null) : null;

  // For grouped view: only processes that belong to a category
  const mainProcesses = processes.filter((p) => p.category_id !== null);
  const visibleMain = categoryId
    ? mainProcesses.filter((p) => p.category_id === categoryId)
    : mainProcesses;

  // Group by category, preserving sort_order from categories array
  const byCategoryId = new Map<string, Process[]>();
  for (const p of visibleMain) {
    if (!p.category_id) continue;
    if (!byCategoryId.has(p.category_id)) byCategoryId.set(p.category_id, []);
    byCategoryId.get(p.category_id)!.push(p);
  }
  const categoryGroups = categories
    .filter((c) => byCategoryId.has(c.id))
    .map((c) => ({ category: c, processes: byCategoryId.get(c.id)! }));

  return (
    <div className="grid grid-cols-[200px_1fr]">
      {/* LEFT SIDEBAR */}
      <aside className="border-r bg-muted/30 p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Categorias
        </p>
        <div className="space-y-1">
          <button
            onClick={() => handleCategory(null)}
            className={cn(
              "block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors",
              !categoryId ? "bg-accent" : "hover:bg-accent/50",
            )}
          >
            Todos ({processes.length})
          </button>
          {categories.map((c) => {
            const isActive = categoryId === c.id;
            const isExpanded = expandedCategories.has(c.id);
            const subs = subcategoriesByCategory.get(c.id) ?? [];
            return (
              <div key={c.id}>
                <div
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                    isActive && !subcategoryFilter ? "bg-accent" : "hover:bg-accent/50",
                  )}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleExpanded(c.id); }}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={isExpanded ? "Fechar" : "Expandir"}
                  >
                    {isExpanded
                      ? <ChevronDown className="size-3" />
                      : <ChevronRight className="size-3" />
                    }
                  </button>
                  <button
                    onClick={() => handleCategory(c.id)}
                    className="flex flex-1 items-center gap-2 font-medium"
                  >
                    {(() => { const Icon = CATEGORY_ICONS[c.key] ?? Circle; return <Icon className="size-4 shrink-0" style={{ color: c.color }} />; })()}
                    <span className="flex-1 text-left">{c.label}</span>
                  </button>
                </div>
                {isExpanded && subs.length > 0 && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border">
                    {buildSidebarTree(subs).map((item) => {
                      if (item.type === "flat") {
                        const isSubActive = isActive && subcategoryFilter === item.sub;
                        const subProcs = isSubActive
                          ? processes.filter((p) => p.category_id === c.id && p.subcategory === item.sub)
                          : [];
                        return (
                          <div key={item.sub}>
                            <button
                              onClick={() => handleSubcategory(c.id, item.sub)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-md py-1 pl-8 pr-3 text-left text-sm text-muted-foreground transition-colors",
                                isSubActive
                                  ? "bg-accent/50 font-medium text-foreground"
                                  : "hover:bg-accent/50 hover:text-foreground",
                              )}
                            >
                              <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                              {item.sub}
                            </button>
                            {subProcs.map((p) => (
                              <Link
                                key={p.id}
                                href={`/processos/${p.id}`}
                                className={cn(
                                  "flex items-center gap-1.5 py-0.5 pl-10 pr-3 text-xs text-muted-foreground transition-colors hover:text-foreground",
                                  currentProcessId === p.id && "font-medium text-foreground",
                                )}
                              >
                                <FileText className="size-3 shrink-0 text-muted-foreground/50" />
                                <span className="truncate">{p.title}</span>
                              </Link>
                            ))}
                          </div>
                        );
                      }
                      const groupPrefix = item.group + " › ";
                      const isGroupActive = isActive && (
                        subcategoryFilter === groupPrefix ||
                        item.children.some((fullSub) => subcategoryFilter === fullSub)
                      );
                      const groupProcs = isActive && subcategoryFilter === groupPrefix
                        ? processes.filter((p) => p.category_id === c.id && p.subcategory?.startsWith(groupPrefix))
                        : [];
                      return (
                        <div key={item.group}>
                          <button
                            onClick={() => handleSubcategory(c.id, groupPrefix)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md py-1 pl-8 pr-3 text-left text-sm font-medium transition-colors",
                              isGroupActive
                                ? "bg-accent text-foreground"
                                : "text-foreground hover:bg-accent/50",
                            )}
                          >
                            <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                            {item.group}
                          </button>
                          {groupProcs.map((p) => (
                            <Link
                              key={p.id}
                              href={`/processos/${p.id}`}
                              className={cn(
                                "flex items-center gap-1.5 py-0.5 pl-16 pr-3 text-xs text-muted-foreground transition-colors hover:text-foreground",
                                currentProcessId === p.id && "font-medium text-foreground",
                              )}
                            >
                              <FileText className="size-3 shrink-0 text-muted-foreground/50" />
                              <span className="truncate">{p.title}</span>
                            </Link>
                          ))}
                          <div className="ml-8 border-l border-border">
                            {item.children.map((fullSub) => {
                              const { subgroup } = parseSubcategory(fullSub);
                              const isSubActive = isActive && subcategoryFilter === fullSub;
                              return (
                                <div key={fullSub}>
                                  <button
                                    onClick={() => handleSubcategory(c.id, fullSub)}
                                    className={cn(
                                      "flex w-full items-center gap-2 py-1 pl-6 pr-3 text-left text-xs text-muted-foreground transition-colors hover:text-foreground",
                                      isSubActive && "font-medium text-foreground",
                                    )}
                                  >
                                    <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                                    {subgroup}
                                  </button>
                                  {isSubActive && processes
                                    .filter((p) => p.category_id === c.id && p.subcategory === fullSub)
                                    .map((p) => (
                                      <Link
                                        key={p.id}
                                        href={`/processos/${p.id}`}
                                        className={cn(
                                          "flex items-center gap-1.5 py-0.5 pl-8 pr-3 text-xs text-muted-foreground transition-colors hover:text-foreground",
                                          currentProcessId === p.id && "font-medium text-foreground",
                                        )}
                                      >
                                        <FileText className="size-3 shrink-0 text-muted-foreground/50" />
                                        <span className="truncate">{p.title}</span>
                                      </Link>
                                    ))
                                  }
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* RIGHT CONTENT */}
      <div className="flex flex-col">
        {/* TOP BAR */}
        <div className="flex items-center gap-2 border-b px-6 py-4">
          <div className="flex flex-1 max-w-md items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Pesquisar processos..."
                className="pl-9"
              />
            </div>
            {isSemanticSearch && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                <Sparkles className="size-3" /> Pesquisa inteligente
                <div className="relative group">
                  <Info className="size-3.5 text-muted-foreground cursor-help" />
                  <div className="absolute left-0 top-5 z-50 hidden group-hover:block w-48 rounded-md border border-border bg-popover p-2 text-xs text-muted-foreground shadow-md">
                    <div className="flex items-center gap-1.5 mb-1"><span className="size-2 rounded-full bg-green-500 shrink-0" /> Alta relevância (para esta pesquisa)</div>
                    <div className="flex items-center gap-1.5 mb-1"><span className="size-2 rounded-full bg-yellow-500 shrink-0" /> Média relevância (para esta pesquisa)</div>
                    <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-orange-400 shrink-0" /> Baixa relevância (para esta pesquisa)</div>
                  </div>
                </div>
              </span>
            )}
          </div>
          <Button onClick={() => setOpen(true)} className="ml-auto">
            <Plus />
            Novo Processo
          </Button>
        </div>

        <div className="flex-1 p-6">
          {isSearching ? (
            /* SEARCH MODE — flat list with category badge */
            processes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem resultados para &ldquo;{search}&rdquo;.
              </p>
            ) : (
              <div className="rounded-md border divide-y">
                {(() => {
                  const scores = Object.values(similarityMap);
                  const maxS = scores.length ? Math.max(...scores) : 1;
                  const minS = scores.length ? Math.min(...scores) : 0;
                  const range = maxS - minS || 1;
                  return processes.map((p) => {
                    const sim = similarityMap[p.id];
                    const normalizedScore = sim !== undefined ? (sim - minS) / range : undefined;
                    return <ProcessRow key={p.id} process={p} showCategory normalizedScore={normalizedScore} />;
                  });
                })()}
              </div>
            )
          ) : (
            /* GROUPED MODE — category → subcategory → processes */
            <div className="space-y-8">
              {/* Root doc banner */}
              {rootDoc && (
                <Link href={`/processos/${rootDoc.id}`} className="block">
                  <div className="flex items-center gap-4 rounded-lg border bg-accent/30 px-5 py-4 transition-colors hover:bg-accent/50">
                    <BookOpen className="size-5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">{rootDoc.title}</p>
                      {rootDoc.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {rootDoc.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              )}

              {/* Category groups */}
              {categoryGroups.length === 0 && !rootDoc ? (
                <p className="text-sm text-muted-foreground">
                  {categoryId
                    ? "Sem processos nesta categoria."
                    : "Sem processos. Cria o primeiro."}
                </p>
              ) : (
                categoryGroups.map(({ category, processes: catProcesses }) => {
                  // Split: direct items (no subcategory) vs subcategory groups
                  const directItems: Process[] = [];
                  const subMap = new Map<string, Process[]>();
                  for (const p of catProcesses) {
                    if (!p.subcategory) {
                      directItems.push(p);
                    } else {
                      if (!subMap.has(p.subcategory)) subMap.set(p.subcategory, []);
                      subMap.get(p.subcategory)!.push(p);
                    }
                  }
                  const subgroups = Array.from(subMap.entries());
                  const visibleSubgroups = subcategoryFilter
                    ? subgroups.filter(([sub]) => sub === subcategoryFilter || sub.startsWith(subcategoryFilter))
                    : subgroups;
                  const showDirectItems = !subcategoryFilter;

                  return (
                    <div key={category.id}>
                      {/* Category header */}
                      <div className="mb-2 flex items-center gap-2">
                        {(() => { const Icon = CATEGORY_ICONS[category.key] ?? Circle; return <Icon className="size-4 shrink-0" style={{ color: category.color }} />; })()}
                        <h2 className="text-sm font-semibold">{category.label}</h2>
                      </div>

                      <div className="rounded-md border divide-y">
                        {/* Direct items — no subcategory header */}
                        {showDirectItems && directItems.map((p) => (
                          <ProcessRow key={p.id} process={p} />
                        ))}

                        {/* Subcategory groups */}
                        {visibleSubgroups.map(([sub, items]) => (
                          <div key={sub}>
                            <p className="bg-muted/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {sub}
                            </p>
                            {items.map((p) => (
                              <ProcessRow key={p.id} process={p} />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      <CreateProcessDialog
        open={open}
        onOpenChange={setOpen}
        categories={categories}
        members={members}
      />
    </div>
  );
}

function defaultDecision(f: ProcessInput): DecisionData {
  return {
    context: f.decision_data?.context ?? "",
    alternatives: f.decision_data?.alternatives ?? "",
    decided_by_id: f.decision_data?.decided_by_id ?? "",
    decided_by_name: f.decision_data?.decided_by_name ?? "",
    decided_at: f.decision_data?.decided_at ?? "",
    impact: f.decision_data?.impact ?? "",
  };
}

export function CreateProcessDialog({
  open,
  onOpenChange,
  categories,
  members,
  initialData,
  processId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: ProcessCategory[];
  members: TeamMember[];
  initialData?: Process;
  processId?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ProcessInput>(
    initialData
      ? {
          title: initialData.title,
          description: initialData.description ?? "",
          doc_type: initialData.doc_type,
          category_id: initialData.category_id ?? "",
          content_md: initialData.content_md ?? "",
          miro_link: initialData.miro_link ?? "",
          tags: initialData.tags ?? [],
          published: initialData.published,
          version: initialData.version ?? null,
          last_reviewed_at: initialData.last_reviewed_at ?? null,
          decision_data: initialData.decision_data ?? null,
          template_target: initialData.template_target ?? null,
        }
      : { title: "", doc_type: "processo", published: true, version: null, last_reviewed_at: null, template_target: null as TemplateTarget | null }
  );
  const [tagsInput, setTagsInput] = useState(
    initialData ? (initialData.tags ?? []).join(", ") : ""
  );
  const isDecision = form.doc_type === "decisao";

  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title,
        description: initialData.description ?? "",
        doc_type: initialData.doc_type,
        category_id: initialData.category_id ?? "",
        content_md: initialData.content_md ?? "",
        miro_link: initialData.miro_link ?? "",
        tags: initialData.tags ?? [],
        published: initialData.published,
        version: initialData.version ?? null,
        last_reviewed_at: initialData.last_reviewed_at ?? null,
        decision_data: initialData.decision_data ?? null,
        template_target: initialData.template_target ?? null,
      });
      setTagsInput((initialData.tags ?? []).join(", "));
    }
  }, [initialData, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

    if (processId) {
      const result = await updateProcessAction(processId, { ...form, tags });
      setLoading(false);
      if (result.errors) {
        toast.error(result.errors[0]);
        return;
      }
      toast.success("Processo actualizado.");
      onSuccess?.();
      onOpenChange(false);
      router.refresh();
      return;
    }

    const result = await createProcessAction({ ...form, tags });
    setLoading(false);
    if ("error" in result && result.error) {
      const msg = "_form" in result.error ? result.error._form?.[0] : Object.values(result.error)[0]?.[0];
      toast.error(msg ?? "Erro");
      return;
    }
    toast.success("Processo criado");
    onOpenChange(false);
    router.refresh();
    if ("data" in result && result.data) {
      router.push(`/processos/${(result.data as { id: string }).id}`);
    }
    setForm({ title: "", doc_type: "processo", published: true });
    setTagsInput("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{processId ? "Editar processo" : "Novo Processo"}</DialogTitle>
          <DialogDescription>Documenta um SOP, checklist, playbook ou decisão.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Descrição breve</Label>
            <Input
              id="desc"
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc_type">Tipo</Label>
            <Select
              value={form.doc_type ?? "processo"}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  doc_type: v as ProcessInput["doc_type"],
                  decision_data: v !== "decisao" ? undefined : f.decision_data,
                  ...(v !== "playbook" && { version: null, last_reviewed_at: null }),
                  ...(v !== "template" && { template_target: null }),
                }))
              }
            >
              <SelectTrigger id="doc_type">
                <SelectValue placeholder="Selecionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.doc_type === "playbook" && (
            <div className="space-y-3 rounded-md border p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Campos do Playbook
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Versão</Label>
                  <Input
                    placeholder="ex: v1.0, v2.3"
                    value={form.version ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, version: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Data de revisão</Label>
                  <DatePicker
                    value={form.last_reviewed_at ?? ""}
                    onChange={(val) =>
                      setForm((f) => ({ ...f, last_reviewed_at: val }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {form.doc_type === "template" && (
            <div className="space-y-3 rounded-md border p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Campos do Template
              </p>
              <div className="space-y-1.5">
                <Label>Destino ao usar o template</Label>
                <Select
                  value={form.template_target ?? ""}
                  onValueChange={(val) =>
                    setForm((f) => ({
                      ...f,
                      template_target: val as TemplateTarget,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar destino..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TARGETS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Define o que é criado quando alguém usa este template.
                </p>
              </div>
            </div>
          )}

          {isDecision && (
            <div className="space-y-3 rounded-md border p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Campos da Decisão
              </p>

              <div className="space-y-1.5">
                <Label>Contexto da decisão *</Label>
                <Textarea
                  placeholder="Qual o problema ou situação que motivou esta decisão?"
                  value={form.decision_data?.context ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      decision_data: { ...defaultDecision(f), context: e.target.value },
                    }))
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Alternativas consideradas *</Label>
                <Textarea
                  placeholder="Quais as opções que foram avaliadas antes desta decisão?"
                  value={form.decision_data?.alternatives ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      decision_data: { ...defaultDecision(f), alternatives: e.target.value },
                    }))
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Quem decidiu</Label>
                <Select
                  value={form.decision_data?.decided_by_id ?? ""}
                  onValueChange={(val) => {
                    const member = members.find((m) => m.id === val);
                    setForm((f) => ({
                      ...f,
                      decision_data: {
                        ...defaultDecision(f),
                        decided_by_id: val,
                        decided_by_name: member?.full_name ?? member?.email ?? "",
                      },
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar membro" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name ?? m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Data da decisão</Label>
                <DatePicker
                  value={form.decision_data?.decided_at ?? ""}
                  onChange={(val) =>
                    setForm((f) => ({
                      ...f,
                      decision_data: { ...defaultDecision(f), decided_at: val },
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Impacto esperado *</Label>
                <Textarea
                  placeholder="O que se espera que mude ou melhore com esta decisão?"
                  value={form.decision_data?.impact ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      decision_data: { ...defaultDecision(f), impact: e.target.value },
                    }))
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat">Categoria</Label>
              <Select
                value={form.category_id ?? ""}
                onValueChange={(v) => setForm((f) => ({ ...f, category_id: v || null }))}
              >
                <SelectTrigger id="cat">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="miro">Link Miro</Label>
              <Input
                id="miro"
                value={form.miro_link ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, miro_link: e.target.value }))}
                placeholder="https://miro.com/..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Separadas por vírgula"
            />
          </div>

          {form.doc_type === "checklist" ? (
            <div className="space-y-1.5">
              <Label>Itens do checklist</Label>
              <ChecklistItemsEditor
                value={form.content_md ?? ""}
                onChange={(md) => setForm((f) => ({ ...f, content_md: md }))}
              />
            </div>
          ) : !isDecision ? (
            <div className="space-y-1.5">
              <RichTextEditor
                value={form.content_md ?? ""}
                onChange={(md) => setForm((f) => ({ ...f, content_md: md }))}
                docType={form.doc_type}
                templateTarget={form.template_target ?? undefined}
                placeholder={
                  form.doc_type === "playbook"
                    ? "## Secção 1\nConteúdo...\n\n## Secção 2\nConteúdo..."
                    : "Descreve o processo passo a passo..."
                }
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? (processId ? "A guardar..." : "A criar...") : (processId ? "Guardar alterações" : "Criar")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
