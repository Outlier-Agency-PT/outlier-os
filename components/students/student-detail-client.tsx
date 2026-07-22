"use client";

import { useState, useRef, useEffect } from "react";
import {
  Mail,
  Phone,
  AtSign,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Network,
  Pencil,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  updateStudentAction,
  updateStudentFinancialAction,
  upsertStudentChecklistAction,
  createStudentNoteAction,
  updateStudentNoteAction,
  deleteStudentNoteAction,
  updateRenewalAction,
  updateStudentSalesPageByIdAction,
  updateBriefingReviewStatusAction,
  getStudentBriefingAction,
} from "@/lib/actions/students";
import { getStudentMilestonesForCoachAction } from "@/lib/actions/milestones";
import { BriefingDialog } from "@/components/students/briefing-dialog";
import { StudentCoachTasks } from "@/components/students/student-coach-tasks";
import { StudentAudienceCoach } from "@/components/students/student-audience-coach";
import { StudentProductsCoach } from "@/components/students/student-products-coach";
import { StudentLaunches } from "@/components/students/student-launches";
import { StudentSupportDashboard } from "@/components/students/student-support-dashboard";
import { SectionStatusBadge } from "@/components/ui/section-status-badge";
import type { ReviewStatus } from "@/lib/types/review-status";
import { COACH_TRANSITIONS } from "@/lib/types/review-status";
import type { JourneyMilestone } from "@/lib/queries/milestones";
import type {
  Student,
  StudentBriefing,
  StudentChecklist,
  StudentNote,
  StudentSession,
} from "@/lib/queries/students";
import type { StudentProgressDetail } from "@/lib/queries/incubadora";

// ── Types ─────────────────────────────────────────────────────────────────────

type RenewalStatus = "pendente" | "renovado" | "nao_renovado" | "bonus";

const RENEWAL_STATUS_OPTIONS: { value: RenewalStatus; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "renovado", label: "Renovado" },
  { value: "nao_renovado", label: "Não Renovado" },
  { value: "bonus", label: "Bónus" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDaysRemaining(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RenewalStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "renovado":
      return (
        <Badge className="rounded-full border border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">
          Renovado
        </Badge>
      );
    case "nao_renovado":
      return (
        <Badge className="rounded-full border border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
          Não Renovado
        </Badge>
      );
    case "bonus":
      return (
        <Badge
          className="rounded-full border-transparent text-white"
          style={{ backgroundColor: "#A12B2B" }}
        >
          Bónus
        </Badge>
      );
    default:
      return (
        <Badge className="rounded-full border border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          Pendente
        </Badge>
      );
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface StudentDetailClientProps {
  studentId: string;
  student: Student;
  sessions: StudentSession[];
  initialChecklist: StudentChecklist | null;
  initialNotes: StudentNote[];
  isStaff?: boolean;
  initialBriefing?: StudentBriefing | null;
  progressDetail?: StudentProgressDetail | null;
}

// ── Main component ────────────────────────────────────────────────────────────

export function StudentDetailClient({
  studentId,
  student,
  sessions,
  initialChecklist,
  initialNotes,
  isStaff = false,
  initialBriefing = null,
  progressDetail = null,
}: StudentDetailClientProps) {
  // ── Profile ────────────────────────────────────────────────────────────────
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileForm, setProfileForm] = useState({
    instagram: student.instagram ?? "",
    phone: student.phone ?? "",
    mindmap_url: student.mindmap_url ?? "",
    coach_id: student.coach_id ?? "",
    status: student.status ?? "ativo",
    start_date: student.start_date ?? "",
    motivation: student.motivation ?? "",
    priority: student.priority ?? "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ id: string; full_name: string }[]>([]);

  // ── Financial ─────────────────────────────────────────────────────────────
  const [editingFinancial, setEditingFinancial] = useState(false);
  const [financialForm, setFinancialForm] = useState({
    revenue_generated: student.revenue_generated ?? "",
    debriefing: student.debriefing ?? "",
  });
  const [loadingFinancial, setLoadingFinancial] = useState(false);

  // ── Checklist ─────────────────────────────────────────────────────────────
  const [checklist, setChecklist] = useState(initialChecklist);
  const [checklistNotes, setChecklistNotes] = useState(initialChecklist?.notes ?? "");
  const checklistTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Notes (Diário de Bordo) ───────────────────────────────────────────────
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
    reminder_note: null as string | null,
  });
  const [loadingNote, setLoadingNote] = useState(false);

  // ── Briefing dialog ───────────────────────────────────────────────────────
  const [showBriefingDialog, setShowBriefingDialog] = useState(false);

  // ── Briefing review (coach panel) ─────────────────────────────────────────
  const [briefingReviewStatus, setBriefingReviewStatus] = useState<ReviewStatus>(
    (initialBriefing?.review_status as ReviewStatus) ?? "nao_iniciado",
  );
  const [existingReviewNotes, setExistingReviewNotes] = useState<string | null>(
    initialBriefing?.review_notes ?? null,
  );
  const [reviewNotesInput, setReviewNotesInput] = useState("");
  const [showReviewNotesInput, setShowReviewNotesInput] = useState(false);
  const [loadingBriefingReview, setLoadingBriefingReview] = useState(false);
  const [editingReviewNotes, setEditingReviewNotes] = useState(false);
  const [reviewNotesEditInput, setReviewNotesEditInput] = useState("");

  // ── Renewal ───────────────────────────────────────────────────────────────
  const [renewalStatus, setRenewalStatus] = useState<RenewalStatus>(
    (student.renewal_status as RenewalStatus) ?? "pendente",
  );
  const [renewalDate, setRenewalDate] = useState(student.renewal_date ?? "");
  const [renewalNotes, setRenewalNotes] = useState(student.renewal_notes ?? "");
  const [editingRenewalDate, setEditingRenewalDate] = useState(false);
  const [editingRenewalNotes, setEditingRenewalNotes] = useState(false);
  const [loadingRenewal, setLoadingRenewal] = useState(false);

  // ── Página de vendas ──────────────────────────────────────────────────────
  const [salesPageUrl, setSalesPageUrl] = useState<string | null>(
    student.sales_page_url ?? null,
  );
  const [salesPagePublishedAt, setSalesPagePublishedAt] = useState<string | null>(
    student.sales_page_published_at ?? null,
  );
  const [editingSalesPage, setEditingSalesPage] = useState(false);
  const [salesPageInput, setSalesPageInput] = useState(student.sales_page_url ?? "");
  const [salesPageUrlError, setSalesPageUrlError] = useState("");
  const [savingSalesPage, setSavingSalesPage] = useState(false);

  // ── Jornada do aluno ──────────────────────────────────────────────────────
  const [milestones, setMilestones] = useState<JourneyMilestone[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (checklistTimeoutRef.current) clearTimeout(checklistTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isStaff) return;
    setLoadingMilestones(true);
    getStudentMilestonesForCoachAction(studentId)
      .then((data) => setMilestones(data))
      .catch(() => {/* milestones não críticos — falha silenciosa */})
      .finally(() => setLoadingMilestones(false));
  }, [studentId, isStaff]);

  useEffect(() => {
    if (!isStaff) return;
    const supabase = createClient();
    supabase
      .from("team_members")
      .select("id, full_name")
      .eq("active", true)
      .order("full_name")
      .then(({ data }) => setTeamMembers(data ?? []));
  }, [isStaff]);

  // Polling de 60s para o estado de revisão do briefing (detecta submissões do aluno)
  useEffect(() => {
    if (!isStaff) return;
    const id = setInterval(async () => {
      const data = await getStudentBriefingAction(studentId).catch(() => null);
      if (!data) return;
      const next = (data as { review_status?: string }).review_status as ReviewStatus | undefined;
      if (next && next !== briefingReviewStatus) {
        setBriefingReviewStatus(next);
        const notes = (data as { review_notes?: string | null }).review_notes ?? null;
        if (notes !== existingReviewNotes) setExistingReviewNotes(notes);
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [studentId, isStaff, briefingReviewStatus, existingReviewNotes]);

  // ── Profile handlers ──────────────────────────────────────────────────────

  async function handleSaveProfile() {
    setSavingProfile(true);
    const payload: Parameters<typeof updateStudentAction>[1] = {
      instagram: profileForm.instagram || null,
      phone: profileForm.phone || null,
      mindmap_url: profileForm.mindmap_url || null,
    };
    if (isStaff) {
      payload.coach_id = profileForm.coach_id || null;
      payload.status = profileForm.status || "ativo";
      payload.start_date = profileForm.start_date || null;
      payload.motivation = profileForm.motivation || null;
      payload.priority = (profileForm.priority as "alta" | "media" | "baixa") || null;
    }
    const result = await updateStudentAction(studentId, payload);
    setSavingProfile(false);
    if ("error" in result) {
      toast.error("Erro ao guardar perfil");
    } else {
      toast.success("Perfil actualizado");
      setShowProfileDialog(false);
    }
  }

  // ── Financial handlers ────────────────────────────────────────────────────

  async function handleSaveFinancial() {
    setLoadingFinancial(true);
    const result = await updateStudentFinancialAction(studentId, {
      revenue_generated: financialForm.revenue_generated
        ? Number(financialForm.revenue_generated)
        : null,
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

  // ── Checklist handlers ────────────────────────────────────────────────────

  async function handleChecklistChange(
    key: "has_strategy_session" | "has_business_briefing" | "has_mindmap"
       | "has_bio_link" | "has_organic_content" | "has_instagram"
       | "has_launch_briefing" | "has_capture_page" | "has_leads_goal"
       | "has_ads_campaign" | "has_launch" | "has_debrief",
    value: boolean,
  ) {
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

  // ── Renewal handlers ──────────────────────────────────────────────────────

  async function handleRenewalStatusChange(value: string) {
    const next = value as RenewalStatus;
    setRenewalStatus(next);
    const result = await updateRenewalAction(studentId, { renewal_status: next });
    if ("error" in result) toast.error(result.error);
    else toast.success("Status de renovação actualizado");
  }

  async function handleSaveRenewalDate() {
    setLoadingRenewal(true);
    const result = await updateRenewalAction(studentId, { renewal_date: renewalDate || null });
    setLoadingRenewal(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Data de renovação actualizada");
      setEditingRenewalDate(false);
    }
  }

  async function handleSaveRenewalNotes() {
    setLoadingRenewal(true);
    const result = await updateRenewalAction(studentId, {
      renewal_notes: renewalNotes || null,
    });
    setLoadingRenewal(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Notas de renovação actualizadas");
      setEditingRenewalNotes(false);
    }
  }

  // ── Briefing review handlers ──────────────────────────────────────────────

  async function handleBriefingReviewAction(nextStatus: ReviewStatus, notes?: string) {
    setLoadingBriefingReview(true);
    const result = await updateBriefingReviewStatusAction(studentId, nextStatus, notes);
    setLoadingBriefingReview(false);
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    setBriefingReviewStatus(nextStatus);
    if (notes) setExistingReviewNotes(notes);
    setShowReviewNotesInput(false);
    setReviewNotesInput("");
    toast.success(
      nextStatus === "aprovado"
        ? "Briefing aprovado"
        : nextStatus === "alteracoes_pedidas"
          ? "Alterações pedidas ao aluno"
          : "Estado de revisão actualizado",
    );
  }

  async function handleSaveReviewNotes() {
    setLoadingBriefingReview(true);
    const result = await updateBriefingReviewStatusAction(
      studentId,
      briefingReviewStatus,
      reviewNotesEditInput,
    );
    setLoadingBriefingReview(false);
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    setExistingReviewNotes(reviewNotesEditInput);
    setEditingReviewNotes(false);
    setReviewNotesEditInput("");
    toast.success("Nota de revisão guardada");
  }

  // ── Sales page handlers ───────────────────────────────────────────────────

  async function handleSaveSalesPage() {
    const trimmed = salesPageInput.trim();
    if (!trimmed) {
      setSalesPageUrlError("Insere um URL.");
      return;
    }
    if (!isValidUrl(trimmed)) {
      setSalesPageUrlError("URL inválido — deve começar com https:// ou http://");
      return;
    }
    setSalesPageUrlError("");
    setSavingSalesPage(true);
    const result = await updateStudentSalesPageByIdAction(studentId, trimmed);
    setSavingSalesPage(false);
    if (result && "error" in result && result.error) {
      toast.error(result.error as string);
      return;
    }
    const isFirst = !salesPageUrl;
    setSalesPageUrl(trimmed);
    if (isFirst) setSalesPagePublishedAt(new Date().toISOString());
    setEditingSalesPage(false);
    toast.success(isFirst ? "Página de vendas publicada" : "URL actualizado");
  }

  // ── Notes handlers ────────────────────────────────────────────────────────

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
      setNoteForm({
        contact_type: "Call",
        involvement: "",
        motivation: "",
        content: "",
        reminder_date: null,
        reminder_note: null,
      });
    }
  }

  function openNoteDialog(noteId?: string) {
    if (noteId) {
      const note = notes.find((n) => n.id === noteId);
      if (note) {
        setEditingNoteId(noteId);
        setNoteForm({
          contact_type: note.contact_type as any,
          involvement: note.involvement,
          motivation: note.motivation,
          content: note.content,
          reminder_date: note.reminder_date || null,
          reminder_note: note.reminder_note || null,
        });
      }
    } else {
      setEditingNoteId(null);
      setNoteForm({
        contact_type: "Call",
        involvement: "",
        motivation: "",
        content: "",
        reminder_date: null,
        reminder_note: null,
      });
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
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setDeletingNoteId(null);
    }
  }

  const diasRestantes = getDaysRemaining(renewalDate || null);
  const briefingTransitions = COACH_TRANSITIONS[briefingReviewStatus];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-8">

      {/* ── Perfil + Timeline de Sessões ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Perfil</CardTitle>
            {isStaff && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => {
                  setProfileForm({
                    instagram: student.instagram ?? "",
                    phone: student.phone ?? "",
                    mindmap_url: student.mindmap_url ?? "",
                    coach_id: student.coach_id ?? "",
                    status: student.status ?? "ativo",
                    start_date: student.start_date ?? "",
                    motivation: student.motivation ?? "",
                    priority: student.priority ?? "",
                  });
                  setShowProfileDialog(true);
                }}
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {student.email && <Row icon={Mail} label="Email" value={student.email} />}
            {student.phone && <Row icon={Phone} label="Telefone" value={student.phone} />}
            {student.instagram && (
              <Row
                icon={AtSign}
                label="Instagram"
                value={<InstagramLink handle={student.instagram} />}
              />
            )}
            {isStaff && (
              <Row
                icon={Network}
                label="Mind Map"
                value={
                  student.mindmap_url ? (
                    <a
                      href={student.mindmap_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      Ver Mind Map
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Não definido</span>
                  )
                }
              />
            )}
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
                    <Badge variant="default" className="mt-2 text-[10px]">
                      Concluída
                    </Badge>
                  ) : s.scheduled_date ? (
                    <Badge variant="secondary" className="mt-2 text-[10px]">
                      Agendada
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      Pendente
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Checklist de Acompanhamento ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checklist de Acompanhamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Setup inicial</p>
            <ChecklistItem
              label="Sessão estratégica realizada"
              checked={checklist?.has_strategy_session ?? false}
              onChange={(v) => handleChecklistChange("has_strategy_session", v)}
            />
            <ChecklistItem
              label="Briefing de negócio preenchido"
              checked={checklist?.has_business_briefing ?? false}
              onChange={(v) => handleChecklistChange("has_business_briefing", v)}
            />
            <ChecklistItem
              label="Mindmap de planeamento criado"
              checked={checklist?.has_mindmap ?? false}
              onChange={(v) => handleChecklistChange("has_mindmap", v)}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Presença digital</p>
            <ChecklistItem
              label="Bio link configurado"
              checked={checklist?.has_bio_link ?? false}
              onChange={(v) => handleChecklistChange("has_bio_link", v)}
            />
            <ChecklistItem
              label="Conteúdo orgânico ativo"
              checked={checklist?.has_organic_content ?? false}
              onChange={(v) => handleChecklistChange("has_organic_content", v)}
            />
            <ChecklistItem
              label="Instagram profissional configurado"
              checked={checklist?.has_instagram ?? false}
              onChange={(v) => handleChecklistChange("has_instagram", v)}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Lançamento</p>
            <ChecklistItem
              label="Briefing de lançamento preenchido"
              checked={checklist?.has_launch_briefing ?? false}
              onChange={(v) => handleChecklistChange("has_launch_briefing", v)}
            />
            <ChecklistItem
              label="Página de captação criada"
              checked={checklist?.has_capture_page ?? false}
              onChange={(v) => handleChecklistChange("has_capture_page", v)}
            />
            <ChecklistItem
              label="Leads goal definido"
              checked={checklist?.has_leads_goal ?? false}
              onChange={(v) => handleChecklistChange("has_leads_goal", v)}
            />
            <ChecklistItem
              label="Campanha de anúncios ativa"
              checked={checklist?.has_ads_campaign ?? false}
              onChange={(v) => handleChecklistChange("has_ads_campaign", v)}
            />
            <ChecklistItem
              label="Lançamento realizado"
              checked={checklist?.has_launch ?? false}
              onChange={(v) => handleChecklistChange("has_launch", v)}
            />
            <ChecklistItem
              label="Debriefing preenchido"
              checked={checklist?.has_debrief ?? false}
              onChange={(v) => handleChecklistChange("has_debrief", v)}
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

      {/* ── Diário de Bordo ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Diário de Bordo</CardTitle>
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
                const noteDate = formatDate(note.created_at).split(" ").slice(-3).join(" ");
                return (
                  <div key={note.id} className="space-y-2 rounded-lg border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{note.author.full_name}</p>
                          <span className="text-xs text-muted-foreground">·</span>
                          <Badge variant="secondary" className="text-xs">
                            {note.contact_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{noteDate}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Envolvimento: {note.involvement} · Motivação: {note.motivation}
                        </p>
                        <p className="text-sm text-foreground">{note.content}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
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
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Tarefas do aluno ── */}
      {isStaff && (
        <StudentCoachTasks userId={student.user_id} studentName={student.name} />
      )}

      {/* ── Renovação ── */}
      {isStaff && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Renovação</CardTitle>
            <RenewalStatusBadge status={renewalStatus} />
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-xs text-muted-foreground">Status</span>
              <Select value={renewalStatus} onValueChange={handleRenewalStatusChange}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RENEWAL_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {student.end_date && (
              <div className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-xs text-muted-foreground">
                  Fim do contrato
                </span>
                <span>{formatDate(student.end_date)}</span>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-xs text-muted-foreground">
                  Data de renovação
                </span>
                {editingRenewalDate ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={renewalDate}
                      onChange={(e) => setRenewalDate(e.target.value)}
                      className="h-8 w-40 text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveRenewalDate}
                      disabled={loadingRenewal}
                      className="h-8 text-xs"
                    >
                      {loadingRenewal ? "A guardar..." : "Guardar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRenewalDate(student.renewal_date ?? "");
                        setEditingRenewalDate(false);
                      }}
                      className="h-8 text-xs"
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>{renewalDate ? formatDate(renewalDate) : "—"}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingRenewalDate(true)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit2 className="size-3" />
                    </Button>
                  </div>
                )}
              </div>

              {diasRestantes !== null && (
                <div
                  className={`ml-[9.75rem] flex items-center gap-1 text-xs ${
                    diasRestantes <= 7
                      ? "text-red-600"
                      : diasRestantes <= 30
                        ? "text-amber-600"
                        : "text-muted-foreground"
                  }`}
                >
                  {diasRestantes <= 7 && <AlertTriangle className="size-3" />}
                  {diasRestantes < 0
                    ? `${Math.abs(diasRestantes)} dias em atraso`
                    : diasRestantes === 0
                      ? "Vence hoje"
                      : `${diasRestantes} dias restantes`}
                </div>
              )}
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Observações de Renovação
              </p>
              {editingRenewalNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={renewalNotes}
                    onChange={(e) => setRenewalNotes(e.target.value)}
                    className="text-sm"
                    rows={3}
                    placeholder="Ex: vai pagar em novembro, recebe bónus almoço…"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveRenewalNotes} disabled={loadingRenewal}>
                      {loadingRenewal ? "A guardar..." : "Guardar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRenewalNotes(student.renewal_notes ?? "");
                        setEditingRenewalNotes(false);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p className="flex-1 whitespace-pre-wrap text-sm">
                    {renewalNotes || <span className="text-muted-foreground">—</span>}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingRenewalNotes(true)}
                    className="h-6 w-6 shrink-0 p-0"
                  >
                    <Edit2 className="size-3" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Briefing do Negócio ── */}
      {isStaff && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Briefing do Negócio</CardTitle>
              <SectionStatusBadge status={briefingReviewStatus} />
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowBriefingDialog(true)}>
              Ver completo
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sumário read-only */}
            {initialBriefing?.negocio?.nome_negocio ? (
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <Row label="Negócio" value={initialBriefing.negocio.nome_negocio} />
                {initialBriefing.negocio.nicho && (
                  <Row label="Nicho" value={initialBriefing.negocio.nicho} />
                )}
                {initialBriefing.negocio.proposta_valor && (
                  <div className="sm:col-span-2">
                    <Row
                      label="Proposta de valor"
                      value={
                        initialBriefing.negocio.proposta_valor.length > 160
                          ? initialBriefing.negocio.proposta_valor.slice(0, 160) + "…"
                          : initialBriefing.negocio.proposta_valor
                      }
                    />
                  </div>
                )}
                {initialBriefing.audiencia?.avatar && (
                  <div className="sm:col-span-2">
                    <Row
                      label="Avatar"
                      value={
                        initialBriefing.audiencia.avatar.length > 120
                          ? initialBriefing.audiencia.avatar.slice(0, 120) + "…"
                          : initialBriefing.audiencia.avatar
                      }
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                O aluno ainda não preencheu o briefing.
              </p>
            )}

            {/* Nota de revisão existente */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Nota de revisão para o aluno
                </p>
                {!editingReviewNotes && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setReviewNotesEditInput(existingReviewNotes ?? "");
                      setEditingReviewNotes(true);
                    }}
                  >
                    <Edit2 className="size-3" />
                  </Button>
                )}
              </div>

              {editingReviewNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={reviewNotesEditInput}
                    onChange={(e) => setReviewNotesEditInput(e.target.value)}
                    placeholder="Feedback visível para o aluno..."
                    rows={3}
                    className="text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveReviewNotes}
                      disabled={loadingBriefingReview}
                    >
                      {loadingBriefingReview ? "A guardar..." : "Guardar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingReviewNotes(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {existingReviewNotes || "—"}
                </p>
              )}
            </div>

            {/* Painel de transição de estado */}
            {briefingTransitions && briefingTransitions.length > 0 && (
              <div className="space-y-3 rounded-lg border border-dashed p-3">
                <p className="text-xs font-medium text-muted-foreground">Mudar estado</p>
                <div className="flex flex-wrap gap-2">
                  {briefingTransitions.includes("aprovado") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400"
                      onClick={() => handleBriefingReviewAction("aprovado")}
                      disabled={loadingBriefingReview}
                    >
                      {loadingBriefingReview ? "A guardar..." : "Aprovar"}
                    </Button>
                  )}
                  {briefingTransitions.includes("alteracoes_pedidas") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400"
                      onClick={() => setShowReviewNotesInput((p) => !p)}
                      disabled={loadingBriefingReview}
                    >
                      Pedir alterações
                    </Button>
                  )}
                  {briefingTransitions.includes("arquivado") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => handleBriefingReviewAction("arquivado")}
                      disabled={loadingBriefingReview}
                    >
                      Arquivar
                    </Button>
                  )}
                </div>

                {showReviewNotesInput && briefingTransitions.includes("alteracoes_pedidas") && (
                  <div className="space-y-2">
                    <Textarea
                      value={reviewNotesInput}
                      onChange={(e) => setReviewNotesInput(e.target.value)}
                      placeholder="Descreve as alterações necessárias (obrigatório)…"
                      rows={3}
                      className="text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleBriefingReviewAction("alteracoes_pedidas", reviewNotesInput)
                        }
                        disabled={loadingBriefingReview || !reviewNotesInput.trim()}
                      >
                        {loadingBriefingReview ? "A enviar..." : "Enviar feedback"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowReviewNotesInput(false);
                          setReviewNotesInput("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Audiência ── */}
      {isStaff && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Audiência</CardTitle>
          </CardHeader>
          <CardContent>
            <StudentAudienceCoach studentId={studentId} />
          </CardContent>
        </Card>
      )}

      {/* ── Produtos ── */}
      {isStaff && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <StudentProductsCoach studentId={studentId} />
          </CardContent>
        </Card>
      )}

      {/* ── Tracker de Lançamentos ── */}
      <StudentLaunches studentId={studentId} isCoach={isStaff} />

      {/* ── Página de Vendas ── */}
      {isStaff && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">Página de Vendas</CardTitle>
            </div>
            {!editingSalesPage && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSalesPageInput(salesPageUrl ?? "");
                  setSalesPageUrlError("");
                  setEditingSalesPage(true);
                }}
              >
                {salesPageUrl ? "Editar URL" : "Adicionar página"}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editingSalesPage ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Input
                    value={salesPageInput}
                    onChange={(e) => {
                      setSalesPageInput(e.target.value);
                      if (salesPageUrlError) setSalesPageUrlError("");
                    }}
                    placeholder="https://minhaloja.com/pagina-vendas"
                    className={salesPageUrlError ? "border-destructive text-sm" : "text-sm"}
                    autoFocus
                  />
                  {salesPageUrlError && (
                    <p className="text-xs text-destructive">{salesPageUrlError}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveSalesPage} disabled={savingSalesPage}>
                    {savingSalesPage ? "A guardar..." : salesPageUrl ? "Guardar" : "Publicar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingSalesPage(false);
                      setSalesPageUrlError("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : salesPageUrl ? (
              <div className="space-y-1.5">
                <a
                  href={salesPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  <span className="max-w-xs truncate">{salesPageUrl}</span>
                  <ExternalLink className="size-3 shrink-0" />
                </a>
                {salesPagePublishedAt && (
                  <p className="text-xs text-muted-foreground">
                    Publicada em {fmtDateShort(salesPagePublishedAt)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                O aluno ainda não tem uma página de vendas registada.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Jornada do Aluno ── */}
      {isStaff && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jornada do Aluno</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMilestones ? (
              <p className="text-sm text-muted-foreground">A carregar…</p>
            ) : milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ainda sem marcos atingidos.
              </p>
            ) : (
              <div className="relative space-y-0">
                {/* Linha vertical */}
                <div className="absolute left-4 top-3 h-[calc(100%-24px)] w-px bg-border" />

                {milestones.map((m) => (
                  <div key={m.key} className="relative flex items-start gap-4 pb-5 last:pb-0">
                    {/* Ícone */}
                    <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-base">
                      {m.icon}
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm font-medium">{m.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDateShort(m.achieved_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Suporte ── */}
      {isStaff && (
        <StudentSupportDashboard studentUserId={student.user_id} />
      )}

      {/* ── Progresso Financeiro ── */}
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
                  onChange={(e) =>
                    setFinancialForm({ ...financialForm, revenue_generated: e.target.value })
                  }
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Debriefing</label>
                <Textarea
                  value={financialForm.debriefing}
                  onChange={(e) =>
                    setFinancialForm({ ...financialForm, debriefing: e.target.value })
                  }
                  className="mt-1 text-sm"
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveFinancial} disabled={loadingFinancial}>
                  {loadingFinancial ? "A guardar..." : "Guardar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingFinancial(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {student.revenue_goal && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Meta Mensal</span>
                    <span className="font-medium">
                      {student.revenue_goal.toLocaleString("pt-PT")}€
                    </span>
                  </div>
                  {student.revenue_generated != null && student.revenue_goal > 0 && (
                    <div className="space-y-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.round((student.revenue_generated / student.revenue_goal) * 100))}%`,
                            backgroundColor: "#A12B2B",
                          }}
                        />
                      </div>
                      <p className="text-right text-xs text-muted-foreground">
                        {Math.min(
                          100,
                          Math.round(
                            (student.revenue_generated / student.revenue_goal) * 100,
                          ),
                        )}
                        % da meta
                      </p>
                    </div>
                  )}
                </div>
              )}
              {student.revenue_generated && (
                <Row
                  label="Receita Gerada"
                  value={`${student.revenue_generated.toLocaleString("pt-PT")}€`}
                />
              )}
              {student.investment_budget && (
                <Row
                  label="Investimento"
                  value={`${student.investment_budget.toLocaleString("pt-PT")}€`}
                />
              )}
              {student.debriefing && (
                <div>
                  <p className="text-xs text-muted-foreground">Debriefing</p>
                  <p className="mt-1 whitespace-pre-wrap">{student.debriefing}</p>
                </div>
              )}
              {!student.revenue_goal &&
                !student.revenue_generated &&
                !student.investment_budget &&
                !student.debriefing && <p className="text-muted-foreground">—</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Progresso no Método ── */}
      {progressDetail && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progresso no Método</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso geral</span>
                <span className="font-medium">{progressDetail.progress_pct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(progressDetail.progress_pct, 100)}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              {progressDetail.modules.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2 rounded-full shrink-0 ${m.is_completed ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                    />
                    <span className={m.is_completed ? "text-foreground" : "text-muted-foreground"}>
                      {m.title}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {m.lessons.filter((l) => l.is_completed).length}/{m.lessons.length}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Briefing legacy (texto livre) ── */}
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

      {/* ── Dialogs ── */}

      {isStaff && (
        <BriefingDialog
          open={showBriefingDialog}
          onOpenChange={setShowBriefingDialog}
          studentId={studentId}
          isReadOnly
          initialData={initialBriefing}
        />
      )}

      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Estes dados são internos, o aluno não os vê.
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Instagram</label>
              <Input
                value={profileForm.instagram}
                onChange={(e) => setProfileForm({ ...profileForm, instagram: e.target.value })}
                placeholder="@handle"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Telefone / WhatsApp</label>
              <Input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="+351 912 345 678"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mind Map URL</label>
              <Input
                value={profileForm.mindmap_url}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, mindmap_url: e.target.value })
                }
                placeholder="https://mindomo.com/..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Coach responsável</label>
              <Select
                value={profileForm.coach_id || "__none__"}
                onValueChange={(v) =>
                  setProfileForm({ ...profileForm, coach_id: v === "__none__" ? "" : v })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sem coach atribuído" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem coach atribuído</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Estado</label>
              <Select
                value={profileForm.status || "ativo"}
                onValueChange={(v) => setProfileForm({ ...profileForm, status: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="cancelou">Cancelou</SelectItem>
                  <SelectItem value="devolucao">Pediu devolução</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Data de início</label>
              <Input
                type="date"
                value={profileForm.start_date}
                onChange={(e) => setProfileForm({ ...profileForm, start_date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Motivação / Estado</label>
              <Textarea
                value={profileForm.motivation}
                onChange={(e) => setProfileForm({ ...profileForm, motivation: e.target.value })}
                placeholder="Nota sobre o estado atual do aluno..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Prioridade de acompanhamento</label>
              <Select
                value={profileForm.priority || "__none__"}
                onValueChange={(v) =>
                  setProfileForm({ ...profileForm, priority: v === "__none__" ? "" : v })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Não definida" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Não definida</SelectItem>
                  <SelectItem value="alta">🔴 Alta</SelectItem>
                  <SelectItem value="media">🟡 Média</SelectItem>
                  <SelectItem value="baixa">🟢 Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNoteId ? "Editar Nota" : "Nova Nota"}</DialogTitle>
          </DialogHeader>
          <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            O Diário de Bordo é interno, o aluno não vê estas notas.
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tipo de Contacto</label>
              <Input
                value={noteForm.contact_type}
                onChange={(e) =>
                  setNoteForm({ ...noteForm, contact_type: e.target.value as any })
                }
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
                onChange={(e) =>
                  setNoteForm({ ...noteForm, reminder_date: e.target.value || null })
                }
                className="mt-1"
              />
            </div>
            {noteForm.reminder_date && (
              <div>
                <label className="text-sm font-medium">Motivo do lembrete</label>
                <Input
                  value={noteForm.reminder_note || ""}
                  onChange={(e) =>
                    setNoteForm({ ...noteForm, reminder_note: e.target.value || null })
                  }
                  placeholder="ex: Rever números do CAC, Follow-up sobre lançamento"
                  className="mt-1"
                />
              </div>
            )}
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
              {loadingNote
                ? editingNoteId
                  ? "A guardar..."
                  : "A criar..."
                : editingNoteId
                  ? "Guardar"
                  : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingNoteId} onOpenChange={() => setDeletingNoteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apagar Nota</DialogTitle>
            <DialogDescription>
              Tem a certeza que quer apagar esta nota? Esta acção é irreversível.
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

// ── Utility components ────────────────────────────────────────────────────────

function InstagramLink({ handle }: { handle: string }) {
  const clean = handle.startsWith("@") ? handle.slice(1) : handle;
  const url = handle.startsWith("https://") ? handle : `https://instagram.com/${clean}`;
  return (
    <span className="inline-flex items-center gap-1">
      <span>{handle.startsWith("@") ? handle : `@${clean}`}</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-blue-600"
      >
        <ExternalLink className="size-3" />
      </a>
    </span>
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
