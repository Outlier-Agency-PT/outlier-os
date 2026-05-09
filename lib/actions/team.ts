"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { ALL_MODULE_KEYS } from "@/lib/types";

const memberUpdateSchema = z.object({
  full_name: z.string().min(1).optional(),
  role: z.enum(["admin", "membro"]).optional(),
  department: z.string().nullable().optional(),
  job_title: z.string().nullable().optional(),
  permissions_modules: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>;

export async function updateMemberAction(id: string, input: MemberUpdateInput) {
  const parsed = memberUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // Sanitize permissions_modules — só keys válidas
  if (parsed.data.permissions_modules) {
    parsed.data.permissions_modules = parsed.data.permissions_modules.filter((m) =>
      ALL_MODULE_KEYS.includes(m),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_members")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: { _form: [error.message] } };

  revalidatePath("/equipa");
  return { data };
}

export async function deactivateMemberAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("team_members")
    .update({ active: false })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/equipa");
  return { success: true };
}
