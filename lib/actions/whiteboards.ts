"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getWhiteboards, getWhiteboard } from "@/lib/queries/whiteboards";

export async function getWhiteboardsAction() {
  return getWhiteboards();
}

export async function getWhiteboardAction(id: string) {
  return getWhiteboard(id);
}

export async function createWhiteboardAction(title: string, description?: string) {
  const supabase = await createClient();

  // Resolve team_members.id from the authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("whiteboards")
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      data: {},
      created_by: member?.id ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/whiteboard");
  return { id: (data as { id: string }).id };
}

export async function updateWhiteboardAction(
  id: string,
  data: Record<string, unknown>,
  title?: string,
) {
  const supabase = await createClient();

  const patch: Record<string, unknown> = { data };
  if (title !== undefined) patch.title = title.trim();

  const { error } = await supabase
    .from("whiteboards")
    .update(patch)
    .eq("id", id);

  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteWhiteboardAction(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("whiteboards")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/whiteboard");
  return { ok: true };
}
