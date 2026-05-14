"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const contentSchema = z.object({
  name: z.string().min(1),
  client_id: z.string().uuid().nullable().optional(),
  launch_id: z.string().uuid().nullable().optional(),
  status_id: z.string().uuid().nullable().optional(),
  format: z.string().nullable().optional(),
  platforms: z.array(z.string()).optional(),
  objective: z.string().nullable().optional(),
  copy_post: z.string().nullable().optional(),
  copy_design: z.string().nullable().optional(),
  publish_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  responsible_id: z.string().uuid().nullable().optional(),
});

export type ContentInput = z.infer<typeof contentSchema>;

function clean<T extends Record<string, unknown>>(input: T) {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === "" || v === undefined) continue;
    r[k] = v;
  }
  return r;
}

export async function createContentAction(input: ContentInput) {
  const parsed = contentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Não autenticado"] } };

  const { data, error } = await supabase
    .from("contents")
    .insert({ ...clean(parsed.data), created_by: user.id })
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };

  revalidatePath("/conteudo");
  return { data };
}

export async function updateContentAction(id: string, input: Partial<ContentInput>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contents")
    .update(clean(input))
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };
  revalidatePath("/conteudo");
  return { data };
}

export async function moveContentStatusAction(id: string, newStatusId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("contents").update({ status_id: newStatusId }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/conteudo");
  return { success: true };
}

export async function deleteContentAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("contents").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/conteudo");
  return { success: true };
}

// Ficheiros: server action que recebe um File via FormData e faz upload ao bucket
export async function uploadContentFileAction(contentId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Sem ficheiro" };
  if (file.size > 50 * 1024 * 1024) return { error: "Ficheiro > 50 MB" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${contentId}/${Date.now()}_${safeName}`;

  const { error: upErr } = await supabase.storage.from("content-files").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) return { error: upErr.message };

  const { error: dbErr } = await supabase.from("content_files").insert({
    content_id: contentId,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by: user.id,
  });
  if (dbErr) return { error: dbErr.message };

  revalidatePath(`/conteudo`);
  return { success: true, path };
}

export async function deleteContentFileAction(fileId: string) {
  const supabase = await createClient();
  const { data: file } = await supabase
    .from("content_files")
    .select("storage_path")
    .eq("id", fileId)
    .maybeSingle();
  if (file) {
    await supabase.storage
      .from("content-files")
      .remove([(file as { storage_path: string }).storage_path]);
  }
  await supabase.from("content_files").delete().eq("id", fileId);
  revalidatePath("/conteudo");
  return { success: true };
}

// Feedback do cliente (via dashboard partilhado)
const feedbackSchema = z.object({
  content_id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  body: z.string().min(1),
  parent_id: z.string().uuid().nullable().optional(),
});

export async function postFeedbackAction(input: z.infer<typeof feedbackSchema>, fromClient: boolean = false) {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("content_feedback")
    .insert({
      ...parsed.data,
      author_member_id: fromClient ? null : user?.id,
      is_from_client: fromClient,
      read_by_team: !fromClient,
    })
    .select()
    .single();
  if (error) return { error: { _form: [error.message] } };

  revalidatePath("/conteudo");
  return { data };
}

export async function resolveFeedbackAction(id: string, resolved: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("content_feedback")
    .update({
      resolved,
      resolved_at: resolved ? new Date().toISOString() : null,
      resolved_by: resolved ? user?.id : null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/conteudo");
  return { success: true };
}
