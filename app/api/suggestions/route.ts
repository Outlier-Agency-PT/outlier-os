import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = member?.role === "admin";

  let query = supabase
    .from("suggestions")
    .select(`
      id, title, description, status, rejected_reason, task_id, created_at,
      author:team_members!author_id(id, full_name),
      suggestion_attachments(id, file_url, file_name, file_type)
    `)
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("author_id", user.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { title, description } = body;
  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Título e descrição são obrigatórios" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: suggestion, error } = await admin
    .from("suggestions")
    .insert({ title: title.trim(), description: description.trim(), author_id: user.id })
    .select("id, title")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify all admins
  const { data: admins } = await admin
    .from("team_members")
    .select("id")
    .eq("role", "admin")
    .eq("active", true);

  if (admins && admins.length > 0) {
    await admin.from("notifications").insert(
      admins.map((a: { id: string }) => ({
        user_id: a.id,
        type: "suggestion_new",
        title: "Nova sugestão submetida",
        body: suggestion.title,
        link: "/dashboard",
      })),
    );
  }

  return NextResponse.json({ data: suggestion }, { status: 201 });
}
