"use client";

import { useState } from "react";
import { Plus, ChevronDown, ChevronRight, Edit2, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import {
  createModuleAction,
  updateModuleAction,
  deleteModuleAction,
  createLessonAction,
  updateLessonAction,
  deleteLessonAction,
  type ModuleInput,
  type LessonInput,
} from "@/lib/actions/incubadora";
import type { Module, Lesson, StudentProgressSummary } from "@/lib/queries/incubadora";

export function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full bg-emerald-500 transition-all"
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
}

export function ActivityBadge({ summary }: { summary?: StudentProgressSummary }) {
  if (!summary) {
    return <p className="text-xs text-muted-foreground">Sem início</p>;
  }

  return (
    <div className="space-y-1">
      <ProgressBar percentage={summary.progress_pct} />
      <div className="flex items-center gap-1">
        {summary.days_since_activity && summary.days_since_activity >= 14 ? (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="size-3" />
            <span>{summary.days_since_activity}d sem actividade</span>
          </div>
        ) : summary.last_activity ? (
          <p className="text-xs text-muted-foreground">
            Activo há {summary.days_since_activity ?? 0}d
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Sem actividade</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {summary.lessons_completed} lições completas
      </p>
    </div>
  );
}

export function ModulesPanel({ modules: initialModules }: { modules: Module[] }) {
  const [modules, setModules] = useState(initialModules);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Map<string, Lesson[]>>(new Map());
  const [loading, setLoading] = useState<Map<string, boolean>>(new Map());

  const [dialogType, setDialogType] = useState<"module" | "lesson" | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  const [moduleForm, setModuleForm] = useState<ModuleInput>({ title: "", order_index: 0 });
  const [lessonForm, setLessonForm] = useState<LessonInput>({
    module_id: "",
    title: "",
    order_index: 0,
  });

  const [deletingId, setDeletingId] = useState<{ type: "module" | "lesson"; id: string } | null>(null);

  async function toggleExpand(moduleId: string) {
    if (expandedId === moduleId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(moduleId);
    if (lessons.has(moduleId)) return;

    setLoading((m) => new Map(m).set(moduleId, true));
    try {
      const res = await fetch(`/api/incubadora/lessons?module_id=${moduleId}`);
      const data = (await res.json()) as Lesson[];
      setLessons((m) => new Map(m).set(moduleId, data));
    } catch (e) {
      toast.error("Erro ao carregar lições");
    } finally {
      setLoading((m) => {
        const next = new Map(m);
        next.delete(moduleId);
        return next;
      });
    }
  }

  function openModuleDialog(module?: Module) {
    setEditingModule(module ?? null);
    setModuleForm(
      module ? {
        title: module.title,
        description: module.description ?? "",
        order_index: module.order_index,
        is_active: module.is_active,
      } : {
        title: "",
        order_index: modules.length + 1,
        is_active: true,
      },
    );
    setDialogType("module");
  }

  function openLessonDialog(moduleId: string, lesson?: Lesson) {
    setEditingLesson(lesson ?? null);
    setSelectedModuleId(moduleId);
    setLessonForm(
      lesson ?? {
        module_id: moduleId,
        title: "",
        order_index: lessons.get(moduleId)?.length ?? 0,
      },
    );
    setDialogType("lesson");
  }

  async function handleSaveModule() {
    setLoading((m) => new Map(m).set("save", true));
    try {
      const result = editingModule
        ? await updateModuleAction(editingModule.id, moduleForm)
        : await createModuleAction(moduleForm);

      if ("error" in result && result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Erro ao guardar");
        return;
      }
      toast.success(editingModule ? "Módulo actualizado" : "Módulo criado");
      setDialogType(null);
      // Refresh modules
      const newModule = result.data as Module;
      if (editingModule) {
        setModules((m) => m.map((mod) => (mod.id === newModule.id ? newModule : mod)));
      } else {
        setModules((m) => [...m, newModule]);
      }
    } finally {
      setLoading((m) => {
        const next = new Map(m);
        next.delete("save");
        return next;
      });
    }
  }

  async function handleDeleteModule() {
    if (!deletingId || deletingId.type !== "module") return;
    try {
      const result = await deleteModuleAction(deletingId.id);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Módulo apagado");
      setModules((m) => m.filter((mod) => mod.id !== deletingId.id));
      setDeletingId(null);
    } catch (e) {
      toast.error("Erro ao apagar módulo");
    }
  }

  async function handleSaveLesson() {
    setLoading((m) => new Map(m).set("save", true));
    try {
      const result = editingLesson
        ? await updateLessonAction(editingLesson.id, lessonForm)
        : await createLessonAction(lessonForm);

      if ("error" in result && result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Erro ao guardar");
        return;
      }
      toast.success(editingLesson ? "Lição actualizada" : "Lição criada");
      setDialogType(null);

      const newLesson = result.data as Lesson;
      const moduleId = lessonForm.module_id;
      if (editingLesson) {
        setLessons((m) => {
          const cur = m.get(moduleId) ?? [];
          return new Map(m).set(
            moduleId,
            cur.map((l) => (l.id === newLesson.id ? newLesson : l)),
          );
        });
      } else {
        setLessons((m) => new Map(m).set(moduleId, [...(m.get(moduleId) ?? []), newLesson]));
      }
    } finally {
      setLoading((m) => {
        const next = new Map(m);
        next.delete("save");
        return next;
      });
    }
  }

  async function handleDeleteLesson() {
    if (!deletingId || deletingId.type !== "lesson") return;
    try {
      const result = await deleteLessonAction(deletingId.id);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Lição apagada");

      const moduleId = selectedModuleId;
      if (moduleId) {
        setLessons((m) => {
          const cur = m.get(moduleId) ?? [];
          return new Map(m).set(
            moduleId,
            cur.filter((l) => l.id !== deletingId.id),
          );
        });
      }
      setDeletingId(null);
    } catch (e) {
      toast.error("Erro ao apagar lição");
    }
  }

  return (
    <>
      <div className="border-b p-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Módulos da Incubadora</h2>
          <Button size="sm" onClick={() => openModuleDialog()}>
            <Plus className="size-4" />
            Módulo
          </Button>
        </div>

        <div className="space-y-2">
          {modules.map((mod) => (
            <div key={mod.id} className="rounded-lg border bg-card">
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => toggleExpand(mod.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {expandedId === mod.id ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </button>

                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {mod.order_index}. {mod.title}
                  </p>
                  {mod.description && (
                    <p className="text-xs text-muted-foreground">{mod.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{mod.lesson_count} lições</p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openModuleDialog(mod)}
                >
                  <Edit2 className="size-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeletingId({ type: "module", id: mod.id })}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>

              {expandedId === mod.id && (
                <div className="border-t bg-muted/30 p-4">
                  {loading.get(mod.id) ? (
                    <p className="text-xs text-muted-foreground">A carregar...</p>
                  ) : (
                    <div className="space-y-2">
                      {(lessons.get(mod.id) ?? []).map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between rounded bg-background p-2"
                        >
                          <div className="flex-1">
                            <p className="text-sm">{lesson.title}</p>
                            {lesson.content_url && (
                              <a
                                href={lesson.content_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Ver conteúdo
                              </a>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openLessonDialog(mod.id, lesson)}
                          >
                            <Edit2 className="size-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedModuleId(mod.id);
                              setDeletingId({ type: "lesson", id: lesson.id });
                            }}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        onClick={() => openLessonDialog(mod.id)}
                        className="w-full"
                      >
                        <Plus className="size-4" />
                        Lição
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={dialogType === "module"} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule ? "Editar Módulo" : "Novo Módulo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mod-title">Título *</Label>
              <Input
                id="mod-title"
                value={moduleForm.title}
                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mod-desc">Descrição</Label>
              <Textarea
                id="mod-desc"
                value={moduleForm.description ?? ""}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value || null })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mod-order">Ordem</Label>
              <Input
                id="mod-order"
                type="number"
                value={moduleForm.order_index}
                onChange={(e) => setModuleForm({ ...moduleForm, order_index: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveModule} disabled={loading.has("save")}>
              {loading.has("save") ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === "lesson"} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Editar Lição" : "Nova Lição"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="les-title">Título *</Label>
              <Input
                id="les-title"
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="les-url">URL do Conteúdo</Label>
              <Input
                id="les-url"
                type="url"
                value={lessonForm.content_url ?? ""}
                onChange={(e) => setLessonForm({ ...lessonForm, content_url: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="les-order">Ordem</Label>
              <Input
                id="les-order"
                type="number"
                value={lessonForm.order_index}
                onChange={(e) => setLessonForm({ ...lessonForm, order_index: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveLesson} disabled={loading.has("save")}>
              {loading.has("save") ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminação</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={
                deletingId?.type === "module" ? handleDeleteModule : handleDeleteLesson
              }
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
