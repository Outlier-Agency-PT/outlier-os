"use client";

import { useState, useRef, useEffect } from "react";
import { Mail, Phone, AtSign, Plus, Edit2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  updateStudentLaunchAction,
  updateStudentFinancialAction,
  upsertStudentChecklistAction,
  createStudentNoteAction,
  updateStudentNoteAction,
  deleteStudentNoteAction,
} from "@/lib/actions/students";
import type { Student, StudentChecklist, StudentNote, StudentSession } from "@/lib/queries/students";

interface StudentDetailClientProps {
  studentId: string;
  student: Student;
  sessions: StudentSession[];
  initialChecklist: StudentChecklist | null;
  initialNotes: StudentNote[];
}

export function StudentDetailClient({
  studentId,
  student,
  sessions,
  initialChecklist,
  initialNotes,
}: StudentDetailClientProps) {
  const [editingLaunch, setEditingLaunch] = useState(false);
  const [editingFinancial, setEditingFinancial] = useState(false);
  const [launchForm, setLaunchForm] = useState({
    launch_product: student.launch_product ?? "",
    launch_objective: student.launch_objective ?? "",
    launch_date: student.launch_date ?? "",
    product_ticket: student.product_ticket ?? "",
    leads_goal: student.leads_goal ?? "",
    revenue_goal: student.revenue_goal ?? "",
    investment_budget: student.investment_budget ?? "",
  });
  const [financialForm, setFinancialForm] = useState({
    revenue_generated: student.revenue_generated ?? "",
    debriefing: student.debriefing ?? "",
  });
  const [checklist, setChecklist] = useState(initialChecklist);
  const [notes, setNotes] = useState(initialNotes);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [noteForm, setNoteForm] = useState({
    contact_type: "Call" as const,
    involvement: "",
    motivation: "",
    content: "",
    reminder_date: null as string | null,
  });
  const [checklistNotes, setChecklistNotes] = useState(initialChecklist?.notes ?? "");
  const checklistTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [loadingLaunch, setLoadingLaunch] = useState(false);
  const [loadingFinancial, setLoadingFinancial] = useState(false);
  const [loadingNote, setLoadingNote] = useState(false);

  useEffect(() => {
    return () => {
      if (checklistTimeoutRef.current) clearTimeout(checklistTimeoutRef.current);
    };
  }, []);

  async function handleSaveLaunch() {
    setLoadingLaunch(true);
    const result = await updateStudentLaunchAction(studentId, {
      launch_product: launchForm.launch_product || null,
      launch_objective: launchForm.launch_objective || null,
      launch_date: launchForm.launch_date || null,
      product_ticket: launchForm.product_ticket || null,
      leads_goal: launchForm.leads_goal ? Number(launchForm.leads_goal) : null,
      revenue_goal: launchForm.revenue_goal ? Number(launchForm.revenue_goal) : null,
      investment_budget: launchForm.investment_budget ? Number(launchForm.investment_budget) : null,
    });
    setLoadingLaunch(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Lançamento actualizado");
      setEditingLaunch(false);
    }
  }

  async function handleSaveFinancial() {
    setLoadingFinancial(true);
    const result = await updateStudentFinancialAction(studentId, {
      revenue_generated: financialForm.revenue_generated ? Number(financialForm.revenue_generated) : null,
      debriefing: financialForm.debriefing || null,
    });
    setLoadingFinancial(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Financeiro actualizado");
      setEditingFinancial(false);
    }
  }

  async function handleChecklistChange(key: "has_leads_goal" | "has_organic_content" | "has_bio_link", value: boolean) {
    setChecklist((prev) => {
      if (!prev) return null;
      return { ...prev, [key]: value };
    });
    await upsertStudentChecklistAction(studentId, { [key]: value });
  }

  function handleChecklistNotesChange(text: string) {
    setChecklistNotes(text);
    if (checklistTimeoutRef.current) clearTimeout(checklistTimeoutRef.current);
    checklistTimeoutRef.current = setTimeout(async () => {
      await upsertStudentChecklistAction(studentId, { notes: text || null });
    }, 1000);
  }

  async function handleSaveNote() {
    setLoadingNote(true);
    let result;

    if (editingNoteId) {
      result = await updateStudentNoteAction(editingNoteId, studentId, noteForm);
    } else {
      result = await createStudentNoteAction(studentId, noteForm as any);
    }

    setLoadingNote(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(editingNoteId ? "Nota actualizada" : "Nota criada");
      setShowNoteDialog(false);
      setEditingNoteId(null);
      setNoteForm({ contact_type: "Call", involvement: "", motivation: "", content: "", reminder_date: null });
    }
  }

  function openNoteDialog(noteId?: string) {
    if (noteId) {
      const note = notes.find(n => n.id === noteId);
      if (note) {
        setEditingNoteId(noteId);
        setNoteForm({
          contact_type: note.contact_type as any,
          involvement: note.involvement,
          motivation: note.motivation,
          content: note.content,
          reminder_date: note.reminder_date || null,
        });
      }
    } else {
      setEditingNoteId(null);
      setNoteForm({ contact_type: "Call", involvement: "", motivation: "", content: "", reminder_date: null });
    }
    setShowNoteDialog(true);
  }

  async function handleDeleteNote(noteId: string) {
    setLoadingNote(true);
    const result = await deleteStudentNoteAction(noteId, studentId);
    setLoadingNote(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Nota apagada");
      setDeletingNoteId(null);
    }
  }

  return (
    <div className="space-y-6 p-8">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {student.email && <Row icon={Mail} label="Email" value={student.email} />}
            {student.phone && <Row icon={Phone} label="Telefone" value={student.phone} />}
            {student.instagram && <Row icon={AtSign} label="Instagram" value={student.instagram} />}
            {student.nicho && <Row label="Nicho" value={student.nicho} />}
            {student.subnicho && <Row label="Subnicho" value={student.subnicho} />}
            {student.turma && <Row label="Turma" value={student.turma} />}
            {student.entry_type && <Row label="Tipo de entrada" value={student.entry_type} />}
            {student.start_date && <Row label="Início" value={formatDate(student.start_date)} />}
            {student.end_date && <Row label="Fim" value={formatDate(student.end_date)} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline de Sessões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {sessions.map((s) => (
                <div key={s.id} className="rounded-lg border p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {s.type.label}
                  </p>
                  {s.completed_at ? (
                    <Badge variant="default" className="mt-2 text-[10px]">Concluída</Badge>
                  ) : s.scheduled_date ? (
                    <Badge variant="secondary" className="mt-2 text-[10px]">Agendada</Badge>
                  ) : (
                    <Badge variant="outline" className="mt-2 text-[10px]">Pendente</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Contexto do Lançamento</CardTitle>
          {!editingLaunch && (
            <Button size="sm" variant="outline" onClick={() => setEditingLaunch(true)}>
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingLaunch ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium">Produto</label>
                  <Input
                    value={launchForm.launch_product}
                    onChange={(e) => setLaunchForm({ ...launchForm, launch_product: e.target.value })}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Objectivo</label>
                  <Input
                    value={launchForm.launch_objective}
                    onChange={(e) => setLaunchForm({ ...launchForm, launch_objective: e.target.value })}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Data</label>
                  <Input
                    type="date"
                    value={launchForm.launch_date}
                    onChange={(e) => setLaunchForm({ ...launchForm, launch_date: e.target.value })}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Ticket Produto</label>
                  <Input
                    value={launchForm.product_ticket}
                    onChange={(e) => setLaunchForm({ ...launchForm, product_ticket: e.target.value })}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Meta Leads</label>
                  <Input
                    type="number"
                    value={launchForm.leads_goal}
                    onChange={(e) => setLaunchForm({ ...launchForm, leads_goal: e.target.value })}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Meta Receita (€)</label>
                  <Input
                    type="number"
                    value={launchForm.revenue_goal}
                    onChange={(e) => setLaunchForm({ ...launchForm, revenue_goal: e.target.value })}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Orçamento Investimento (€)</label>
                  <Input
                    type="number"
                    value={launchForm.investment_budget}
                    onChange={(e) => setLaunchForm({ ...launchForm, investment_budget: e.target.value })}
                    className="mt-1 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveLaunch} disabled={loadingLaunch}>
                  {loadingLaunch ? "A guardar..." : "Guardar"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingLaunch(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 text-sm md:grid-cols-2">
              {student.launch_product && <Row label="Produto" value={student.launch_product} />}
              {student.launch_objective && <Row label="Objectivo" value={student.launch_objective} />}
              {student.launch_date && <Row label="Data" value={formatDate(student.launch_date)} />}
              {student.product_ticket && <Row label="Ticket" value={student.product_ticket} />}
              {student.leads_goal && <Row label="Meta Leads" value={student.leads_goal} />}
              {student.revenue_goal && <Row label="Meta Receita" value={`${student.revenue_goal}€`} />}
              {student.investment_budget && <Row label="Orçamento" value={`${student.investment_budget}€`} />}
              {!student.launch_product && <p className="text-muted-foreground">—</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Progresso Financeiro</CardTitle>
          {!editingFinancial && (
            <Button size="sm" variant="outline" onClick={() => setEditingFinancial(true)}>
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingFinancial ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium">Receita Gerada (€)</label>
                <Input
                  type="number"
                  value={financialForm.revenue_generated}
                  onChange={(e) => setFinancialForm({ ...financialForm, revenue_generated: e.target.value })}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Debriefing</label>
                <Textarea
                  value={financialForm.debriefing}
                  onChange={(e) => setFinancialForm({ ...financialForm, debriefing: e.target.value })}
                  className="mt-1 text-sm"
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveFinancial} disabled={loadingFinancial}>
                  {loadingFinancial ? "A guardar..." : "Guardar"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingFinancial(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {student.revenue_generated && <Row label="Receita Gerada" value={`${student.revenue_generated}€`} />}
              {student.debriefing && <div>
                <p className="text-xs text-muted-foreground">Debriefing</p>
                <p className="mt-1 whitespace-pre-wrap">{student.debriefing}</p>
              </div>}
              {!student.revenue_generated && !student.debriefing && <p className="text-muted-foreground">—</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checklist de Acompanhamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <ChecklistItem
              label="Leads Goal"
              checked={checklist?.has_leads_goal ?? false}
              onChange={(v) => handleChecklistChange("has_leads_goal", v)}
            />
            <ChecklistItem
              label="Conteúdo Orgânico"
              checked={checklist?.has_organic_content ?? false}
              onChange={(v) => handleChecklistChange("has_organic_content", v)}
            />
            <ChecklistItem
              label="Bio Link"
              checked={checklist?.has_bio_link ?? false}
              onChange={(v) => handleChecklistChange("has_bio_link", v)}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Notas</label>
            <Textarea
              value={checklistNotes}
              onChange={(e) => handleChecklistNotesChange(e.target.value)}
              className="mt-1 text-sm"
              rows={3}
              placeholder="Notas adicionais..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Notas e Contactos</CardTitle>
          <Button size="sm" onClick={() => openNoteDialog()}>
            <Plus className="mr-1 size-3" />
            Nota
          </Button>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => {
                const contactTypeColors: Record<string, string> = {
                  "Call": "bg-blue-100 text-blue-700",
                  "WhatsApp": "bg-green-100 text-green-700",
                  "Email": "bg-purple-100 text-purple-700",
                  "Sessão quinzenal": "bg-orange-100 text-orange-700",
                  "Outro": "bg-gray-100 text-gray-700",
                };
                return (
                  <div key={note.id} className="border-b pb-3 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${contactTypeColors[note.contact_type] || "bg-gray-100 text-gray-700"}`}>
                            {note.contact_type}
                          </Badge>
                          <p className="text-sm font-medium">{note.author.full_name}</p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(note.created_at)} · {note.involvement} · {note.motivation}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openNoteDialog(note.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingNoteId(note.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{note.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {student.briefing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Briefing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{student.briefing}</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNoteId ? "Editar Nota" : "Nova Nota"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tipo de Contacto</label>
              <Input
                value={noteForm.contact_type}
                onChange={(e) => setNoteForm({ ...noteForm, contact_type: e.target.value as any })}
                list="contact-types"
                className="mt-1"
                placeholder="Call, WhatsApp, Email..."
              />
              <datalist id="contact-types">
                <option value="Call" />
                <option value="WhatsApp" />
                <option value="Email" />
                <option value="Sessão quinzenal" />
                <option value="Reunião" />
                <option value="Follow-up" />
                <option value="Outro" />
              </datalist>
            </div>
            <div>
              <label className="text-sm font-medium">Lembrete (opcional)</label>
              <Input
                type="date"
                value={noteForm.reminder_date || ""}
                onChange={(e) => setNoteForm({ ...noteForm, reminder_date: e.target.value || null })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Envolvimento</label>
              <Input
                value={noteForm.involvement}
                onChange={(e) => setNoteForm({ ...noteForm, involvement: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Motivação</label>
              <Input
                value={noteForm.motivation}
                onChange={(e) => setNoteForm({ ...noteForm, motivation: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Conteúdo</label>
              <Textarea
                value={noteForm.content}
                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveNote} disabled={loadingNote}>
              {loadingNote ? (editingNoteId ? "A guardar..." : "A criar...") : (editingNoteId ? "Guardar" : "Criar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingNoteId} onOpenChange={() => setDeletingNoteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apagar Nota</DialogTitle>
            <DialogDescription>
              Tem a certeza que quer apagar esta nota? Esta ação é irreversível.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingNoteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingNoteId && handleDeleteNote(deletingNoteId)}
              disabled={loadingNote}
            >
              {loadingNote ? "A apagar..." : "Apagar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="mt-0.5 size-4 text-muted-foreground" />}
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words">{value}</p>
      </div>
    </div>
  );
}

function ChecklistItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

