import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: suggestionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Verify access: must be author or admin
  const { data: suggestion } = await supabase
    .from("suggestions")
    .select("id, author_id")
    .eq("id", suggestionId)
    .maybeSingle();

  if (!suggestion) return NextResponse.json({ error: "Sugestão não encontrada" }, { status: 404 });

  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = member?.role === "admin";
  if (suggestion.author_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Sem ficheiro" }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "Ficheiro > 20 MB" }, { status: 400 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `suggestions/${suggestionId}/${Date.now()}_${safeName}`;

  const { error: upErr } = await supabase.storage.from("content-files").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from("content-files").getPublicUrl(path);

  const { data: attachment, error: dbErr } = await supabase
    .from("suggestion_attachments")
    .insert({
      suggestion_id: suggestionId,
      file_url: publicUrl,
      file_name: file.name,
      file_type: file.type,
    })
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ data: attachment }, { status: 201 });
}
