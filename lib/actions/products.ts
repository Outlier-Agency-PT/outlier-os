"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StudentProduct, ProductStatus } from "@/lib/types/student-launches";
import type { ReviewStatus } from "@/lib/types/review-status";

function revalidate(studentId: string) {
  revalidatePath(`/incubadora/${studentId}`);
  revalidatePath("/incubadora");
}

// ── Student "own" actions (uses auth to resolve student) ──────────────────────

export async function getMyProductsAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!student) return [];
  const { data } = await supabase
    .from("student_products")
    .select("*")
    .eq("student_id", student.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as StudentProduct[];
}

export async function getMyAudienceProfilesForProductsAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!student) return [];
  const { data } = await supabase
    .from("student_audience_profiles")
    .select("id, name, is_primary, is_archived")
    .eq("student_id", student.id)
    .eq("is_archived", false)
    .order("is_primary", { ascending: false });
  return (data ?? []) as { id: string; name: string; is_primary: boolean; is_archived: boolean }[];
}

export async function createMyProductAction(
  input: Omit<StudentProduct, "id" | "student_id" | "review_status" | "review_notes" | "created_at" | "updated_at">,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!student) return { error: "Aluno não encontrado" };

  const { data, error } = await supabase
    .from("student_products")
    .insert({ ...input, student_id: student.id, review_status: "nao_iniciado" })
    .select()
    .single();
  if (error) return { error: error.message };
  revalidate(student.id);
  return { data: data as StudentProduct };
}

export async function updateMyProductAction(
  productId: string,
  input: Partial<Omit<StudentProduct, "id" | "student_id" | "created_at" | "updated_at">>,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!student) return { error: "Aluno não encontrado" };

  const { data, error } = await supabase
    .from("student_products")
    .update(input)
    .eq("id", productId)
    .eq("student_id", student.id)
    .select()
    .single();
  if (error) return { error: error.message };
  revalidate(student.id);
  return { data: data as StudentProduct };
}

// ── Coach/shared actions ──────────────────────────────────────────────────────

export async function archiveStudentProductAction(productId: string, studentId: string) {
  const supabase = await createClient();

  // Check if used in any launch
  const { data: launches } = await supabase
    .from("student_launches")
    .select("id, title")
    .or(`main_product_id.eq.${productId},downsell_product_id.eq.${productId},upsell_product_id.eq.${productId}`)
    .eq("student_id", studentId);

  const { error } = await supabase
    .from("student_products")
    .update({ is_archived: true, review_status: "arquivado" })
    .eq("id", productId);
  if (error) return { error: error.message };
  revalidate(studentId);
  return {
    success: true,
    warning: launches && launches.length > 0
      ? `Este produto está associado a ${launches.length} lançamento(s): ${(launches as { title: string }[]).map((l) => l.title).join(", ")}. As relações foram mantidas para histórico.`
      : null,
  };
}

export async function unarchiveStudentProductAction(productId: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_products")
    .update({ is_archived: false, review_status: "nao_iniciado" })
    .eq("id", productId);
  if (error) return { error: error.message };
  revalidate(studentId);
  return { success: true };
}

export async function duplicateStudentProductAction(productId: string, studentId: string) {
  const supabase = await createClient();
  const { data: original, error: fetchErr } = await supabase
    .from("student_products")
    .select("*")
    .eq("id", productId)
    .single();
  if (fetchErr || !original) return { error: "Produto não encontrado" };

  const { id, created_at, updated_at, ...rest } = original as StudentProduct & { id: string; created_at: string; updated_at: string };

  const { data, error } = await supabase
    .from("student_products")
    .insert({
      ...rest,
      name: `Cópia de ${rest.name}`,
      is_archived: false,
      review_status: "nao_iniciado",
      review_notes: null,
      previous_product_id: null,
      next_product_id: null,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  revalidate(studentId);
  return { data: data as StudentProduct };
}

export async function submitProductForReviewAction(productId: string, studentId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { error } = await supabase
    .from("student_products")
    .update({ review_status: "pronto_revisao" })
    .eq("id", productId);
  if (error) return { error: error.message };

  // Notify team
  const { data: product } = await supabase
    .from("student_products")
    .select("name")
    .eq("id", productId)
    .single();

  const { data: teamMembers } = await admin
    .from("team_members")
    .select("user_id")
    .not("user_id", "is", null);

  if (teamMembers && teamMembers.length > 0 && product) {
    await admin.from("notifications").insert(
      (teamMembers as { user_id: string }[]).map((m) => ({
        user_id: m.user_id,
        type: "product_review_requested",
        title: "Produto pronto para revisão",
        body: `"${(product as { name: string }).name}" foi submetido para revisão.`,
        link: `/incubadora/${studentId}`,
      })),
    );
  }

  revalidate(studentId);
  return { success: true };
}

export async function updateProductReviewStatusAction(
  productId: string,
  studentId: string,
  status: ReviewStatus,
  notes: string | null,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_products")
    .update({ review_status: status, review_notes: notes ?? null })
    .eq("id", productId);
  if (error) return { error: error.message };
  revalidate(studentId);
  return { success: true };
}

export async function setProductRelationsAction(
  productId: string,
  studentId: string,
  relations: {
    previous_product_id: string | null;
    next_product_id: string | null;
    upsells: string[];
    downsells: string[];
  },
) {
  // Circular detection: product cannot reference itself
  const allIds = [
    relations.previous_product_id,
    relations.next_product_id,
    ...relations.upsells,
    ...relations.downsells,
  ].filter(Boolean);

  if (allIds.includes(productId)) {
    return { error: "Um produto não pode referenciar-se a si próprio." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("student_products")
    .update({
      previous_product_id: relations.previous_product_id,
      next_product_id: relations.next_product_id,
      upsells: relations.upsells,
      downsells: relations.downsells,
    })
    .eq("id", productId);
  if (error) return { error: error.message };
  revalidate(studentId);
  return { success: true };
}

export async function updateProductSortOrderAction(
  updates: { id: string; sort_order: number }[],
  studentId: string,
) {
  const supabase = await createClient();
  await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from("student_products").update({ sort_order }).eq("id", id),
    ),
  );
  revalidate(studentId);
  return { success: true };
}

// Coach shorthand for getStudentProductsAction-equivalent with archived filter
export async function getStudentProductsWithAudienceAction(studentId: string) {
  const supabase = await createClient();
  const [productsRes, audienceRes] = await Promise.all([
    supabase
      .from("student_products")
      .select("*")
      .eq("student_id", studentId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("student_audience_profiles")
      .select("id, name, is_primary, is_archived")
      .eq("student_id", studentId)
      .eq("is_archived", false)
      .order("is_primary", { ascending: false }),
  ]);
  return {
    products: (productsRes.data ?? []) as StudentProduct[],
    audienceProfiles: (audienceRes.data ?? []) as { id: string; name: string; is_primary: boolean; is_archived: boolean }[],
  };
}
