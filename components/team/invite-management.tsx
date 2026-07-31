"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  listInvitesAction,
  cancelInviteAction,
  resendInviteAction,
} from "@/lib/actions/invites";
import type { Invite, InviteStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "accepted", label: "Aceites" },
  { value: "expired", label: "Expirados" },
] as const;

type FilterValue = (typeof STATUS_FILTERS)[number]["value"];

const STATUS_BADGE: Record<
  InviteStatus,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  pending: { label: "Pendente", variant: "default" },
  accepted: { label: "Aceite", variant: "secondary" },
  expired: { label: "Expirado", variant: "outline" },
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  membro: "Membro",
  aluno: "Aluno",
};

const DEPARTMENT_LABELS: Record<string, string> = {
  trafego: "Tráfego",
  incubadora: "Incubadora",
  vendas: "Vendas e Leads",
  desenvolvimento: "Desenvolvimento",
  gestao: "Gestão",
  operacoes: "Operações",
  conteudo: "Conteúdo",
};

const EMPTY_MESSAGES: Record<FilterValue, string> = {
  all: "Nenhum convite encontrado.",
  pending: "Nenhum convite pendente.",
  accepted: "Nenhum convite aceite.",
  expired: "Nenhum convite expirado.",
};

function applyStatusFilter(invites: Invite[], filter: FilterValue): Invite[] {
  if (filter === "all") return invites;
  return invites.filter((i) => i.status === filter);
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function InviteManagement() {
  const [allInvites, setAllInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState<FilterValue>("pending");
  const [studentFilter, setStudentFilter] = useState<FilterValue>("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Invite | null>(null);

  async function fetchInvites() {
    setLoading(true);
    const result = await listInvitesAction("all");
    setLoading(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setAllInvites(result.data);
  }

  useEffect(() => {
    fetchInvites();
  }, []);

  const teamInvites = applyStatusFilter(
    allInvites.filter((i) => i.role === "admin" || i.role === "membro"),
    teamFilter
  );

  const studentInvites = applyStatusFilter(
    allInvites.filter((i) => i.role === "aluno"),
    studentFilter
  );

  async function handleResend(invite: Invite) {
    setActionLoading(invite.id);
    const result = await resendInviteAction(invite.id);
    setActionLoading(null);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(`Convite reenviado para ${invite.email}`);
    fetchInvites();
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    const id = cancelTarget.id;
    const email = cancelTarget.email;
    setCancelTarget(null);
    setActionLoading(id);
    const result = await cancelInviteAction(id);
    setActionLoading(null);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(`Convite para ${email} cancelado.`);
    fetchInvites();
  }

  return (
    <>
      <div className="space-y-10">
        <InviteSection
          title="Convites de Equipa"
          invites={teamInvites}
          loading={loading}
          filter={teamFilter}
          onFilterChange={setTeamFilter}
          actionLoading={actionLoading}
          onResend={handleResend}
          onCancel={setCancelTarget}
          showRoleAndDept
        />

        <InviteSection
          title="Convites de Alunos"
          invites={studentInvites}
          loading={loading}
          filter={studentFilter}
          onFilterChange={setStudentFilter}
          actionLoading={actionLoading}
          onResend={handleResend}
          onCancel={setCancelTarget}
          showRoleAndDept={false}
        />
      </div>

      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar convite?</AlertDialogTitle>
            <AlertDialogDescription>
              O convite para{" "}
              <span className="font-medium text-foreground">
                {cancelTarget?.email}
              </span>{" "}
              será removido. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter convite</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar convite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// InviteSection
// ---------------------------------------------------------------------------

function InviteSection({
  title,
  invites,
  loading,
  filter,
  onFilterChange,
  actionLoading,
  onResend,
  onCancel,
  showRoleAndDept,
}: {
  title: string;
  invites: Invite[];
  loading: boolean;
  filter: FilterValue;
  onFilterChange: (f: FilterValue) => void;
  actionLoading: string | null;
  onResend: (invite: Invite) => void;
  onCancel: (invite: Invite) => void;
  showRoleAndDept: boolean;
}) {
  const colSpan = showRoleAndDept ? 7 : 5;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h2>
        <div className="flex gap-1 rounded-lg border p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Email</th>
              {showRoleAndDept && (
                <>
                  <th className="px-4 py-3 font-medium">Função</th>
                  <th className="px-4 py-3 font-medium">Departamento</th>
                </>
              )}
              <th className="px-4 py-3 font-medium">Enviado</th>
              <th className="px-4 py-3 font-medium">Expira</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <SkeletonRows cols={colSpan} />
            ) : invites.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  {EMPTY_MESSAGES[filter]}
                </td>
              </tr>
            ) : (
              invites.map((invite) => (
                <InviteRow
                  key={invite.id}
                  invite={invite}
                  isActioning={actionLoading === invite.id}
                  onResend={() => onResend(invite)}
                  onCancel={() => onCancel(invite)}
                  showRoleAndDept={showRoleAndDept}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InviteRow
// ---------------------------------------------------------------------------

function InviteRow({
  invite,
  isActioning,
  onResend,
  onCancel,
  showRoleAndDept,
}: {
  invite: Invite;
  isActioning: boolean;
  onResend: () => void;
  onCancel: () => void;
  showRoleAndDept: boolean;
}) {
  const badge = STATUS_BADGE[invite.status];

  return (
    <tr className="hover:bg-muted/50">
      <td className="px-4 py-3 font-medium">{invite.email}</td>
      {showRoleAndDept && (
        <>
          <td className="px-4 py-3 text-muted-foreground">
            {ROLE_LABELS[invite.role] ?? invite.role}
          </td>
          <td className="px-4 py-3 text-muted-foreground">
            {invite.department
              ? (DEPARTMENT_LABELS[invite.department] ?? invite.department)
              : "—"}
          </td>
        </>
      )}
      <td className="px-4 py-3 text-muted-foreground">
        {formatDistanceToNow(new Date(invite.created_at), {
          addSuffix: true,
          locale: pt,
        })}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {invite.expires_at
          ? formatDistanceToNow(new Date(invite.expires_at), {
              addSuffix: true,
              locale: pt,
            })
          : "—"}
      </td>
      <td className="px-4 py-3">
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </td>
      <td className="px-4 py-3">
        {invite.status === "pending" && (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onResend}
              disabled={isActioning}
              title="Reenviar convite"
            >
              <RefreshCw className="size-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              disabled={isActioning}
              title="Cancelar convite"
              className="text-destructive hover:text-destructive"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// SkeletonRows
// ---------------------------------------------------------------------------

function SkeletonRows({ cols }: { cols: number }) {
  const widths =
    cols === 7 ? [140, 60, 80, 80, 80, 60, 40] : [140, 80, 80, 60, 40];

  return (
    <>
      {[0, 1, 2].map((i) => (
        <tr key={i} className="border-b last:border-0">
          {widths.map((w, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4" style={{ width: w }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
