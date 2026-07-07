import { createClient } from "@/lib/supabase/server";

export interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  lesson_count: number;
  skills: string[];
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content_url: string | null;
  order_index: number;
  created_at: string;
  type: "video" | "exercise" | "summary";
  duration: string | null;
}

export interface StudentProgressSummary {
  student_id: string;
  modules_completed: number;
  lessons_completed: number;
  last_activity: string | null;
  days_since_activity: number | null;
  progress_pct: number;
}

export async function getModulesWithLessonCount(): Promise<Module[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("modules")
    .select("*, lessons(count)")
    .eq("is_active", true)
    .order("order_index");

  return (data ?? []).map((m: any) => ({
    ...m,
    lesson_count: m.lessons?.[0]?.count ?? 0,
  })) as Module[];
}

export async function getLessonsByModule(moduleId: string): Promise<Lesson[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("*")
    .eq("module_id", moduleId)
    .order("order_index");
  return (data ?? []) as Lesson[];
}

export async function getAllStudentsProgress(totalLessons: number): Promise<Map<string, StudentProgressSummary>> {
  const supabase = await createClient();

  const [{ data: progressRows }, { data: completionRows }] = await Promise.all([
    supabase.from("student_progress").select("student_id, completed_at").not("completed_at", "is", null),
    supabase.from("lesson_completions").select("student_id, completed_at"),
  ]);

  const map = new Map<string, StudentProgressSummary>();
  const now = Date.now();

  const modulesByStudent = new Map<string, number>();
  for (const row of progressRows ?? []) {
    modulesByStudent.set(row.student_id, (modulesByStudent.get(row.student_id) ?? 0) + 1);
  }

  const lessonsByStudent = new Map<string, { count: number; last: string | null }>();
  for (const row of completionRows ?? []) {
    const cur = lessonsByStudent.get(row.student_id) ?? { count: 0, last: null };
    const isNewer = !cur.last || (row.completed_at && row.completed_at > cur.last);
    lessonsByStudent.set(row.student_id, {
      count: cur.count + 1,
      last: isNewer ? row.completed_at : cur.last,
    });
  }

  const allStudents = new Set([
    ...modulesByStudent.keys(),
    ...lessonsByStudent.keys(),
  ]);

  for (const studentId of allStudents) {
    const modules_completed = modulesByStudent.get(studentId) ?? 0;
    const lessonsData = lessonsByStudent.get(studentId);
    const lessons_completed = lessonsData?.count ?? 0;
    const last_activity = lessonsData?.last ?? null;
    const days_since_activity = last_activity
      ? Math.floor((now - new Date(last_activity).getTime()) / 86_400_000)
      : null;
    const progress_pct = totalLessons > 0 ? Math.round((lessons_completed / totalLessons) * 100) : 0;

    map.set(studentId, {
      student_id: studentId,
      modules_completed,
      lessons_completed,
      last_activity,
      days_since_activity,
      progress_pct,
    });
  }

  return map;
}

export interface ModuleWithLessons extends Module {
  lessons: (Lesson & { is_completed: boolean })[];
  is_completed: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  is_completed: boolean;
  notes: string | null;
}

export interface DetailedStudentProgress {
  progress_pct: number;
  modules_completed: number;
  challenges_completed: number;
  track_steps_completed: number;
  last_activity_at: string | null;
  days_since_activity: number | null;
}

export interface StudentProgressDetail {
  modules: ModuleWithLessons[];
  emergency_calls: { id: string; created_at: string }[];
  progress_pct: number;
}

export async function getStudentProgressDetail(studentId: string): Promise<StudentProgressDetail> {
  const supabase = await createClient();

  const [{ data: modules }, { data: completions }, { data: emergencyCalls }] = await Promise.all([
    supabase.from("modules").select("*, lessons(*)").eq("is_active", true).order("order_index"),
    supabase.from("lesson_completions").select("lesson_id").eq("student_id", studentId),
    supabase.from("emergency_calls").select("id, created_at").eq("student_id", studentId),
  ]);

  const completedLessonIds = new Set((completions ?? []).map((c: any) => c.lesson_id));
  const { data: studentProgress } = await supabase
    .from("student_progress")
    .select("module_id, completed_at")
    .eq("student_id", studentId);

  const completedModuleIds = new Set(
    (studentProgress ?? []).filter((p: any) => p.completed_at).map((p: any) => p.module_id)
  );

  const total_lessons = (modules ?? []).reduce((sum: number, m: any) => sum + (m.lessons?.length ?? 0), 0);
  const completed_lessons = completedLessonIds.size;
  const progress_pct = total_lessons > 0 ? Math.round((completed_lessons / total_lessons) * 100) : 0;

  const modulesWithLessons: ModuleWithLessons[] = (modules ?? []).map((m: any) => ({
    ...m,
    lesson_count: m.lessons?.length ?? 0,
    lessons: (m.lessons ?? []).map((l: any) => ({
      ...l,
      is_completed: completedLessonIds.has(l.id),
    })),
    is_completed: completedModuleIds.has(m.id),
  }));

  return {
    modules: modulesWithLessons,
    emergency_calls: (emergencyCalls ?? []),
    progress_pct,
  };
}

export async function getChallenges(studentId: string): Promise<Challenge[]> {
  const supabase = await createClient();

  const { data: challenges } = await supabase
    .from("challenges")
    .select("id, title, description")
    .order("order_index");

  const { data: studentChallenges } = await supabase
    .from("student_challenges")
    .select("challenge_id, notes")
    .eq("student_id", studentId);

  const challengeMap = new Map(
    (studentChallenges ?? []).map((sc: any) => [
      sc.challenge_id,
      { is_completed: true, notes: sc.notes },
    ])
  );

  return (challenges ?? []).map((c: any) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    is_completed: challengeMap.has(c.id),
    notes: challengeMap.get(c.id)?.notes ?? null,
  })) as Challenge[];
}

export interface TrackStep {
  key: string;
  title: string;
  is_completed: boolean;
  is_automatic: boolean;
}

export interface SuccessTrack {
  id: string;
  title: string;
  description: string;
  steps: TrackStep[];
}

const TRACKS_DEFINITION = [
  {
    id: "primeiros_passos",
    title: "Primeiros Passos",
    description: "Completa estas tarefas para começar com o pé direito",
    steps: [
      { key: "pp_perfil", title: "Completar perfil", automatic: false },
      { key: "pp_boas_vindas", title: "Ver vídeo de boas-vindas", automatic: false },
      { key: "pp_modulo1", title: "Iniciar primeiro módulo", automatic: true },
      { key: "pp_briefing", title: "Criar briefing do negócio", automatic: false },
    ]
  },
  {
    id: "fundamentos",
    title: "Fundamentos",
    description: "Domina os conceitos básicos do método",
    steps: [
      { key: "fund_modulo1", title: "Completar Estratégia Pessoal", automatic: true },
      { key: "fund_modulo2", title: "Completar Estratégia de Negócio", automatic: true },
      { key: "fund_oferta", title: "Definir primeira oferta", automatic: false },
    ]
  }
];

export async function getSuccessTracks(
  studentId: string,
  progressDetail: StudentProgressDetail,
  challenges: Challenge[]
): Promise<SuccessTrack[]> {
  const supabase = await createClient();

  const { data: completedSteps } = await supabase
    .from("student_track_steps")
    .select("step_key")
    .eq("student_id", studentId);

  const completedStepsSet = new Set((completedSteps ?? []).map((s: any) => s.step_key));

  const anyLessonsCompleted = progressDetail.modules.some((m) =>
    m.lessons.some((l) => l.is_completed)
  );
  const module1Completed = progressDetail.modules.find((m) => m.order_index === 1)?.is_completed ?? false;
  const module2Completed = progressDetail.modules.find((m) => m.order_index === 2)?.is_completed ?? false;

  const briefingChallenge = challenges.find((c) => c.title === "Criar Briefing do Negócio");
  const ofertaChallenge = challenges.find((c) => c.title === "Estruturar Oferta Principal");

  return TRACKS_DEFINITION.map((track) => ({
    id: track.id,
    title: track.title,
    description: track.description,
    steps: track.steps.map((step) => {
      let isCompleted = completedStepsSet.has(step.key);

      // Auto-complete logic
      if (step.key === "pp_modulo1" && anyLessonsCompleted) {
        isCompleted = true;
      }
      if (step.key === "pp_briefing" && briefingChallenge?.is_completed) {
        isCompleted = true;
      }
      if (step.key === "fund_modulo1" && module1Completed) {
        isCompleted = true;
      }
      if (step.key === "fund_modulo2" && module2Completed) {
        isCompleted = true;
      }
      if (step.key === "fund_oferta" && ofertaChallenge?.is_completed) {
        isCompleted = true;
      }

      return {
        key: step.key,
        title: step.title,
        is_completed: isCompleted,
        is_automatic: step.automatic,
      };
    }),
  })) as SuccessTrack[];
}

export interface StudentProfile {
  product_ticket: number | null;
  investment_budget: number | null;
}

export async function getStudentProfile(studentId: string): Promise<StudentProfile> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("product_ticket, investment_budget")
    .eq("user_id", studentId)
    .single();

  let productTicket: number | null = null;
  if (data?.product_ticket) {
    const parsed = parseFloat(data.product_ticket.replace(/[^\d.,]/g, "").replace(",", "."));
    productTicket = isNaN(parsed) ? null : parsed;
  }

  return {
    product_ticket: productTicket,
    investment_budget: data?.investment_budget ?? null,
  };
}

export async function getStudentsDetailedProgress(): Promise<Map<string, DetailedStudentProgress>> {
  const supabase = await createClient();
  const now = Date.now();

  const [{ data: modules }, { data: completions }, { data: challenges }, { data: trackSteps }, { data: studentProgress }] = await Promise.all([
    supabase.from("modules").select("id, order_index").eq("is_active", true),
    supabase.from("lesson_completions").select("student_id, completed_at"),
    supabase.from("student_challenges").select("student_id"),
    supabase.from("student_track_steps").select("student_id"),
    supabase.from("student_progress").select("student_id, completed_at").not("completed_at", "is", null),
  ]);

  const map = new Map<string, DetailedStudentProgress>();

  // Agrupar por student_id
  const byStudentId = new Map<string, { completions: any[]; challenges: any[]; trackSteps: any[]; modules: number; lastActivity: string | null }>();

  // Lesson completions
  for (const c of completions ?? []) {
    if (!byStudentId.has(c.student_id)) {
      byStudentId.set(c.student_id, { completions: [], challenges: [], trackSteps: [], modules: 0, lastActivity: null });
    }
    byStudentId.get(c.student_id)!.completions.push(c);
    const lastAct = byStudentId.get(c.student_id)!.lastActivity;
    if (!lastAct || c.completed_at > lastAct) {
      byStudentId.get(c.student_id)!.lastActivity = c.completed_at;
    }
  }

  // Challenges
  for (const c of challenges ?? []) {
    if (!byStudentId.has(c.student_id)) {
      byStudentId.set(c.student_id, { completions: [], challenges: [], trackSteps: [], modules: 0, lastActivity: null });
    }
    byStudentId.get(c.student_id)!.challenges.push(c);
  }

  // Track steps
  for (const t of trackSteps ?? []) {
    if (!byStudentId.has(t.student_id)) {
      byStudentId.set(t.student_id, { completions: [], challenges: [], trackSteps: [], modules: 0, lastActivity: null });
    }
    byStudentId.get(t.student_id)!.trackSteps.push(t);
  }

  // Modules completed
  for (const m of studentProgress ?? []) {
    if (!byStudentId.has(m.student_id)) {
      byStudentId.set(m.student_id, { completions: [], challenges: [], trackSteps: [], modules: 0, lastActivity: null });
    }
    byStudentId.get(m.student_id)!.modules += 1;
  }

  // Converter para DetailedStudentProgress
  for (const [studentId, data] of byStudentId) {
    const daysAgo = data.lastActivity
      ? Math.floor((now - new Date(data.lastActivity).getTime()) / 86_400_000)
      : null;

    map.set(studentId, {
      progress_pct: 0, // Será preenchido se necessário
      modules_completed: data.modules,
      challenges_completed: data.challenges.length,
      track_steps_completed: data.trackSteps.length,
      last_activity_at: data.lastActivity,
      days_since_activity: daysAgo,
    });
  }

  return map;
}
