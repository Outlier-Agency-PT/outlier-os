import { NextResponse } from "next/server";
import { getCheckpointStatus } from "@/lib/queries/checkpoints";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (member?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const week = searchParams.get("week");
  if (!week || !/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    return NextResponse.json({ error: "Parâmetro week inválido" }, { status: 400 });
  }

  const statuses = await getCheckpointStatus(week);
  return NextResponse.json(statuses);
}
