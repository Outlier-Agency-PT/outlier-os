"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Plus, Trash2, Lock, LayoutTemplate, CalendarDays, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createTaskSpaceAction,
  createTaskListAction,
  renameTaskSpaceAction,
  deleteTaskSpaceAction,
  renameTaskListAction,
  deleteTaskListAction,
} from "@/lib/actions/tasks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { TaskSpace, TaskList } from "@/lib/queries/tasks";

interface TaskSidebarProps {
  initialSpaces: TaskSpace[];
  selectedListId?: string;
  selectedSpaceId?: string;
}

export function TaskSidebar({ initialSpaces, selectedListId, selectedSpaceId }: TaskSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [spaces, setSpaces] = useState<TaskSpace[]>(initialSpaces);
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(
    new Set([initialSpaces[0]?.id]) // Abrir primeiro espaço por defeito
  );

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("task_spaces_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_spaces" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newSpace = payload.new as Omit<TaskSpace, "lists">;
            setSpaces((prev) => [...prev, { ...newSpace, lists: [] }]);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Omit<TaskSpace, "lists">;
            setSpaces((prev) =>
              prev.map((s) => (s.id === updated.id ? { ...updated, lists: s.lists } : s))
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id;
            setSpaces((prev) => prev.filter((s) => s.id !== deletedId));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_lists" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newList = payload.new as TaskList;
            setSpaces((prev) =>
              prev.map((s) =>
                s.id === newList.space_id ? { ...s, lists: [...s.lists, newList] } : s
              )
            );
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as TaskList;
            setSpaces((prev) =>
              prev.map((s) =>
                s.id === updated.space_id
                  ? { ...s, lists: s.lists.map((l) => (l.id === updated.id ? updated : l)) }
                  : s
              )
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id;
            setSpaces((prev) =>
              prev.map((s) => ({ ...s, lists: s.lists.filter((l) => l.id !== deletedId) }))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const [showNewSpace, setShowNewSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceIsPrivate, setNewSpaceIsPrivate] = useState(false);
  const [loadingSpace, setLoadingSpace] = useState(false);
  const [newListSpace, setNewListSpace] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [editingSpaceName, setEditingSpaceName] = useState("");
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState("");
  const [hoveredSpaceId, setHoveredSpaceId] = useState<string | null>(null);
  const [hoveredListId, setHoveredListId] = useState<string | null>(null);

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

  async function handleRenameSpace(id: string) {
    if (!editingSpaceName.trim()) return;
    const result = await renameTaskSpaceAction(id, editingSpaceName.trim());
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Espaço renomeado");
      setEditingSpaceId(null);
    }
  }

  async function handleDeleteSpace(id: string) {
    const result = await deleteTaskSpaceAction(id);
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Espaço eliminado");
      router.push("/tarefas");
    }
  }

  async function handleRenameList(id: string) {
    if (!editingListName.trim()) return;
    const result = await renameTaskListAction(id, editingListName.trim());
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Lista renomeada");
      setEditingListId(null);
    }
  }

  async function handleDeleteList(id: string) {
    const result = await deleteTaskListAction(id);
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Lista eliminada");
      router.push("/tarefas");
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
            <div
              className={cn(
                "w-full flex items-center gap-1 rounded-md text-xs font-medium transition-colors group",
                selectedSpaceId === space.id ? "bg-brand text-white" : "hover:bg-accent",
              )}
              onMouseEnter={() => setHoveredSpaceId(space.id)}
              onMouseLeave={() => setHoveredSpaceId(null)}
            >
              <button
                onClick={() => toggleSpace(space.id)}
                className="flex items-center justify-center p-1.5 shrink-0"
                title={space.is_private ? "Só tu tens acesso" : ""}
              >
                {expandedSpaces.has(space.id) ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>

              {editingSpaceId === space.id ? (
                <div className="flex flex-1 items-center gap-1 py-1 pr-1 min-w-0">
                  <Input
                    value={editingSpaceName}
                    onChange={(e) => setEditingSpaceName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameSpace(space.id);
                      if (e.key === "Escape") setEditingSpaceId(null);
                    }}
                    autoFocus
                    className="h-6 text-xs flex-1 min-w-0 px-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRenameSpace(space.id); }}
                    className="p-0.5 hover:text-green-600 shrink-0"
                  >
                    <Check className="size-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingSpaceId(null); }}
                    className="p-0.5 hover:text-red-500 shrink-0"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    router.push(`?space=${space.id}`);
                    if (!expandedSpaces.has(space.id)) toggleSpace(space.id);
                  }}
                  className="flex flex-1 items-center gap-2 py-1.5 min-w-0"
                >
                  <span
                    className="size-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: space.color }}
                  />
                  <span className="flex-1 text-left truncate">{space.name}</span>
                  {space.is_private && (
                    <Lock className="size-3 flex-shrink-0 text-muted-foreground" />
                  )}
                </button>
              )}

              {editingSpaceId !== space.id && hoveredSpaceId === space.id && (
                <div className="flex items-center shrink-0 pr-1 gap-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSpaceId(space.id);
                      setEditingSpaceName(space.name);
                    }}
                    className="p-0.5 rounded hover:bg-black/10 text-muted-foreground hover:text-foreground"
                    title="Renomear espaço"
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Eliminar espaço "${space.name}"? Esta ação não pode ser desfeita.`)) {
                        handleDeleteSpace(space.id);
                      }
                    }}
                    className="p-0.5 rounded hover:bg-black/10 text-muted-foreground hover:text-red-500"
                    title="Eliminar espaço"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              )}
            </div>

            {expandedSpaces.has(space.id) && (
              <div className="ml-4 space-y-1">
                {space.lists.map((list) => (
                  <div
                    key={list.id}
                    className={cn(
                      "w-full flex items-center rounded-md text-xs transition-colors group",
                      selectedListId === list.id ? "bg-brand text-white" : "hover:bg-accent"
                    )}
                    onMouseEnter={() => setHoveredListId(list.id)}
                    onMouseLeave={() => setHoveredListId(null)}
                  >
                    {editingListId === list.id ? (
                      <div className="flex flex-1 items-center gap-1 px-2 py-1 min-w-0">
                        <Input
                          value={editingListName}
                          onChange={(e) => setEditingListName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameList(list.id);
                            if (e.key === "Escape") setEditingListId(null);
                          }}
                          autoFocus
                          className="h-6 text-xs flex-1 min-w-0 px-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRenameList(list.id); }}
                          className="p-0.5 hover:text-green-600 shrink-0"
                        >
                          <Check className="size-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingListId(null); }}
                          className="p-0.5 hover:text-red-500 shrink-0"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => router.push(`?list=${list.id}`)}
                          className="flex flex-1 items-center gap-2 px-2 py-1.5 min-w-0"
                        >
                          <span
                            className="size-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: list.color }}
                          />
                          <span className="flex-1 text-left truncate">{list.name}</span>
                        </button>
                        {hoveredListId === list.id && (
                          <div className="flex items-center shrink-0 pr-1 gap-0.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingListId(list.id);
                                setEditingListName(list.name);
                              }}
                              className="p-0.5 rounded hover:bg-black/10 text-muted-foreground hover:text-foreground"
                              title="Renomear lista"
                            >
                              <Pencil className="size-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Eliminar lista "${list.name}"? Esta ação não pode ser desfeita.`)) {
                                  handleDeleteList(list.id);
                                }
                              }}
                              className="p-0.5 rounded hover:bg-black/10 text-muted-foreground hover:text-red-500"
                              title="Eliminar lista"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
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
