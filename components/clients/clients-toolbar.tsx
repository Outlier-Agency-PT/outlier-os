"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, LayoutGrid, Table as TableIcon, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientForm } from "./client-form";
import { cn } from "@/lib/utils";

export type ClientView = "galeria" | "tabela" | "kanban";

interface ToolbarProps {
  view: ClientView;
  onViewChange: (v: ClientView) => void;
  search: string;
  onSearchChange: (v: string) => void;
  statuses: { id: string; label: string }[];
  members: { id: string; full_name: string }[];
}

export function ClientsToolbar({
  view,
  onViewChange,
  search,
  onSearchChange,
  statuses,
  members,
}: ToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Abre o form de novo cliente quando vem do Command Palette (?new=true)
  useEffect(() => {
    if (searchParams.get("new") !== "true") return;
    setOpen(true);
    router.replace("/clientes", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b px-8 py-4">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Pesquisar clientes..."
          className="max-w-xs"
        />
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-md border">
            {[
              { key: "galeria", icon: LayoutGrid, label: "Galeria" },
              { key: "tabela", icon: TableIcon, label: "Tabela" },
              { key: "kanban", icon: Columns3, label: "Kanban" },
            ].map((v) => {
              const Icon = v.icon;
              const active = view === v.key;
              return (
                <button
                  key={v.key}
                  onClick={() => onViewChange(v.key as ClientView)}
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
            Novo Cliente
          </Button>
        </div>
      </div>

      <ClientForm
        open={open}
        onOpenChange={setOpen}
        statuses={statuses}
        members={members}
      />
    </>
  );
}
