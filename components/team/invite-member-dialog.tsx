"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteMemberAction, type InviteInput } from "@/lib/actions/team";
import { ALL_MODULE_KEYS, MODULE_LABELS, MODULE_GROUPS, MODULE_GROUP_LABELS, type MemberRole } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function InviteMemberDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState<InviteInput>({
    email: "",
    full_name: "",
    role: "membro",
    permissions_modules: [],
  });

  function togglePerm(key: string) {
    const curr = form.permissions_modules ?? [];
    setForm((f) => ({
      ...f,
      permissions_modules: curr.includes(key) ? curr.filter((k) => k !== key) : [...curr, key],
    }));
  }

  function selectAll() {
    const allModules = ALL_MODULE_KEYS.filter((k) => k !== "configuracoes" && k !== "equipa");
    setForm((f) => ({ ...f, permissions_modules: allModules }));
  }

  function clearAll() {
    setForm((f) => ({ ...f, permissions_modules: [] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await inviteMemberAction(form);
    setLoading(false);
    if ("error" in res && res.error) {
      const msg = "_form" in res.error ? res.error._form?.[0] : Object.values(res.error)[0]?.[0];
      toast.error(msg ?? "Erro");
      return;
    }
    if ("data" in res && res.data) {
      setResult({ email: res.data.email, password: res.data.password });
      router.refresh();
    }
  }

  async function copyCreds() {
    if (!result) return;
    const text = `Email: ${result.email}\nPassword: ${result.password}\nLogin em: ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Credenciais copiadas");
  }

  function close() {
    onOpenChange(false);
    setForm({ email: "", full_name: "", role: "membro", permissions_modules: [] });
    setResult(null);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar Membro</DialogTitle>
          <DialogDescription>
            Cria conta nova. Tens de partilhar a password manualmente — não enviamos email ainda.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <div className="rounded-md border border-green-500/30 bg-green-500/10 p-4">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                ✓ Membro criado
              </p>
              <div className="mt-3 space-y-1 font-mono text-xs">
                <p>Email: <strong>{result.email}</strong></p>
                <p>Password: <strong>{result.password}</strong></p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Partilha estas credenciais com o membro. Aconselha-o a alterar a password.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={copyCreds}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                Copiar credenciais
              </Button>
              <Button onClick={close}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">Função</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v as MemberRole }))}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="membro">Membro</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {form.role === "admin"
                    ? "Acesso total a todos os módulos"
                    : "Acesso apenas aos módulos seleccionados"}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dept">Departamento</Label>
                <Input
                  id="dept"
                  value={form.department ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="job">Cargo</Label>
                <Input
                  id="job"
                  value={form.job_title ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
                />
              </div>
            </div>

            {form.role === "membro" && (
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
                              checked={form.permissions_modules?.includes(key) ?? false}
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "A criar..." : "Criar Membro"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
