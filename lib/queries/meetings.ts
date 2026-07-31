import { createClient } from "@/lib/supabase/server";

export interface Meeting {
  id: string;
  title: string;
  client_id: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  location: string | null;
  agenda_md: string | null;
  notes_md: string | null;
  attendee_ids: string[] | null;
  created_at: string;
  client: { id: string; name: string } | null;
  meeting_students?: { student_id: string }[];
}

export async function getMeetings(filters?: { from?: string; to?: string }): Promise<Meeting[]> {
  const supabase = await createClient();
  let q = supabase
    .from("meetings")
    .select(`*, client:clients(id, name)`)
    .order("scheduled_at", { ascending: true });
  if (filters?.from) q = q.gte("scheduled_at", filters.from);
  if (filters?.to) q = q.lte("scheduled_at", filters.to);
  const { data } = await q;
  return (data ?? []) as Meeting[];
}

export async function getMeetingById(id: string): Promise<Meeting | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meetings")
    .select(`*, client:clients(id, name)`)
    .eq("id", id)
    .maybeSingle();
  return (data ?? null) as Meeting | null;
}

export async function getMeetingsByStudent(studentId: string): Promise<Meeting[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meetings")
    .select(`*, client:clients(id, name), meeting_students!inner(student_id)`)
    .eq("meeting_students.student_id", studentId)
    .order("scheduled_at", { ascending: false });
  return (data ?? []) as Meeting[];
}
