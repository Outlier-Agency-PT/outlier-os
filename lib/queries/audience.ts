import { createClient } from "@/lib/supabase/server";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PersonaMarca {
  nome: string;
  url?: string;
  motivo?: string;
}

export interface ConteudoConsumido {
  formato: string;
  tema: string;
}

export interface AudienceProfile {
  id: string;
  student_id: string;
  name: string;
  is_primary: boolean;
  is_archived: boolean;
  faixa_etaria: string | null;
  genero: string | null;
  estatuto_social: string | null;
  rendimento: string | null;
  nucleo_familiar: string | null;
  area_profissional: string | null;
  habilitacoes: string | null;
  // Situação actual
  problemas: string[];
  dores: string[];
  medos: string[];
  frustracoes: string[];
  desafios: string[];
  tentativas_anteriores: string[];
  porque_nao_resolveu: string | null;
  // Situação desejada
  transformacoes: string[];
  beneficios: string[];
  sonhos_objetivos: string[];
  como_quer_sentir: string | null;
  definicao_sucesso: string | null;
  // Comportamento
  redes_sociais: string[];
  pessoas_marcas_seguidas: PersonaMarca[];
  conteudos_consumidos: ConteudoConsumido[];
  linguagem: string[];
  fatores_decisao: string[];
  barreiras: string[];
  // Revisão
  review_status: string;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getStudentAudienceProfiles(
  studentId: string,
): Promise<AudienceProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_audience_profiles")
    .select("*")
    .eq("student_id", studentId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  return (data ?? []) as AudienceProfile[];
}

export async function getStudentAudienceProfile(
  id: string,
): Promise<AudienceProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_audience_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data ?? null) as AudienceProfile | null;
}
