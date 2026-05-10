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
import { ContentForm } from "./content-form";
import { moveContentStatusAction } from "@/lib/actions/contents";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { ContentWithRelations } from "@/lib/queries/contents";

interface Props {
  contents: ContentWithRelations[];
  statuses: { id: string; key: string; label: string; color: string }[];
  clients: { id: string; label: string }[];
  members: { id: string; label: string }[];
}

export function ContentsBoard({ contents: initial, statuses, clients, members }: Props) {
  const router = useRouter();
  const [contents, setContents] = useState(initial);
  const [view, setView] = useState<"kanban" | "tabela">("tabela");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const filtered = useMemo(() => {
    if (!search) return contents;
    const q = search.toLowerCase();
    return contents.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.client?.name.toLowerCase().includes(q) ||
        c.format?.toLowerCase().includes(q),
    );
  }, [contents, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, ContentWithRelations[]>();
    for (const s of statuses) map.set(s.id, []);
    for (const c of filtered) {
      if (!c.status_id || !map.has(c.status_id)) continue;
      map.get(c.status_id)!.push(c);
    }
    return map;
  }, [filtered, statuses]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const cid = String(active.id);
    const newStatusId = String(over.id);
    const c = contents.find((x) => x.id === cid);
    if (!c || c.status_id === newStatusId) return;
    const targetStatus = statuses.find((s) => s.id === newStatusId);
    if (!targetStatus) return;
    setContents((prev) =>
      prev.map((x) => (x.id === cid ? { ...x, status_id: newStatusId, status: targetStatus } : x)),
    );
    const result = await moveContentStatusAction(cid, newStatusId);
    if ("error" in result && result.error) {
      toast.error("Falha ao mover");
      setContents(initial);
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
          placeholder="Pesquisar conteúdos..."
          className="max-w-xs"
        />
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-md border">
            {[
              { key: "tabela", icon: TableIcon, label: "Tabela" },
              { key: "kanban", icon: LayoutGrid, label: "Kanban" },
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
            Novo Conteúdo
          </Button>
        </div>
      </div>

      <div className="p-8">
        {view === "kanban" ? (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-4">
              {statuses.map((s) => (
                <Column key={s.id} status={s} contents={grouped.get(s.id) ?? []} />
              ))}
            </div>
          </DndContext>
        ) : (
          <Table contents={filtered} />
        )}
      </div>

      <ContentForm
        open={open}
        onOpenChange={setOpen}
        statuses={statuses.map((s) => ({ id: s.id, label: s.label }))}
        clients={clients}
        members={members}
      />
    </>
  );
}

function Column({ status, contents }: { status: { id: string; label: string; color: string }; contents: ContentWithRelations[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-60 shrink-0 rounded-lg border bg-muted/30 p-2 transition-colors",
        isOver && "bg-muted",
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: status.color }} />
          <h3 className="text-xs font-semibold">{status.label}</h3>
        </div>
        <Badge variant="secondary" className="text-[9px]">
          {contents.length}
        </Badge>
      </div>
      <div className="space-y-1.5">
        {contents.length === 0 ? (
          <p className="px-1 text-[10px] text-muted-foreground">—</p>
        ) : (
          contents.map((c) => <Card key={c.id} content={c} />)
        )}
      </div>
    </div>
  );
}

function Card({ content }: { content: ContentWithRelations }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: content.id });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab rounded-md border bg-card p-2 shadow-sm transition-shadow hover:shadow-md",
        isDragging && "opacity-50",
      )}
    >
      <p className="text-xs font-medium leading-tight">{content.name}</p>
      {content.format && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">{content.format}</p>
      )}
      {content.client && (
        <p className="truncate text-[10px] text-muted-foreground">{content.client.name}</p>
      )}
    </div>
  );
}

function Table({ contents }: { contents: ContentWithRelations[] }) {
  if (contents.length === 0) {
    return <p className="text-center text-sm text-muted-foreground">Sem conteúdos.</p>;
  }
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-medium">Nome</th>
            <th className="px-4 py-3 font-medium">Formato</th>
            <th className="px-4 py-3 font-medium">Plataformas</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Data</th>
            <th className="px-4 py-3 font-medium">Responsável</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {contents.map((c) => (
            <tr key={c.id} className="hover:bg-muted/50">
              <td className="px-4 py-3 font-medium">{c.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{c.format ?? "—"}</td>
              <td className="px-4 py-3">
                {c.platforms && c.platforms.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {c.platforms.map((p) => (
                      <Badge key={p} variant="outline" className="text-[9px]">
                        {p}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{c.client?.name ?? "—"}</td>
              <td className="px-4 py-3">
                {c.status && <StatusBadge label={c.status.label} color={c.status.color} />}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {c.publish_date ? formatDate(c.publish_date) : "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{c.responsible?.full_name ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
