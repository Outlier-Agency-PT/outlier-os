"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Sync team_member_departments
  const dept = parsed.data.department;
  if (dept) {
    const { error: deptErr } = await supabase
      .from("team_member_departments")
      .upsert(
        { team_member_id: id, department_code: dept, is_primary: true },
        { onConflict: "team_member_id,department_code" },
      );
    if (deptErr) return { error: { _form: [deptErr.message] } };
    // Remove outras linhas is_primary para este membro (mudou de departamento)
    await supabase
      .from("team_member_departments")
      .delete()
      .eq("team_member_id", id)
      .eq("is_primary", true)
      .neq("department_code", dept);
  } else {
    // "Sem departamento" → remove linha primária
    await supabase
      .from("team_member_departments")
      .delete()
      .eq("team_member_id", id)
      .eq("is_primary", true);
  }

  revalidatePath("/equipa");
  return { data };
}

const inviteSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  role: z.enum(["admin", "membro"]).default("membro"),
  department: z.string().nullable().optional(),
  job_title: z.string().nullable().optional(),
  permissions_modules: z.array(z.string()).default([]),
  password: z.string().min(8).optional(),
});

export type InviteInput = z.infer<typeof inviteSchema>;

export async function inviteMemberAction(input: InviteInput) {
  // Apenas admins podem convidar
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { _form: ["Não autenticado"] } };

  const { data: me } = await supabase
    .from("team_members")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || (me as { role: string }).role !== "admin") {
    return { error: { _form: ["Apenas administradores podem convidar membros"] } };
  }

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  // Gera password se não fornecida (admin deve enviá-la ao membro)
  const password =
    parsed.data.password ??
    Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(36).padStart(2, "0"))
      .join("")
      .slice(0, 20);

  // Cria user via Admin API (service_role)
  const admin = createAdminClient();
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });

  if (createErr || !newUser.user) {
    return { error: { _form: [createErr?.message ?? "Erro a criar utilizador"] } };
  }

  // Atualiza team_member com role, department, permissões (trigger já criou linha)
  const permissions =
    parsed.data.role === "admin" ? [] : parsed.data.permissions_modules;

  await admin
    .from("team_members")
    .update({
      role: parsed.data.role,
      department: parsed.data.department ?? null,
      job_title: parsed.data.job_title ?? null,
      permissions_modules: permissions,
    })
    .eq("id", newUser.user.id);

  revalidatePath("/equipa");
  return {
    data: {
      id: newUser.user.id,
      email: parsed.data.email,
      password, // admin precisa de partilhar com o membro
    },
  };
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
