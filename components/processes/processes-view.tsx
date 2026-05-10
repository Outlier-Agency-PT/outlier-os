"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProcessAction, type ProcessInput } from "@/lib/actions/processes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Process, ProcessCategory } from "@/lib/queries/processes";

interface Props {
  processes: Process[];
  categories: ProcessCategory[];
}

export function ProcessesView({ processes, categories }: Props) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = processes;
    if (activeCategory) result = result.filter((p) => p.category_id === activeCategory);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [processes, search, activeCategory]);

  return (
    <div className="grid grid-cols-[200px_1fr]">
      {/* Sidebar de categorias */}
      <aside className="border-r bg-muted/30 p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Categorias
        </p>
        <div className="space-y-1">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              "block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors",
              !activeCategory ? "bg-accent" : "hover:bg-accent/50",
            )}
          >
            Todos ({processes.length})
          </button>
          {categories.map((c) => {
            const count = processes.filter((p) => p.category_id === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                  activeCategory === c.id ? "bg-accent" : "hover:bg-accent/50",
                )}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="flex-1">{c.label}</span>
                <span className="text-xs text-muted-foreground">{count}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Lista */}
      <div>
        <div className="flex items-center gap-2 border-b px-6 py-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar processos..."
              className="pl-9"
            />
          </div>
          <Button onClick={() => setOpen(true)} className="ml-auto">
            <Plus />
            Novo Processo
          </Button>
        </div>

        <div className="p-6">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-sm text-muted-foreground">
                {search || activeCategory ? "Sem processos." : "Sem processos. Cria o primeiro."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((p) => (
                <Link key={p.id} href={`/processos/${p.id}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium">{p.title}</p>
                          {p.description && (
                            <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                              {p.description}
                            </p>
                          )}
                          {p.tags && p.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {p.tags.map((t) => (
                                <Badge key={t} variant="outline" className="text-[10px]">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {p.category && (
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                              style={{ borderColor: p.category.color, color: p.category.color }}
                            >
                              {p.category.label}
                            </Badge>
                          )}
                          {!p.published && (
                            <Badge variant="secondary" className="text-[10px]">Rascunho</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateProcessDialog open={open} onOpenChange={setOpen} categories={categories} />
    </div>
  );
}

function CreateProcessDialog({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: ProcessCategory[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ProcessInput>({ title: "", published: true });
  const [tagsInput, setTagsInput] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await createProcessAction({
      ...form,
      tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
    });
    setLoading(false);
    if ("error" in result && result.error) {
      const msg = "_form" in result.error ? result.error._form?.[0] : Object.values(result.error)[0]?.[0];
      toast.error(msg ?? "Erro");
      return;
    }
    toast.success("Processo criado");
    onOpenChange(false);
    router.refresh();
    if ("data" in result && result.data) {
      router.push(`/processos/${(result.data as { id: string }).id}`);
    }
    setForm({ title: "", published: true });
    setTagsInput("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Processo</DialogTitle>
          <DialogDescription>Documenta um SOP. Markdown suportado no conteúdo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Descrição breve</Label>
            <Input
              id="desc"
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat">Categoria</Label>
              <Select
                value={form.category_id ?? ""}
                onValueChange={(v) => setForm((f) => ({ ...f, category_id: v || null }))}
              >
                <SelectTrigger id="cat">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="miro">Link Miro</Label>
              <Input
                id="miro"
                value={form.miro_link ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, miro_link: e.target.value }))}
                placeholder="https://miro.com/..."
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Separadas por vírgula"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="content">Conteúdo (Markdown)</Label>
            <Textarea
              id="content"
              value={form.content_md ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, content_md: e.target.value }))}
              rows={8}
              className="font-mono text-sm"
              placeholder="# Passo 1&#10;&#10;Descreve o passo..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "A criar..." : "Criar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
