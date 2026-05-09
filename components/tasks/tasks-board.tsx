"use client";

import { useState, useMemo } from "react";
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
import { Plus, LayoutGrid, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { TaskForm } from "./task-form";
import { moveTaskStatusAction } from "@/lib/actions/tasks";
import { PRIORITY_LABELS, PRIORITY_COLORS, type TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TaskWithRelations } from "@/lib/queries/tasks";

interface TasksBoardProps {
  tasks: TaskWithRelations[];
  statuses: { id: string; key: string; label: string; color: string }[];
  clients: { id: string; label: string }[];
  members: { id: string; label: string }[];
}

export function TasksBoard({ tasks: initialTasks, statuses, clients, members }: TasksBoardProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<"kanban" | "tabela">("kanban");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const filtered = useMemo(() => {
    if (!search) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(
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
    const newStatusId = String(over.id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status_id === newStatusId) return;

    // Optimistic update
    const targetStatus = statuses.find((s) => s.id === newStatusId);
    if (!targetStatus) return;

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
    } else {
      router.refresh();
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b px-8 py-4">
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
            <Plus />
            Nova Tarefa
          </Button>
        </div>
      </div>

      <div className="p-8">
        {view === "kanban" ? (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {statuses.map((status) => (
                <Column
                  key={status.id}
                  status={status}
                  tasks={grouped.get(status.id) ?? []}
                />
              ))}
            </div>
          </DndContext>
        ) : (
          <TasksTable tasks={filtered} />
        )}
      </div>

      <TaskForm
        open={open}
        onOpenChange={setOpen}
        statuses={statuses.map((s) => ({ id: s.id, label: s.label }))}
        clients={clients}
        members={members}
      />
    </>
  );
}

function Column({
  status,
  tasks,
}: {
  status: { id: string; label: string; color: string };
  tasks: TaskWithRelations[];
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
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: TaskWithRelations }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab rounded-md border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
        isDragging && "opacity-50",
      )}
    >
      <p className="text-sm font-medium leading-tight">{task.title}</p>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        {task.priority !== "sem_prioridade" && (
          <span className={PRIORITY_COLORS[task.priority as TaskPriority]}>
            {PRIORITY_LABELS[task.priority as TaskPriority]}
          </span>
        )}
        {task.assignee && (
          <span className="text-muted-foreground">{task.assignee.full_name}</span>
        )}
      </div>
      {task.client && (
        <p className="mt-1 truncate text-[10px] text-muted-foreground">{task.client.name}</p>
      )}
    </div>
  );
}

function TasksTable({ tasks }: { tasks: TaskWithRelations[] }) {
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
            <th className="px-4 py-3 font-medium">Responsável</th>
            <th className="px-4 py-3 font-medium">Data Limite</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tasks.map((t) => (
            <tr key={t.id} className="hover:bg-muted/50">
              <td className="px-4 py-3 font-medium">{t.title}</td>
              <td className="px-4 py-3">
                {t.status && <StatusBadge label={t.status.label} color={t.status.color} />}
              </td>
              <td className={cn("px-4 py-3", PRIORITY_COLORS[t.priority as TaskPriority])}>
                {t.priority !== "sem_prioridade" ? PRIORITY_LABELS[t.priority as TaskPriority] : "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{t.client?.name ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{t.assignee?.full_name ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{t.due_date ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
