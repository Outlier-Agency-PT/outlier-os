import { createClient } from "@/lib/supabase/server";

export interface Student {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  nicho: string | null;
  subnicho: string | null;
  coach_id: string | null;
  level: "aprendiz" | "fazedor" | "autoridade" | "referencia" | "aguardar";
  turma: string | null;
  entry_type: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  briefing: string | null;
  launch_product: string | null;
  launch_objective: string | null;
  launch_date: string | null;
  product_ticket: string | null;
  leads_goal: number | null;
  revenue_goal: number | null;
  investment_budget: number | null;
  revenue_generated: number | null;
  debriefing: string | null;
  created_at: string;
  coach: { id: string; full_name: string } | null;
}

export interface StudentChecklist {
  id: string;
  student_id: string;
  has_leads_goal: boolean;
  has_organic_content: boolean;
  has_bio_link: boolean;
  notes: string | null;
}

export interface StudentNote {
  id: string;
  student_id: string;
  author_id: string;
  contact_type: "Call" | "WhatsApp" | "Email" | "Sessão quinzenal" | "Outro";
  involvement: string;
  motivation: string;
  content: string;
  reminder_date: string | null;
  created_at: string;
  author: { full_name: string };
}

export interface PendingReminder {
  id: string;
  student_id: string;
  student_name: string;
  contact_type: string;
  content: string;
  reminder_date: string;
  urgency: "vencido" | "hoje" | "esta-semana";
}

export interface SessionType {
  id: string;
  key: string;
  label: string;
  sort_order: number;
}

export interface StudentSession {
  id: string;
  student_id: string;
  type_id: string;
  scheduled_date: string | null;
  completed_at: string | null;
  notes: string | null;
  type: { key: string; label: string };
}

export async function getStudents(): Promise<Student[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select(`*, coach:team_members!students_coach_id_fkey(id, full_name)`)
    .order("created_at", { ascending: false });
  return (data ?? []) as Student[];
}

export async function getStudentById(id: string): Promise<{
  student: Student | null;
  sessions: StudentSession[];
  checklist: StudentChecklist | null;
  notes: StudentNote[];
}> {
  const supabase = await createClient();
  const [{ data: student }, { data: sessions }, { data: checklist }, { data: notes }] = await Promise.all([
    supabase
      .from("students")
      .select(`*, coach:team_members!students_coach_id_fkey(id, full_name)`)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("student_sessions")
      .select(`*, type:student_session_types(key, label)`)
      .eq("student_id", id)
      .order("type"),
    supabase
      .from("student_checklist")
      .select("*")
      .eq("student_id", id)
      .maybeSingle(),
    supabase
      .from("student_notes")
      .select(`*, author:team_members!student_notes_author_id_fkey(full_name)`)
      .eq("student_id", id)
      .order("created_at", { ascending: false }),
  ]);
  return {
    student: (student ?? null) as Student | null,
    sessions: (sessions ?? []) as StudentSession[],
    checklist: (checklist ?? null) as StudentChecklist | null,
    notes: (notes ?? []) as StudentNote[],
  };
}

export async function getStudentChecklist(studentId: string): Promise<StudentChecklist | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_checklist")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();
  return (data ?? null) as StudentChecklist | null;
}

export async function getStudentNotes(studentId: string): Promise<StudentNote[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_notes")
    .select(`*, author:team_members!student_notes_author_id_fkey(full_name)`)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  return (data ?? []) as StudentNote[];
}

export async function getSessionTypes(): Promise<SessionType[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_session_types")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  return (data ?? []) as SessionType[];
}

export async function getPendingReminders(): Promise<PendingReminder[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_notes")
    .select(`id, student_id, contact_type, content, reminder_date, students(name)`)
    .not("reminder_date", "is", null)
    .order("reminder_date");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (data ?? [])
    .map((note: any) => {
      const reminderDate = new Date(note.reminder_date);
      reminderDate.setHours(0, 0, 0, 0);

      let urgency: "vencido" | "hoje" | "esta-semana";
      if (reminderDate < today) {
        urgency = "vencido";
      } else if (reminderDate.getTime() === today.getTime()) {
        urgency = "hoje";
      } else {
        const daysUntil = Math.ceil((reminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        urgency = daysUntil <= 7 ? "esta-semana" : null as any;
      }

      return {
        id: note.id,
        student_id: note.student_id,
        student_name: note.students.name,
        contact_type: note.contact_type,
        content: note.content,
        reminder_date: note.reminder_date,
        urgency,
      };
    })
    .filter((r): r is PendingReminder => r.urgency !== null);
}
