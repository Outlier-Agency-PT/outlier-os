import { createClient } from "@/lib/supabase/server";
export type {
  SnapshotStudent,
  SnapshotAggregate,
  SnapshotSession,
  SnapshotChecklistItem,
  SnapshotRevenueEntry,
  SnapshotBriefingNegocio,
  SnapshotBriefing,
  SnapshotProduct,
  SnapshotDebrief,
  SnapshotLaunch,
  SnapshotNote,
  SnapshotNotePreview,
  SnapshotDiaryEntry,
  SnapshotMeeting,
  SnapshotMeetingPreview,
  ReportSnapshot,
  StudentReport,
} from "@/lib/types/student-reports";
export { isFullSnapshot } from "@/lib/types/student-reports";

export async function getStudentReports(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_reports")
    .select(`*, generator:team_members!student_reports_generated_by_fkey(full_name)`)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  // Cast via unknown to satisfy TypeScript — kpis comes as Json from Supabase
  return (data ?? []) as unknown as import("@/lib/types/student-reports").StudentReport[];
}
