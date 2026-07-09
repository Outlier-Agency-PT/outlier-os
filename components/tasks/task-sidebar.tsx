"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Plus, Trash2, Lock, LayoutTemplate, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTaskSpaceAction, createTaskListAction } from "@/lib/actions/tasks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TaskSpace } from "@/lib/queries/tasks";

interface TaskSidebarProps {
  spaces: TaskSpace[];
  selectedListId?: string;
}

export function TaskSidebar({ spaces, selectedListId }: TaskSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(
    new Set([spaces[0]?.id]) // Abrir primeiro espaço por defeito
  );
  const [showNewSpace, setShowNewSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceIsPrivate, setNewSpaceIsPrivate] = useState(false);
  const [loadingSpace, setLoadingSpace] = useState(false);
  const [newListSpace, setNewListSpace] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [loadingList, setLoadingList] = useState(false);

  const toggleSpace = (spaceId: string) => {
    setExpandedSpaces((prev) => {
      const next = new Set(prev);
      if (next.has(spaceId)) {
        next.delete(spaceId);
      } else {
        next.add(spaceId);
      }
      return next;
    });
  };

  async function handleCreateSpace() {
    if (!newSpaceName.trim()) return;
    setLoadingSpace(true);
    const result = await createTaskSpaceAction(newSpaceName, "#6366f1", newSpaceIsPrivate);
    setLoadingSpace(false);

    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Espaço criado");
      setNewSpaceName("");
      setNewSpaceIsPrivate(false);
      setShowNewSpace(false);
    }
  }

  async function handleCreateList(spaceId: string) {
    if (!newListName.trim()) return;
    setLoadingList(true);
    const result = await createTaskListAction(spaceId, newListName, "#8b5cf6");
    setLoadingList(false);

    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Lista criada");
      setNewListName("");
      setNewListSpace(null);
      setExpandedSpaces((prev) => new Set([...prev, spaceId]));
    }
  }

  return (
    <div className="w-56 border-r bg-muted/20 p-4 space-y-3">
      {/* Link para templates */}
      <button
        onClick={() => router.push("/tarefas/templates")}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
          pathname === "/tarefas/templates"
            ? "bg-brand text-white"
            : "hover:bg-accent text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutTemplate className="size-3.5 shrink-0" />
        Templates
      </button>

      {/* Link para calendário global */}
      <button
        onClick={() => router.push("/tarefas/calendario")}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
          pathname === "/tarefas/calendario"
            ? "bg-brand text-white"
            : "hover:bg-accent text-muted-foreground hover:text-foreground",
        )}
      >
        <CalendarDays className="size-3.5 shrink-0" />
        Calendário
      </button>

      <div className="border-t" />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Espaços</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowNewSpace(!showNewSpace)}
          className="h-6 w-6 p-0"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {showNewSpace && (
        <div className="space-y-2 rounded-lg border bg-background p-2">
          <Input
            placeholder="Nome do espaço..."
            value={newSpaceName}
            onChange={(e) => setNewSpaceName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateSpace();
            }}
            autoFocus
            className="h-8 text-xs"
          />
          <label className="flex items-center gap-2 cursor-pointer px-1 py-1">
            <input
              type="checkbox"
              checked={newSpaceIsPrivate}
              onChange={(e) => setNewSpaceIsPrivate(e.target.checked)}
              className="size-3 rounded"
            />
            <span className="text-xs text-muted-foreground">Privado</span>
          </label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowNewSpace(false);
                setNewSpaceName("");
                setNewSpaceIsPrivate(false);
              }}
              className="h-7 flex-1 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateSpace}
              disabled={loadingSpace || !newSpaceName.trim()}
              className="h-7 flex-1 text-xs"
            >
              {loadingSpace ? "..." : "Criar"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {spaces.map((space) => (
          <div key={space.id} className="space-y-1">
            <button
              onClick={() => toggleSpace(space.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-xs font-medium transition-colors"
              title={space.is_private ? "Só tu tens acesso" : ""}
            >
              {expandedSpaces.has(space.id) ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              <span
                className="size-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: space.color }}
              />
              <span className="flex-1 text-left truncate">{space.name}</span>
              {space.is_private && (
                <Lock className="size-3 flex-shrink-0 text-muted-foreground" />
              )}
            </button>

            {expandedSpaces.has(space.id) && (
              <div className="ml-4 space-y-1">
                {space.lists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => router.push(`?list=${list.id}`)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                      selectedListId === list.id
                        ? "bg-brand text-white"
                        : "hover:bg-accent"
                    )}
                  >
                    <span
                      className="size-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: list.color }}
                    />
                    <span className="flex-1 text-left truncate">{list.name}</span>
                  </button>
                ))}

                <button
                  onClick={() => setNewListSpace(space.id)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent text-xs text-muted-foreground transition-colors"
                >
                  <Plus className="size-3" />
                  <span>Nova lista</span>
                </button>

                {newListSpace === space.id && (
                  <div className="mt-1 space-y-2 rounded-lg border bg-background p-2">
                    <Input
                      placeholder="Nome da lista..."
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateList(space.id);
                      }}
                      autoFocus
                      className="h-8 text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNewListSpace(null);
                          setNewListName("");
                        }}
                        className="h-7 flex-1 text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleCreateList(space.id)}
                        disabled={loadingList || !newListName.trim()}
                        className="h-7 flex-1 text-xs"
                      >
                        {loadingList ? "..." : "Criar"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
