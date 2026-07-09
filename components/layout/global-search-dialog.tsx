"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Users,
  Rocket,
  LayoutDashboard,
  CalendarDays,
  Copy,
  Target,
  GraduationCap,
  Plus,
  UserPlus,
  PlusCircle,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { StatusBadge } from "@/components/status-badge";
import { PRIORITY_LABELS, PRIORITY_COLORS, type TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  searchGlobalAction,
  type GlobalSearchResults,
  type TaskSearchResult,
  type ClientSearchResult,
  type LaunchSearchResult,
} from "@/lib/actions/search";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_RESULTS: GlobalSearchResults = { tasks: [], clients: [], launches: [] };

const NAV_ACTIONS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Tarefas", href: "/tarefas", icon: CheckSquare },
  { label: "Calendário", href: "/tarefas/calendario", icon: CalendarDays },
  { label: "Templates", href: "/tarefas/templates", icon: Copy },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "OKRs", href: "/okrs", icon: Target },
  { label: "Incubadora", href: "/incubadora", icon: GraduationCap },
  { label: "Lançamentos", href: "/lancamentos", icon: Rocket },
] as const;

const CREATE_ACTIONS = [
  { label: "Nova Tarefa", href: "/tarefas?new=task", icon: Plus },
  { label: "Novo Cliente", href: "/clientes?new=true", icon: UserPlus },
  { label: "Novo Objetivo (OKR)", href: "/okrs?new=true", icon: PlusCircle },
] as const;

export function GlobalSearchDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(EMPTY_RESULTS);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = ++requestId.current;
    const timeout = setTimeout(async () => {
      const data = await searchGlobalAction(trimmed);
      if (id === requestId.current) {
        setResults(data);
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  function navigate(href: string) {
    router.push(href);
    onOpenChange(false);
  }

  function handleSelectTask(task: TaskSearchResult) {
    const params = new URLSearchParams({ taskId: task.id });
    if (task.list?.id) params.set("list", task.list.id);
    router.push(`/tarefas?${params.toString()}`);
    onOpenChange(false);
  }

  function handleSelectClient(client: ClientSearchResult) {
    router.push(`/clientes/${client.id}`);
    onOpenChange(false);
  }

  function handleSelectLaunch(launch: LaunchSearchResult) {
    router.push(`/lancamentos/${launch.id}`);
    onOpenChange(false);
  }

  const isEmpty = query.trim() === "";
  const showLoading = !isEmpty && loading;
  const hasResults =
    results.tasks.length > 0 || results.clients.length > 0 || results.launches.length > 0;
  const showNoResults = !isEmpty && !loading && !hasResults;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Pesquisar ou navegar..."
      />
      <CommandList>
        {/* ── Estado vazio: grupos de navegação e criação ── */}
        {isEmpty && (
          <>
            <CommandGroup heading="Navegar para">
              {NAV_ACTIONS.map(({ label, href, icon: Icon }) => (
                <CommandItem
                  key={href}
                  value={`nav-${href}`}
                  onSelect={() => navigate(href)}
                  className="flex items-center gap-2"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-sm">{label}</span>
                  <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    ↵
                  </kbd>
                </CommandItem>
              ))}
            </CommandGroup>

            <div className="-mx-1 my-1 h-px bg-border" />

            <CommandGroup heading="Criar">
              {CREATE_ACTIONS.map(({ label, href, icon: Icon }) => (
                <CommandItem
                  key={href}
                  value={`create-${href}`}
                  onSelect={() => navigate(href)}
                  className="flex items-center gap-2"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-sm">{label}</span>
                  <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    ↵
                  </kbd>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* ── A carregar ── */}
        {showLoading && (
          <div className="space-y-2 p-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        )}

        {/* ── Sem resultados ── */}
        {showNoResults && <CommandEmpty>Nenhum resultado encontrado</CommandEmpty>}

        {/* ── Resultados: Tarefas ── */}
        {!isEmpty && !loading && results.tasks.length > 0 && (
          <CommandGroup heading="Tarefas">
            {results.tasks.map((task) => (
              <CommandItem
                key={task.id}
                value={`task-${task.id}`}
                onSelect={() => handleSelectTask(task)}
                className="flex items-start gap-2"
              >
                <CheckSquare className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{task.title}</span>
                    {task.priority !== "sem_prioridade" && (
                      <span
                        className={cn(
                          "shrink-0 text-[11px] font-medium",
                          PRIORITY_COLORS[task.priority as TaskPriority],
                        )}
                      >
                        {PRIORITY_LABELS[task.priority as TaskPriority]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {task.status && (
                      <StatusBadge label={task.status.label} color={task.status.color} />
                    )}
                    {task.list && (
                      <span className="truncate">
                        {task.list.space ? `${task.list.space.name} / ` : ""}
                        {task.list.name}
                      </span>
                    )}
                    {task.member && (
                      <span className="ml-auto shrink-0 truncate text-xs text-muted-foreground">
                        {task.member.full_name}
                      </span>
                    )}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* ── Resultados: Clientes ── */}
        {!isEmpty && !loading && results.clients.length > 0 && (
          <CommandGroup heading="Clientes">
            {results.clients.map((client) => (
              <CommandItem
                key={client.id}
                value={`client-${client.id}`}
                onSelect={() => handleSelectClient(client)}
                className="flex items-center gap-2"
              >
                <Users className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm font-medium">{client.name}</span>
                {client.status && (
                  <StatusBadge
                    label={client.status.label}
                    color={client.status.color}
                    className="ml-auto shrink-0"
                  />
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* ── Resultados: Lançamentos ── */}
        {!isEmpty && !loading && results.launches.length > 0 && (
          <CommandGroup heading="Lançamentos">
            {results.launches.map((launch) => (
              <CommandItem
                key={launch.id}
                value={`launch-${launch.id}`}
                onSelect={() => handleSelectLaunch(launch)}
                className="flex items-center gap-2"
              >
                <Rocket className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm font-medium">{launch.name}</span>
                {launch.status && (
                  <StatusBadge
                    label={launch.status.label}
                    color={launch.status.color}
                    className="ml-auto shrink-0"
                  />
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
