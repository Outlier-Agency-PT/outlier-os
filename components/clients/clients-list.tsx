"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { ClientsToolbar, type ClientView } from "./clients-toolbar";
import { CLIENT_TYPE_LABELS, type ClientType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import type { ClientWithStatus } from "@/lib/queries/clients";

interface ClientsListProps {
  clients: ClientWithStatus[];
  statuses: { id: string; label: string }[];
  members: { id: string; full_name: string }[];
}

export function ClientsList({ clients, statuses, members }: ClientsListProps) {
  const [view, setView] = useState<ClientView>("galeria");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.sector?.toLowerCase().includes(q),
    );
  }, [clients, search]);

  return (
    <>
      <ClientsToolbar
        view={view}
        onViewChange={setView}
        search={search}
        onSearchChange={setSearch}
        statuses={statuses}
        members={members}
      />

      <div className="p-8">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            {search ? "Nenhum cliente encontrado." : "Sem clientes ainda. Cria o primeiro."}
          </p>
        ) : view === "galeria" ? (
          <GalleryView clients={filtered} />
        ) : view === "tabela" ? (
          <TableView clients={filtered} />
        ) : (
          <KanbanView clients={filtered} />
        )}
      </div>
    </>
  );
}

function GalleryView({ clients }: { clients: ClientWithStatus[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {clients.map((c) => (
        <Link key={c.id} href={`/clientes/${c.id}`}>
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-tight">{c.name}</h3>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {CLIENT_TYPE_LABELS[c.client_type as ClientType]}
                </Badge>
              </div>
              {c.sector && (
                <p className="mt-1 text-xs text-muted-foreground">{c.sector}</p>
              )}
              {c.status && (
                <div className="mt-3">
                  <StatusBadge label={c.status.label} color={c.status.color} />
                </div>
              )}
              {c.monthly_value !== null && (
                <p className="mt-3 text-lg font-bold">
                  {formatCurrency(c.monthly_value)}
                  <span className="text-xs font-normal text-muted-foreground">/mês</span>
                </p>
              )}
              {c.responsible && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Resp.: {c.responsible.full_name}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function TableView({ clients }: { clients: ClientWithStatus[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-medium">Nome</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Responsável</th>
            <th className="px-4 py-3 font-medium">Sector</th>
            <th className="px-4 py-3 text-right font-medium">Valor Mensal</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {clients.map((c) => (
            <tr key={c.id} className="hover:bg-muted/50">
              <td className="px-4 py-3 font-medium">
                <Link href={`/clientes/${c.id}`} className="hover:underline">
                  {c.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="text-[10px]">
                  {CLIENT_TYPE_LABELS[c.client_type as ClientType]}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {c.status && <StatusBadge label={c.status.label} color={c.status.color} />}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {c.responsible?.full_name ?? "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{c.sector ?? "—"}</td>
              <td className="px-4 py-3 text-right">
                {c.monthly_value !== null ? formatCurrency(c.monthly_value) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KanbanView({ clients }: { clients: ClientWithStatus[] }) {
  // Agrupa por tipo
  const groups: Record<ClientType, ClientWithStatus[]> = {
    one_shot: [],
    long_term: [],
    interno: [],
  };
  for (const c of clients) {
    groups[c.client_type as ClientType].push(c);
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {(Object.keys(groups) as ClientType[]).map((type) => (
        <div key={type} className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{CLIENT_TYPE_LABELS[type]}</h3>
            <Badge variant="secondary" className="text-[10px]">
              {groups[type].length}
            </Badge>
          </div>
          <div className="space-y-2">
            {groups[type].length === 0 ? (
              <p className="px-2 text-xs text-muted-foreground">Sem clientes</p>
            ) : (
              groups[type].map((c) => (
                <Link key={c.id} href={`/clientes/${c.id}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="p-3">
                      <p className="font-medium">{c.name}</p>
                      {c.status && (
                        <div className="mt-1.5">
                          <StatusBadge label={c.status.label} color={c.status.color} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
