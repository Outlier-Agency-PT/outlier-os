"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Plus, LayoutGrid, Table as TableIcon, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { TaskForm } from "./task-form";
import { TaskSidebar } from "./task-sidebar";
import { TaskDetailPanel } from "./task-detail-panel";
import { moveTaskStatusAction, getTaskDetailAction } from "@/lib/actions/tasks";
import { PRIORITY_LABELS, PRIORITY_COLORS, type TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TaskWithRelations, TaskSpace } from "@/lib/queries/tasks";

interface TasksBoardProps {
  initialTasks: TaskWithRelations[];
  allTasks: TaskWithRelations[];
  statuses: { id: string; key: string; label: string; color: string }[];
  clients: { id: string; label: string }[];
  members: { id: string; label: string; email: string }[];
  spaces: TaskSpace[];
  selectedListId: string;
}

export function TasksBoard({
  initialTasks,
  allTasks,
  statuses,
  clients,
  members,
  spaces,
  selectedListId,
}: TasksBoardProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<"kanban" | "tabela">("kanban");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskData, setSelectedTaskData] = useState<{
    task: TaskWithRelations | null;
    comments: any[];
  }>({ task: null, comments: [] });
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  // Encontrar espaço e lista actuais para o breadcrumb
  const currentSpace = useMemo(() => {
    for (const space of spaces) {
      const list = space.lists?.find((l) => l.id === selectedListId);
      if (list) return { space, list };
    }
    return null;
  }, [spaces, selectedListId]);

  const filtered = useMemo(() => {
    let result = tasks;

    // Filtrar por pesquisa
    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.client?.name.toLowerCase().includes(q) ||
        t.assignee?.full_name.toLowerCase().includes(q),
    );
  }, [tasks, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>();
    for (const s of statuses) map.set(s.id, []);
    for (const t of filtered) {
      if (!t.status_id || !map.has(t.status_id)) continue;
      map.get(t.status_id)!.push(t);
    }
    return map;
  }, [filtered, statuses]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const taskId = String(active.id);
    const overId = String(over.id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Verificar se over é uma tarefa (reordenação) ou uma coluna (mudança de status)
    const overTask = tasks.find((t) => t.id === overId);

    if (overTask) {
      // Reordenação dentro da mesma coluna
      if (overTask.status_id !== task.status_id) return;

      // Reordenar tarefas na coluna
      const columnTasks = tasks.filter((t) => t.status_id === task.status_id);
      const activeIndex = columnTasks.findIndex((t) => t.id === taskId);
      const overIndex = columnTasks.findIndex((t) => t.id === overId);

      if (activeIndex === overIndex) return;

      // Atualizar posições localmente
      const newTasks = [...tasks];
      const [movedTask] = newTasks.splice(activeIndex, 1);
      newTasks.splice(overIndex, 0, movedTask);
      setTasks(newTasks);

      // TODO: Chamar ação para salvar novas posições na BD
    } else {
      // Mudança de coluna (status)
      const newStatusId = overId;
      const targetStatus = statuses.find((s) => s.id === newStatusId);
      if (!targetStatus) return;

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status_id: newStatusId, status: targetStatus }
            : t,
        ),
      );

      const result = await moveTaskStatusAction(taskId, newStatusId);
      if ("error" in result && result.error) {
        toast.error("Falha ao mover tarefa");
        // revert
        setTasks(initialTasks);
      }
    }
  }

  async function handleSelectTask(taskId: string) {
    setSelectedTaskId(taskId);
    startTransition(async () => {
      try {
        const result = await getTaskDetailAction(taskId);
        setSelectedTaskData({
          task: result.task as TaskWithRelations | null,
          comments: result.comments,
        });
      } catch (err) {
        toast.error("Erro ao carregar tarefa");
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-var(--header-height))]">
      {/* Sidebar com espaços e listas */}
      <TaskSidebar
        spaces={spaces}
        selectedListId={selectedListId}
      />

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumb */}
        {currentSpace && (
          <div className="px-8 py-2 text-xs text-muted-foreground border-b">
            <button
              onClick={() => {
                const firstList = currentSpace.space.lists?.[0];
                if (firstList) {
                  router.push(`?list=${firstList.id}`);
                }
              }}
              className="hover:text-foreground transition-colors"
            >
              {currentSpace.space.name}
            </button>
            <span className="mx-1.5">/</span>
            <span className="text-foreground">{currentSpace.list.name}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-b px-8 py-4 bg-background">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar tarefas..."
            className="max-w-xs"
          />
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-md border">
              {[
                { key: "kanban", icon: LayoutGrid, label: "Kanban" },
                { key: "tabela", icon: TableIcon, label: "Tabela" },
              ].map((v) => {
                const Icon = v.icon;
                const active = view === v.key;
                return (
                  <button
                    key={v.key}
                    onClick={() => setView(v.key as "kanban" | "tabela")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors first:rounded-l-md last:rounded-r-md",
                      active ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {v.label}
                  </button>
                );
              })}
            </div>
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              Nova Tarefa
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 bg-canvas">
          {view === "kanban" ? (
            isMounted ? (
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {statuses.map((status) => (
                    <Column
                      key={status.id}
                      status={status}
                      tasks={grouped.get(status.id) ?? []}
                      onTaskClick={handleSelectTask}
                    />
                  ))}
                </div>
              </DndContext>
            ) : null
          ) : (
            <TasksTable tasks={filtered} onTaskClick={handleSelectTask} />
          )}
        </div>
      </div>

      {/* Task Detail Panel */}
      {selectedTaskId && (
        <TaskDetailPanel
          task={selectedTaskData.task}
          comments={selectedTaskData.comments}
          statuses={statuses}
          lists={spaces.flatMap((s) => s.lists)}
          members={members.map((m) => ({ id: m.id, full_name: m.label }))}
          onClose={() => {
            setSelectedTaskId(null);
            setSelectedTaskData({ task: null, comments: [] });
          }}
        />
      )}

      <TaskForm
        open={open}
        onOpenChange={setOpen}
        statuses={statuses.map((s) => ({ id: s.id, label: s.label }))}
        clients={clients}
        members={members.map((m) => ({ id: m.id, label: m.label }))}
        defaultListId={selectedListId}
      />
    </div>
  );
}

function Column({
  status,
  tasks,
  onTaskClick,
}: {
  status: { id: string; label: string; color: string };
  tasks: TaskWithRelations[];
  onTaskClick: (taskId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });

  return (
    <div ref={setNodeRef} className={cn("w-72 shrink-0 rounded-lg border bg-muted/30 p-3 transition-colors", isOver && "bg-muted")}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: status.color }} />
          <h3 className="text-sm font-semibold">{status.label}</h3>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {tasks.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <p className="px-2 text-xs text-muted-foreground">Sem tarefas</p>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task.id)} />)
        )}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onClick,
}: {
  task: TaskWithRelations;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({ id: task.id });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: task.id });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={(e) => {
        if (!isDragging) {
          onClick();
        }
      }}
      className={cn(
        "rounded-md border bg-card p-3 shadow-sm transition-shadow hover:shadow-md hover:bg-accent/50 flex gap-2 select-none",
        isDragging && "opacity-50",
        isOver && "ring-2 ring-primary"
      )}
    >
      <div
        {...listeners}
        style={{ touchAction: "none" }}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground p-0 h-5 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing"
        aria-label="Arrastar tarefa"
        role="button"
      >
        <GripVertical className="size-4" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <p className="text-sm font-medium leading-tight">{task.title}</p>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
            {task.priority !== "sem_prioridade" && (
              <span className={PRIORITY_COLORS[task.priority as TaskPriority]}>
                {PRIORITY_LABELS[task.priority as TaskPriority]}
              </span>
            )}
            <div className="flex items-center gap-1">
              {task.assignee && (
                <span className="text-muted-foreground truncate max-w-24">{task.assignee.full_name}</span>
              )}
              {(task.assignees && task.assignees.length > 1) && (
                <Badge variant="secondary" className="text-[10px] ml-1 px-1.5 py-0">
                  +{task.assignees.length - 1}
                </Badge>
              )}
            </div>
          </div>
          {task.client && (
            <p className="mt-1 truncate text-[10px] text-muted-foreground">{task.client.name}</p>
          )}
        </div>
        {task.estimate_points && (
          <div className="mt-2 flex justify-end">
            <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5">
              {task.estimate_points} pts
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

function TasksTable({
  tasks,
  onTaskClick,
}: {
  tasks: TaskWithRelations[];
  onTaskClick: (taskId: string) => void;
}) {
  if (tasks.length === 0) {
    return <p className="text-center text-sm text-muted-foreground">Sem tarefas.</p>;
  }
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-medium">Título</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Prioridade</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Responsáveis</th>
            <th className="px-4 py-3 font-medium">Estimativa</th>
            <th className="px-4 py-3 font-medium">Data Limite</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tasks.map((t) => (
            <tr
              key={t.id}
              onClick={() => onTaskClick(t.id)}
              className="hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 font-medium">{t.title}</td>
              <td className="px-4 py-3">
                {t.status && <StatusBadge label={t.status.label} color={t.status.color} />}
              </td>
              <td className={cn("px-4 py-3", PRIORITY_COLORS[t.priority as TaskPriority])}>
                {t.priority !== "sem_prioridade" ? PRIORITY_LABELS[t.priority as TaskPriority] : "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{t.client?.name ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span>{t.assignee?.full_name ?? "—"}</span>
                  {(t.assignees && t.assignees.length > 1) && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      +{t.assignees.length - 1}
                    </Badge>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{t.estimate_points ? `${t.estimate_points} pts` : "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{t.due_date ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
