"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LaunchForm } from "./launch-form";
import { moveLaunchStatusAction } from "@/lib/actions/launches";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { LaunchWithRelations } from "@/lib/queries/launches";

interface Props {
  launches: LaunchWithRelations[];
  statuses: { id: string; key: string; label: string; color: string }[];
  clients: { id: string; label: string }[];
  templates: { id: string; label: string; task_count?: number }[];
}

export function LaunchesBoard({ launches: initial, statuses, clients, templates }: Props) {
  const router = useRouter();
  const [launches, setLaunches] = useState(initial);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const filtered = useMemo(() => {
    if (!search) return launches;
    const q = search.toLowerCase();
    return launches.filter(
      (l) => l.name.toLowerCase().includes(q) || l.client?.name.toLowerCase().includes(q),
    );
  }, [launches, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, LaunchWithRelations[]>();
    for (const s of statuses) map.set(s.id, []);
    for (const l of filtered) {
      if (!l.status_id || !map.has(l.status_id)) continue;
      map.get(l.status_id)!.push(l);
    }
    return map;
  }, [filtered, statuses]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const launchId = String(active.id);
    const newStatusId = String(over.id);
    const launch = launches.find((l) => l.id === launchId);
    if (!launch || launch.status_id === newStatusId) return;

    const targetStatus = statuses.find((s) => s.id === newStatusId);
    if (!targetStatus) return;

    setLaunches((prev) =>
      prev.map((l) => (l.id === launchId ? { ...l, status_id: newStatusId, status: targetStatus } : l)),
    );
    const result = await moveLaunchStatusAction(launchId, newStatusId);
    if ("error" in result && result.error) {
      toast.error("Falha ao mover");
      setLaunches(initial);
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
          placeholder="Pesquisar lançamentos..."
          className="max-w-xs"
        />
        <Button onClick={() => setOpen(true)} className="ml-auto">
          <Plus />
          Novo Lançamento
        </Button>
      </div>

      <div className="p-8">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {statuses.map((s) => (
              <Column key={s.id} status={s} launches={grouped.get(s.id) ?? []} />
            ))}
          </div>
        </DndContext>
      </div>

      <LaunchForm
        open={open}
        onOpenChange={setOpen}
        statuses={statuses.map((s) => ({ id: s.id, label: s.label }))}
        clients={clients}
        templates={templates}
      />
    </>
  );
}

function Column({ status, launches }: { status: { id: string; label: string; color: string }; launches: LaunchWithRelations[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-72 shrink-0 rounded-lg border bg-muted/30 p-3 transition-colors",
        isOver && "bg-muted",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: status.color }} />
          <h3 className="text-sm font-semibold">{status.label}</h3>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {launches.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {launches.length === 0 ? (
          <p className="px-2 text-xs text-muted-foreground">Sem lançamentos</p>
        ) : (
          launches.map((l) => <LaunchCard key={l.id} launch={l} />)
        )}
      </div>
    </div>
  );
}

function LaunchCard({ launch }: { launch: LaunchWithRelations }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: launch.id });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const progress = launch.task_count ? Math.round(((launch.task_completed ?? 0) / launch.task_count) * 100) : 0;

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
      <Link
        href={`/lancamentos/${launch.id}`}
        onClick={(e) => isDragging && e.preventDefault()}
        className="block"
      >
        <p className="text-sm font-medium leading-tight">{launch.name}</p>
        {launch.client && (
          <p className="mt-1 text-xs text-muted-foreground">{launch.client.name}</p>
        )}
        {launch.task_count && launch.task_count > 0 ? (
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{launch.task_completed}/{launch.task_count} tarefas</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}
      </Link>
    </div>
  );
}
