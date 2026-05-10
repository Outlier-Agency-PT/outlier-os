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
  created_at: string;
  coach: { id: string; full_name: string } | null;
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
}> {
  const supabase = await createClient();
  const [{ data: student }, { data: sessions }] = await Promise.all([
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
  ]);
  return {
    student: (student ?? null) as Student | null,
    sessions: (sessions ?? []) as StudentSession[],
  };
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
