"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Play, FileText, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateTemplateDialog } from "./create-template-dialog";
import { ApplyTemplateDialog } from "./apply-template-dialog";
import { deleteTaskTemplateAction, duplicateTaskTemplateAction } from "@/lib/actions/templates";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TaskTemplate, TaskTemplateCategory } from "@/lib/queries/templates";
import type { TaskSpace } from "@/lib/queries/tasks";

interface Member { id: string; label: string }
interface Status { id: string; label: string; color: string }

interface TemplatesManagerProps {
  templates: TaskTemplate[];
  spaces: TaskSpace[];
  members: Member[];
  categories: TaskTemplateCategory[];
  statuses: Status[];
}

export function TemplatesManager({
  templates,
  spaces,
  members,
  categories,
  statuses,
}: TemplatesManagerProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [applyTarget, setApplyTarget] = useState<TaskTemplate | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  const filtered =
    activeCategory === "all"
      ? templates
      : templates.filter((t) => t.category_id === activeCategory);

  function handleDelete(id: string, name: string) {
    if (!confirm(`Eliminar o template "${name}"? Esta acção não pode ser revertida.`)) return;
    startTransition(async () => {
      const result = await deleteTaskTemplateAction(id);
      if (result.error) toast.error(result.error);
      else toast.success("Template eliminado");
    });
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      const result = await duplicateTaskTemplateAction(id);
      if (result.error) toast.error(result.error);
      else toast.success("Template duplicado");
    });
  }

  return (
    <div className="p-8 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        {/* Filtro de categorias */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "px-3 py-1 text-xs rounded-full border transition-colors",
              activeCategory === "all"
                ? "bg-foreground text-background border-foreground"
                : "hover:bg-accent border-border",
            )}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-3 py-1 text-xs rounded-full border transition-colors",
                activeCategory === cat.id
                  ? "text-white border-transparent"
                  : "hover:bg-accent border-border",
              )}
              style={
                activeCategory === cat.id
                  ? { backgroundColor: cat.color, borderColor: cat.color }
                  : {}
              }
            >
              {cat.name}
            </button>
          ))}
        </div>

        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Novo Template
        </Button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-3">
          <FileText className="size-10 opacity-30" />
          <p className="text-sm">
            {templates.length === 0
              ? "Ainda não existem templates."
              : "Sem templates nesta categoria."}
          </p>
          {templates.length === 0 && (
            <p className="text-xs">
              Cria um template para instantaneamente criar conjuntos de tarefas.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => {
            const rootCount = template.items.length;
            const childCount = template.items.reduce((acc, i) => acc + i.children.length, 0);
            const spaceLabel = spaces.find((s) => s.id === template.space_id)?.name;

            return (
              <div
                key={template.id}
                className="rounded-lg border bg-card p-4 flex flex-col gap-3"
              >
                {/* Header do card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{template.name}</p>
                    {template.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleDuplicate(template.id)}
                      disabled={isPending}
                      title="Duplicar template"
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(template.id, template.name)}
                      disabled={isPending}
                      title="Eliminar template"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5">
                  {template.category_name && (
                    <Badge
                      className="text-[10px] rounded-full px-2.5 py-0.5 border-0 text-white"
                      style={{ backgroundColor: template.category_color ?? "#888" }}
                    >
                      {template.category_name}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px] rounded-full px-2.5 py-0.5">
                    {rootCount} {rootCount === 1 ? "tarefa" : "tarefas"}
                  </Badge>
                  {childCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] rounded-full px-2.5 py-0.5">
                      {childCount} {childCount === 1 ? "subtarefa" : "subtarefas"}
                    </Badge>
                  )}
                  {spaceLabel && (
                    <Badge variant="outline" className="text-[10px] rounded-full px-2.5 py-0.5">
                      {spaceLabel}
                    </Badge>
                  )}
                </div>

                {/* Preview compacto */}
                <ul className="space-y-1 flex-1">
                  {template.items.slice(0, 3).map((item) => (
                    <li key={item.id} className="text-xs text-muted-foreground truncate">
                      · {item.title}
                      {item.day_offset > 0 && (
                        <span className="ml-1 opacity-60">+{item.day_offset}d</span>
                      )}
                    </li>
                  ))}
                  {template.items.length > 3 && (
                    <li className="text-xs text-muted-foreground">
                      + {template.items.length - 3} mais...
                    </li>
                  )}
                </ul>

                <Button
                  size="sm"
                  className="mt-auto"
                  onClick={() => setApplyTarget(template)}
                >
                  <Play className="size-3.5" />
                  Aplicar
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <CreateTemplateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        spaces={spaces}
        categories={categories}
        members={members}
        statuses={statuses}
      />

      <ApplyTemplateDialog
        open={!!applyTarget}
        onOpenChange={(v) => { if (!v) setApplyTarget(null); }}
        template={applyTarget}
        spaces={spaces}
        members={members}
        statuses={statuses}
      />
    </div>
  );
}
