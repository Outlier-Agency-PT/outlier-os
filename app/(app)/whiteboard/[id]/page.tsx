import { getWhiteboard } from "@/lib/queries/whiteboards";
import { WhiteboardEditor } from "@/components/whiteboard/whiteboard-editor";
import { getUserRoles } from "@/lib/supabase/roles";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WhiteboardEditorPage(props: {
  params: Promise<{ id: string }>;
}) {
  const roles = await getUserRoles();
  const isStaff =
    roles.includes("admin") || roles.includes("funcionario");

  if (!isStaff) redirect("/dashboard");

  const { id } = await props.params;
  const whiteboard = await getWhiteboard(id);

  if (!whiteboard) notFound();

  return <WhiteboardEditor whiteboard={whiteboard} />;
}
