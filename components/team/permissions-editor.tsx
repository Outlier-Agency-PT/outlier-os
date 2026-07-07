"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_MODULE_KEYS, MODULE_LABELS, MODULE_GROUPS, MODULE_GROUP_LABELS, type MemberRole } from "@/lib/types";
import { updateMemberAction } from "@/lib/actions/team";
import { toast } from "sonner";
import type { TeamMember } from "@/lib/types";

interface Props {
  member: TeamMember;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function PermissionsEditor({ member, open, onOpenChange }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<MemberRole>(member.role);
  const [department, setDepartment] = useState(member.department ?? "");
  const [jobTitle, setJobTitle] = useState(member.job_title ?? "");
  const [perms, setPerms] = useState<string[]>(member.permissions_modules ?? []);

  function togglePerm(key: string) {
    setPerms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function selectAll() {
    const allModules = ALL_MODULE_KEYS.filter((k) => k !== "configuracoes" && k !== "equipa");
    setPerms(allModules);
  }

  function clearAll() {
    setPerms([]);
  }

  async function handleSave() {
    setLoading(true);
    const result = await updateMemberAction(member.id, {
      role,
      department: department || null,
      job_title: jobTitle || null,
      permissions_modules: role === "admin" ? [] : perms,
    });
    setLoading(false);

    if ("error" in result && result.error) {
      const errorMsg = "_form" in result.error ? result.error._form?.[0] : "Erro";
      toast.error(errorMsg ?? "Erro");
      return;
    }
    toast.success("Membro atualizado");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar membro</DialogTitle>
          <DialogDescription>{member.full_name} · {member.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="role">Função</Label>
              <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="membro">Membro</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {role === "admin"
                  ? "Acesso total a todos os módulos"
                  : "Acesso apenas aos módulos seleccionados"}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept">Departamento</Label>
              <Input
                id="dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Operações, Conteúdo, etc"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="job">Cargo</Label>
              <Input
                id="job"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Account Manager, Designer, etc"
              />
            </div>
          </div>

          {role === "membro" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Permissões por módulo</Label>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-brand hover:underline font-medium"
                  >
                    Seleccionar todos
                  </button>
                  <span className="text-muted-foreground">|</span>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-brand hover:underline font-medium"
                  >
                    Limpar
                  </button>
                </div>
              </div>
              <div className="space-y-3 rounded-md border p-3">
                {Object.entries(MODULE_GROUPS).map(([groupKey, modules]) => (
                  <div key={groupKey} className="space-y-2">
                    <h4 className="text-xs font-semibold text-foreground">
                      {MODULE_GROUP_LABELS[groupKey]}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 pl-2">
                      {modules.map((key) => (
                        <label
                          key={key}
                          className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={perms.includes(key)}
                            onChange={() => togglePerm(key)}
                            className="size-4 accent-primary"
                          />
                          <span>{MODULE_LABELS[key]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "A guardar..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
