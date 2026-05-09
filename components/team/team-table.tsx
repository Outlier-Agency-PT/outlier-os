"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarDisplay } from "@/components/avatar-display";
import { PermissionsEditor } from "./permissions-editor";
import { MODULE_LABELS } from "@/lib/types";
import type { TeamMember } from "@/lib/types";

interface Props {
  members: TeamMember[];
  isAdmin: boolean;
}

export function TeamTable({ members, isAdmin }: Props) {
  const [editing, setEditing] = useState<TeamMember | null>(null);

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Função</th>
              <th className="px-4 py-3 font-medium">Departamento</th>
              <th className="px-4 py-3 font-medium">Permissões</th>
              {isAdmin && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <AvatarDisplay name={m.full_name} size="sm" />
                    <span className="font-medium">{m.full_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={m.role === "admin" ? "default" : "secondary"}>
                    {m.role === "admin" ? "Admin" : "Membro"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{m.department ?? "—"}</td>
                <td className="px-4 py-3">
                  {m.role === "admin" ? (
                    <Badge variant="outline" className="text-[10px]">Acesso total</Badge>
                  ) : m.permissions_modules.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Sem permissões</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {m.permissions_modules.map((p) => (
                        <Badge key={p} variant="outline" className="text-[10px]">
                          {MODULE_LABELS[p] ?? p}
                        </Badge>
                      ))}
                    </div>
                  )}
                </td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(m)}>
                      <Pencil className="size-4" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <PermissionsEditor
          member={editing}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </>
  );
}
