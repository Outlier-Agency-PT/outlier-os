"use client";

import { useState, useRef, useEffect } from "react";
import { AlertCircle, ChevronDown, ChevronRight, ExternalLink, Phone, Video, Zap, BookOpen, Lock, CheckCircle2, Circle, Play, User, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  completeLessonAction,
  uncompleteLessonAction,
  requestEmergencyCallAction,
  completeChallengeAction,
  uncompleteChallengeAction,
  saveChallengeNotesAction,
  completeTrackStepAction,
  uncompleteTrackStepAction,
  updateStudentProfileAction,
} from "@/lib/actions/incubadora";
import { getStudentBriefingAction } from "@/lib/actions/students";
import { getMyAudienceProfilesAction } from "@/lib/actions/audience";
import { getMyProductsAction } from "@/lib/actions/products";
import { BriefingDialog } from "@/components/students/briefing-dialog";
import { StudentTasks } from "./student-tasks";
import { StudentROI } from "./student-roi";
import { StudentSalesPage } from "./student-sales-page";
import { StudentLaunchSummary } from "./student-launch-summary";
import { StudentGamification } from "./student-gamification";
import { StudentSupport } from "./student-support";
import { StudentAudience } from "./student-audience";
import { StudentProducts } from "./student-products";
import { ToolsView } from "./tools-view";

import type { ModuleWithLessons, Challenge, SuccessTrack } from "@/lib/queries/incubadora";

const WELCOME_VIDEO_URL = ""; // Será preenchido pelo admin

interface StudentViewProps {
  modules: ModuleWithLessons[];
  emergencyCalls: { id: string; created_at: string }[];
  progressPct: number;
  studentId: string;
  challenges: Challenge[];
  successTracks: SuccessTrack[];
  section?: "metodo" | "ferramentas" | "assistentes";
  initialTicket?: number;
  initialBudget?: number;
}

function parseBriefingComplete(data: unknown) {
  const b = data as { negocio?: Record<string, unknown>; objecoes?: unknown };
  const n = b.negocio ?? {};
  const negocio = !!(
    n.nome_negocio && n.nicho && n.publico_alvo && n.proposta_valor && n.transformacao_entregue
  );
  // DB may store objecoes as an array directly or wrapped as { objecoes: [] }
  const raw = b.objecoes;
  const arr: { objecao?: string; resposta?: string }[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as Record<string, unknown>)?.objecoes)
      ? (raw as { objecoes: { objecao?: string; resposta?: string }[] }).objecoes
      : [];
  const objecoes =
    arr.length > 0 && arr.every((o) => o.objecao?.trim() && o.resposta?.trim());
  return { negocio, objecoes };
}

export function StudentView({
  modules,
  emergencyCalls,
  progressPct,
  studentId,
  challenges,
  successTracks,
  section = "metodo",
  initialTicket,
  initialBudget,
}: StudentViewProps) {
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [loadingLessonId, setLoadingLessonId] = useState<string | null>(null);
  const [loadingChallengeId, setLoadingChallengeId] = useState<string | null>(null);
  const [loadingEmergency, setLoadingEmergency] = useState(false);
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [expandedChallengeId, setExpandedChallengeId] = useState<string | null>(null);
  const [loadingTrackStep, setLoadingTrackStep] = useState<string | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showWelcomeVideoDialog, setShowWelcomeVideoDialog] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    full_name: "",
    briefing: "",
  });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [highlightedChallengeId, setHighlightedChallengeId] = useState<string | null>(null);
  const desafiosRef = useRef<HTMLDivElement>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showBriefingDialog, setShowBriefingDialog] = useState(false);
  const [briefingStepComplete, setBriefingStepComplete] = useState({ negocio: false, objecoes: false });
  const [primaryAudienceName, setPrimaryAudienceName] = useState<string | null>(null);
  const [primaryProductName, setPrimaryProductName] = useState<string | null>(null);
  const [challengeNotes, setChallengeNotes] = useState<Record<string, string>>(
    challenges.reduce(
      (acc, c) => {
        acc[c.id] = c.notes ?? "";
        return acc;
      },
      {} as Record<string, string>
    )
  );
  const savingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    return () => {
      Object.values(savingTimeoutRef.current).forEach((timeout) =>
        clearTimeout(timeout)
      );
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    getStudentBriefingAction().then((data) => {
      if (!data) return;
      setBriefingStepComplete(parseBriefingComplete(data));
    });
    getMyAudienceProfilesAction().then((profiles) => {
      const primary = profiles.find((p) => p.is_primary && !p.is_archived)
        ?? profiles.find((p) => !p.is_archived);
      setPrimaryAudienceName(primary?.name ?? null);
    });
    getMyProductsAction().then((products) => {
      const first = products.find((p) => !p.is_archived);
      setPrimaryProductName(first?.name ?? null);
    });
  }, []);

  const remainingCalls = Math.max(0, 2 - emergencyCalls.length);
  const canRequestCall = remainingCalls > 0;

  const totalModules = modules.length;
  const completedModules = modules.filter((m) => m.is_completed).length;

  async function handleCompleteLessonClick(lessonId: string, moduleId: string) {
    setLoadingLessonId(lessonId);
    try {
      const result = await completeLessonAction(lessonId, moduleId);
      if ("error" in result && result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Erro ao marcar lição");
      } else {
        toast.success("Lição marcada como concluída");
      }
    } finally {
      setLoadingLessonId(null);
    }
  }

  async function handleUncompleteLessonClick(lessonId: string, moduleId: string) {
    setLoadingLessonId(lessonId);
    try {
      const result = await uncompleteLessonAction(lessonId, moduleId);
      if ("error" in result && result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Erro ao desmarcar lição");
      } else {
        toast.success("Lição desmarcada");
      }
    } finally {
      setLoadingLessonId(null);
    }
  }

  async function handleRequestEmergencyCall() {
    if (!canRequestCall) {
      toast.error("Já utilizou todas as chamadas de emergência");
      return;
    }

    setLoadingEmergency(true);
    try {
      const result = await requestEmergencyCallAction();
      if ("error" in result && result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Erro ao solicitar chamada");
      } else {
        toast.success("Chamada de emergência solicitada");
        setShowEmergencyDialog(false);
      }
    } finally {
      setLoadingEmergency(false);
    }
  }

  async function handleCompleteChallengeClick(challengeId: string) {
    setLoadingChallengeId(challengeId);
    try {
      const result = await completeChallengeAction(challengeId);
      if ("error" in result && result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Erro ao marcar desafio");
      } else {
        toast.success("Desafio marcado como concluído");
      }
    } finally {
      setLoadingChallengeId(null);
    }
  }

  async function handleUncompleteChallengeClick(challengeId: string) {
    setLoadingChallengeId(challengeId);
    try {
      const result = await uncompleteChallengeAction(challengeId);
      if ("error" in result && result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Erro ao desmarcar desafio");
      } else {
        toast.success("Desafio desmarcado");
      }
    } finally {
      setLoadingChallengeId(null);
    }
  }

  function isModuleUnlocked(moduleOrderIndex: number): boolean {
    if (moduleOrderIndex === 1) return true;
    const previousModule = modules.find((m) => m.order_index === moduleOrderIndex - 1);
    return previousModule?.is_completed ?? false;
  }

  function handleChallengeNotesChange(challengeId: string, text: string) {
    setChallengeNotes((prev) => ({ ...prev, [challengeId]: text }));

    if (savingTimeoutRef.current[challengeId]) {
      clearTimeout(savingTimeoutRef.current[challengeId]);
    }

    savingTimeoutRef.current[challengeId] = setTimeout(async () => {
      await saveChallengeNotesAction(challengeId, text);
    }, 1000);
  }

  async function handleCompleteTrackStep(stepKey: string) {
    setLoadingTrackStep(stepKey);
    try {
      const result = await completeTrackStepAction(stepKey);
      if ("error" in result && result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Erro ao marcar passo");
      } else {
        toast.success("Passo marcado como concluído");
      }
    } finally {
      setLoadingTrackStep(null);
    }
  }

  async function handleUncompleteTrackStep(stepKey: string) {
    setLoadingTrackStep(stepKey);
    try {
      const result = await uncompleteTrackStepAction(stepKey);
      if ("error" in result && result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Erro ao desmarcar passo");
      } else {
        toast.success("Passo desmarcado");
      }
    } finally {
      setLoadingTrackStep(null);
    }
  }

  async function handleSaveProfile() {
    setLoadingProfile(true);
    try {
      const result = await updateStudentProfileAction({
        full_name: profileFormData.full_name || undefined,
        briefing: profileFormData.briefing || undefined,
      });

      if ("error" in result && result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Erro ao guardar perfil");
      } else {
        await completeTrackStepAction("pp_perfil");
        toast.success("Perfil guardado com sucesso");
        setShowProfileDialog(false);
      }
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleWelcomeVideo() {
    if (!WELCOME_VIDEO_URL) {
      toast.error("Vídeo de boas-vindas não disponível");
      return;
    }
    window.open(WELCOME_VIDEO_URL, "_blank");
    await completeTrackStepAction("pp_boas_vindas");
  }

  function handleScrollToDesafios() {
    desafiosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleScrollToModulos() {
    const modulosSection = document.querySelector("[data-section='modulos']");
    modulosSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToChallenge(challengeTitle: string) {
    const challenge = challenges.find((c) => c.title === challengeTitle);
    if (!challenge) return;

    // Scroll para desafios
    const desafiosSection = document.getElementById("desafios");
    desafiosSection?.scrollIntoView({ behavior: "smooth", block: "start" });

    // Highlight do desafio
    setHighlightedChallengeId(challenge.id);
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedChallengeId(null);
    }, 2000);
  }

  if (section === "ferramentas") {
    return <ToolsView initialTicket={initialTicket} initialBudget={initialBudget} />;
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header de Progresso */}
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Minha Aprendizagem</h2>
            <p className="text-sm text-muted-foreground">
              {completedModules} de {totalModules} módulos concluídos
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Button
              variant={canRequestCall ? "default" : "secondary"}
              disabled={!canRequestCall}
              onClick={() => setShowEmergencyDialog(true)}
              size="sm"
            >
              <Phone className="mr-2 size-4" />
              {remainingCalls > 0 ? `Suporte (${remainingCalls})` : "Sem suporte"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progresso geral</span>
            <span className="text-muted-foreground">{progressPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(progressPct, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* O Meu Negócio — card de resumo */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="font-semibold">O Meu Negócio</h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="rounded-full text-xs font-normal">
              {[briefingStepComplete.negocio, briefingStepComplete.objecoes].filter(Boolean).length}/2 completos
            </Badge>
          </div>
        </div>

        {/* Passos */}
        <div className="space-y-1.5">
          {(
            [
              { label: "Negócio", complete: briefingStepComplete.negocio },
              { label: "Objecções", complete: briefingStepComplete.objecoes },
            ] as { label: string; complete: boolean }[]
          ).map(({ label, complete }) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              {complete ? (
                <CheckCircle2 className="size-4 text-green-600" />
              ) : (
                <Circle className="size-4 text-muted-foreground" />
              )}
              <span className={complete ? "text-foreground" : "text-muted-foreground"}>
                {label}
              </span>
              <span className="text-xs text-muted-foreground">
                {complete ? "Completo" : "Por preencher"}
              </span>
            </div>
          ))}
        </div>

        <div className="h-px bg-border" />

        {/* Cliente ideal */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <User className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Cliente ideal</p>
              {primaryAudienceName ? (
                <p className="truncate text-sm">{primaryAudienceName}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Ainda não definido</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              document
                .querySelector("[data-section='audiencia']")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="shrink-0 text-xs font-medium underline underline-offset-2 hover:text-foreground text-muted-foreground"
          >
            {primaryAudienceName ? "Ver perfis" : "Criar perfil"}
          </button>
        </div>

        {/* Produto principal */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Produto principal</p>
              {primaryProductName ? (
                <p className="truncate text-sm">{primaryProductName}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Ainda não definido</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              document
                .querySelector("[data-section='produtos']")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="shrink-0 text-xs font-medium underline underline-offset-2 hover:text-foreground text-muted-foreground"
          >
            {primaryProductName ? "Ver produtos" : "Criar produto"}
          </button>
        </div>

        {/* Acção principal */}
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => setShowBriefingDialog(true)}
        >
          Abrir Briefing
        </Button>
      </div>

      {/* Perfis de Audiência */}
      <StudentAudience />

      {/* Produtos e Escada de Valor */}
      <div data-section="produtos">
        <StudentProducts />
      </div>

      {/* Página de Vendas */}
      <StudentSalesPage />

      {/* Tarefas atribuídas pelo coach */}
      <StudentTasks userId={studentId} />

      {/* Progresso Financeiro e ROI */}
      <StudentROI />

      {/* Os Meus Lançamentos */}
      <StudentLaunchSummary />

      {/* Gamificação */}
      <StudentGamification />

      {/* Suporte — dúvidas assíncronas com a equipa */}
      <StudentSupport userId={studentId} />

      {/* Timeline de Módulos */}
      <div className="space-y-3" data-section="modulos">
        <h3 className="text-lg font-semibold">Módulos</h3>

        {modules.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            Nenhum módulo disponível
          </p>
        ) : (
          modules.map((module) => {
            const completedLessons = module.lessons.filter((l) => l.is_completed).length;
            const isExpanded = expandedModuleId === module.id;
            const isUnlocked = isModuleUnlocked(module.order_index);
            const isBlocked = !isUnlocked && !module.is_completed;

            return (
              <div
                key={module.id}
                className={`rounded-lg border bg-card ${isBlocked ? "opacity-60" : ""}`}
              >
                <button
                  onClick={() => {
                    if (isUnlocked || module.is_completed) {
                      setExpandedModuleId(isExpanded ? null : module.id);
                    }
                  }}
                  disabled={isBlocked}
                  className={`w-full p-4 text-left ${
                    isBlocked
                      ? "cursor-not-allowed"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0">
                      {isBlocked ? (
                        <Lock className="size-4 text-muted-foreground" />
                      ) : isExpanded ? (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className={`font-medium ${isBlocked ? "text-muted-foreground" : ""}`}>
                          {module.order_index}. {module.title}
                        </span>
                        {module.is_completed ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Concluído
                          </span>
                        ) : isBlocked ? (
                          <span className="text-xs text-muted-foreground">
                            Desbloqueie o módulo anterior
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {completedLessons}/{module.lessons.length} lições
                          </span>
                        )}
                      </div>
                      {module.skills && module.skills.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {module.skills.map((skill) => (
                            <span
                              key={skill}
                              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                isBlocked
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                      {module.description && (
                        <p className={`mt-1 text-xs ${isBlocked ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                          {module.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && !isBlocked && (
                  <div className="border-t bg-muted/30 p-4">
                    <div className="space-y-2">
                      {module.lessons.map((lesson) => {
                        const getLessonIcon = () => {
                          switch (lesson.type) {
                            case "video":
                              return <Video className="size-4 text-blue-600" />;
                            case "exercise":
                              return <Zap className="size-4 text-amber-600" />;
                            case "summary":
                              return <BookOpen className="size-4 text-green-600" />;
                            default:
                              return null;
                          }
                        };

                        const getLessonTypeLabel = () => {
                          switch (lesson.type) {
                            case "video":
                              return "Vídeo";
                            case "exercise":
                              return "Exercício";
                            case "summary":
                              return "Resumo";
                            default:
                              return "";
                          }
                        };

                        return (
                          <label
                            key={lesson.id}
                            className="flex items-center gap-3 rounded bg-background p-3 hover:bg-muted/50"
                          >
                            <input
                              type="checkbox"
                              checked={lesson.is_completed}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleCompleteLessonClick(lesson.id, module.id);
                                } else {
                                  handleUncompleteLessonClick(lesson.id, module.id);
                                }
                              }}
                              disabled={loadingLessonId === lesson.id || isBlocked}
                              className="size-4 rounded"
                            />
                            <div className="flex-1">
                              <p
                                className={`text-sm ${
                                  lesson.is_completed
                                    ? "text-muted-foreground line-through"
                                    : "text-foreground"
                                }`}
                              >
                                {lesson.title}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  {getLessonIcon()}
                                  <span className="text-xs text-muted-foreground">
                                    {getLessonTypeLabel()}
                                  </span>
                                </div>
                                {lesson.duration && (
                                  <span className="text-xs text-muted-foreground">
                                    • {lesson.duration}
                                  </span>
                                )}
                              </div>
                            </div>
                            {lesson.content_url && (
                              <a
                                href={lesson.content_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 text-blue-600 hover:text-blue-700"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="size-4" />
                              </a>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desafios */}
      {challenges.length > 0 && (
        <div id="desafios" className="space-y-3" ref={desafiosRef}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Desafios</h3>
            <span className="text-sm text-muted-foreground">
              {challenges.filter((c) => c.is_completed).length}/{challenges.length} concluídos
            </span>
          </div>

          <div className="space-y-2">
            {challenges.map((challenge) => {
              const notes = challengeNotes[challenge.id] ?? "";
              const isExpanded = expandedChallengeId === challenge.id;
              const canComplete = notes.trim().length > 0;

              return (
                <div
                  key={challenge.id}
                  className={`rounded-lg border transition-colors ${
                    highlightedChallengeId === challenge.id
                      ? "border-2 border-red-700 bg-red-50"
                      : `bg-card ${challenge.is_completed ? "bg-emerald-50" : ""}`
                  }`}
                  style={
                    highlightedChallengeId === challenge.id
                      ? {
                          borderColor: "#A12B2B",
                          backgroundColor: "rgba(161, 43, 43, 0.05)",
                        }
                      : undefined
                  }
                >
                  <button
                    onClick={() =>
                      setExpandedChallengeId(isExpanded ? null : challenge.id)
                    }
                    className="w-full p-4 text-left hover:bg-muted/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0 text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium ${
                            challenge.is_completed
                              ? "text-emerald-700 line-through"
                              : "text-foreground"
                          }`}
                        >
                          {challenge.title}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {challenge.description}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={challenge.is_completed}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            handleCompleteChallengeClick(challenge.id);
                          } else {
                            handleUncompleteChallengeClick(challenge.id);
                          }
                        }}
                        disabled={
                          loadingChallengeId === challenge.id ||
                          (!challenge.is_completed && !canComplete)
                        }
                        className="mt-1 size-4 rounded flex-shrink-0"
                        title={
                          !challenge.is_completed && !canComplete
                            ? "Escreva algo para marcar como concluído"
                            : ""
                        }
                      />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t bg-muted/20 p-4 space-y-3">
                      <textarea
                        value={notes}
                        onChange={(e) =>
                          handleChallengeNotesChange(challenge.id, e.target.value)
                        }
                        placeholder="Escreva a sua resposta aqui..."
                        className="w-full rounded-lg border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand"
                        rows={6}
                      />
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {notes.length > 0
                            ? "Guardado automaticamente"
                            : "Comece a escrever para guardar"}
                        </p>
                        {challenge.is_completed && notes.trim().length === 0 && (
                          <p className="text-xs text-amber-600 italic">
                            Resposta removida - desafio mantido como concluído
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trilhas de Sucesso */}
      {successTracks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Trilhas de Sucesso</h3>

          <div className="grid gap-4 md:grid-cols-2">
            {successTracks.map((track) => {
              const completedSteps = track.steps.filter((s) => s.is_completed).length;
              const totalSteps = track.steps.length;
              const progressPercent = Math.round((completedSteps / totalSteps) * 100);

              return (
                <div key={track.id} className="rounded-lg border bg-card p-4">
                  <div className="mb-3 space-y-1">
                    <h4 className="font-semibold">{track.title}</h4>
                    <p className="text-xs text-muted-foreground">{track.description}</p>
                  </div>

                  <div className="mb-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium">{completedSteps}/{totalSteps}</span>
                      <span className="text-xs text-muted-foreground">{progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {track.steps.map((step) => {
                      const isVideoAvailable = step.key === "pp_boas_vindas" && WELCOME_VIDEO_URL;
                      const isProfileStep = step.key === "pp_perfil";
                      const isModuloStep = step.key === "pp_modulo1";

                      let isClickable = false;
                      let onClick = () => {};

                      if (isProfileStep && !step.is_completed) {
                        isClickable = true;
                        onClick = () => setShowProfileDialog(true);
                      } else if (step.key === "pp_boas_vindas" && !step.is_completed) {
                        isClickable = true;
                        onClick = () => {
                          if (isVideoAvailable) {
                            handleWelcomeVideo();
                          } else {
                            setShowWelcomeVideoDialog(true);
                          }
                        };
                      } else if (isModuloStep && step.is_completed) {
                        isClickable = true;
                        onClick = handleScrollToModulos;
                      }

                      // Vídeo sem URL nunca pode aparecer como concluído
                      const videoWithoutUrl =
                        step.key === "pp_boas_vindas" && !WELCOME_VIDEO_URL;
                      const displayedAsCompleted = videoWithoutUrl ? false : step.is_completed;

                      const isComingSoon =
                        step.key === "pp_boas_vindas" && !WELCOME_VIDEO_URL && !step.is_completed;

                      return (
                        <button
                          key={step.key}
                          onClick={onClick}
                          disabled={
                            loadingTrackStep === step.key ||
                            (step.is_automatic && !isModuloStep) ||
                            isComingSoon
                          }
                          className={`flex w-full items-start gap-3 rounded px-2 py-2 text-left transition-colors ${
                            isComingSoon
                              ? "cursor-not-allowed opacity-60"
                              : (step.is_automatic && !isModuloStep) ||
                                (!isClickable && !displayedAsCompleted)
                                ? "cursor-not-allowed"
                                : isClickable
                                  ? "cursor-pointer hover:bg-muted/50"
                                  : "cursor-default"
                          }`}
                          title={
                            isModuloStep && step.is_completed
                              ? "Clica para ver os módulos"
                              : step.is_automatic && !isModuloStep
                                ? "Este passo é marcado automaticamente"
                                : isComingSoon
                                  ? "Vídeo ainda não disponível"
                                  : ""
                          }
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            {displayedAsCompleted ? (
                              <CheckCircle2 className="size-4 text-emerald-600" />
                            ) : isComingSoon ? (
                              <Circle className="size-4 text-muted-foreground" />
                            ) : step.key === "pp_boas_vindas" && !step.is_completed ? (
                              <Play className="size-4 text-blue-600" />
                            ) : (
                              <Circle className="size-4 text-muted-foreground" />
                            )}
                          </div>
                          <p
                            className={`text-sm ${
                              displayedAsCompleted
                                ? "text-muted-foreground line-through"
                                : isComingSoon
                                  ? "text-muted-foreground"
                                  : "text-foreground"
                            }`}
                          >
                            {step.title}
                            {isComingSoon && " (Em breve)"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Briefing Dialog */}
      <BriefingDialog
        open={showBriefingDialog}
        onOpenChange={(open) => {
          setShowBriefingDialog(open);
          if (!open) {
            getStudentBriefingAction().then((data) => {
              if (!data) return;
              setBriefingStepComplete(parseBriefingComplete(data));
            });
          }
        }}
        onGoToAudience={() => {
          setShowBriefingDialog(false);
          setTimeout(() => {
            document
              .querySelector("[data-section='audiencia']")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 150);
        }}
        onGoToProducts={() => {
          setShowBriefingDialog(false);
          setTimeout(() => {
            document
              .querySelector("[data-section='produtos']")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 150);
        }}
      />

      {/* Dialog de Emergência */}
      <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Suporte de Emergência</DialogTitle>
            <DialogDescription>
              Tem {remainingCalls} chamada{remainingCalls !== 1 ? "s" : ""} de emergência disponível
              {remainingCalls !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>

          {remainingCalls > 0 ? (
            <>
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                <div className="flex gap-2">
                  <AlertCircle className="size-4 flex-shrink-0" />
                  <p>
                    Use isto apenas se estiver realmente preso. Um mentor entrará em contacto
                    consigo em breve.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEmergencyDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleRequestEmergencyCall}
                  disabled={loadingEmergency}
                >
                  {loadingEmergency ? "A enviar..." : "Solicitar Suporte"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-900">
                <div className="flex gap-2">
                  <AlertCircle className="size-4 flex-shrink-0" />
                  <p>Já utilizou todas as chamadas de emergência (2/2).</p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowEmergencyDialog(false)}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Completar Perfil */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar Perfil</DialogTitle>
            <DialogDescription>
              Ajuda-nos a conhecer-te melhor para personalizar a tua experiência
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome Completo</label>
              <input
                type="text"
                value={profileFormData.full_name}
                onChange={(e) =>
                  setProfileFormData({ ...profileFormData, full_name: e.target.value })
                }
                placeholder="Ex: João Silva"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Objetivo</label>
              <textarea
                value={profileFormData.briefing}
                onChange={(e) =>
                  setProfileFormData({ ...profileFormData, briefing: e.target.value })
                }
                placeholder="Descreve o teu objetivo com este programa..."
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowProfileDialog(false)}
              disabled={loadingProfile}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveProfile} disabled={loadingProfile}>
              {loadingProfile ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Vídeo Boas-vindas Indisponível */}
      <Dialog open={showWelcomeVideoDialog} onOpenChange={setShowWelcomeVideoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vídeo de Boas-vindas</DialogTitle>
            <DialogDescription>
              Este vídeo ainda não está disponível
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex gap-2">
              <AlertCircle className="size-4 flex-shrink-0 mt-0.5" />
              <p>
                O vídeo de boas-vindas será disponibilizado em breve. Continua com as outras
                tarefas da Trilha de Sucesso!
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowWelcomeVideoDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
