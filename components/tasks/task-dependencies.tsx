"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import {
  addTaskDependencyAction,
  removeTaskDependencyAction,
  getTaskDependenciesAction,
} from "@/lib/actions/tasks";
import { searchGlobalAction, type TaskSearchResult } from "@/lib/actions/search";
import { toast } from "sonner";
import type { TaskDependency, TaskDependencyType } from "@/lib/queries/task-detail";

const TYPE_LABELS: Record<TaskDependencyType, string> = {
  blocks: "Bloqueia",
  blocked_by: "Bloqueado por",
  related: "Relacionado com",
};

interface TaskDependenciesProps {
  taskId: string;
}

export function TaskDependencies({ taskId }: TaskDependenciesProps) {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<TaskDependencyType>("blocks");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TaskSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<TaskSearchResult | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTaskDependenciesAction(taskId).then((deps) => {
      if (!cancelled) setDependencies(deps);
    });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timeout = setTimeout(async () => {
      const res = await searchGlobalAction(query);
      if (!cancelled) {
        setResults(res.tasks.filter((t) => t.id !== taskId));
        setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, taskId]);

  function resetForm() {
    setShowForm(false);
    setQuery("");
    setSelected(null);
    setType("blocks");
  }

  async function handleAdd() {
    if (!selected) return;
    setSaving(true);
    const result = await addTaskDependencyAction(taskId, selected.id, type);
    setSaving(false);

    if ("error" in result && result.error) {
      toast.error(typeof result.error === "string" ? result.error : "Erro ao adicionar dependência");
      return;
    }

    toast.success("Dependência adicionada");
    resetForm();
    const deps = await getTaskDependenciesAction(taskId);
    setDependencies(deps);
  }

  async function handleRemove(dependencyId: string) {
    const result = await removeTaskDependencyAction(dependencyId);
    if ("error" in result && result.error) {
      toast.error("Erro ao remover dependência");
      return;
    }
    setDependencies((prev) => prev.filter((d) => d.id !== dependencyId));
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold">Dependências</Label>

      {dependencies.length > 0 && (
        <div className="space-y-1.5">
          {dependencies.map((dep) => (
            <div
              key={dep.id}
              className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5"
            >
              <div className="min-w-0 text-xs">
                <span className="font-medium text-muted-foreground">{TYPE_LABELS[dep.type]}</span>{" "}
                <span className="truncate">{dep.depends_on?.title ?? "Tarefa removida"}</span>
                {dep.depends_on?.status && (
                  <span className="ml-1.5 inline-block align-middle">
                    <StatusBadge label={dep.depends_on.status.label} color={dep.depends_on.status.color} />
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemove(dep.id)}
                className="h-6 w-6 p-0 shrink-0"
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-2">
          <Select value={type} onValueChange={(v) => setType(v as TaskDependencyType)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blocks">Bloqueia</SelectItem>
              <SelectItem value="blocked_by">Bloqueado por</SelectItem>
              <SelectItem value="related">Relacionado com</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Pesquisar tarefa pelo título..."
            value={selected ? selected.title : query}
            onChange={(e) => {
              setSelected(null);
              setQuery(e.target.value);
            }}
            className="h-8 text-xs"
          />

          {!selected && query.trim() && (
            <div className="max-h-40 overflow-y-auto rounded-md border bg-background">
              {searching ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">A pesquisar...</p>
              ) : results.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">Sem resultados</p>
              ) : (
                results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelected(r);
                      setQuery("");
                    }}
                    className="block w-full truncate px-2 py-1.5 text-left text-xs hover:bg-accent"
                  >
                    {r.title}
                  </button>
                ))
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={resetForm} className="h-7 flex-1 text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={!selected || saving} className="h-7 flex-1 text-xs">
              {saving ? "..." : "Adicionar"}
            </Button>
          </div>
        </div>
      )}

      {!showForm && (
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="w-full text-xs">
          <Plus className="size-3 mr-1" />
          Adicionar dependência
        </Button>
      )}
    </div>
  );
}
