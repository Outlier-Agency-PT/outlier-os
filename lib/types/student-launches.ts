// Tipos e funções puras partilhados entre Server Components, Server Actions
// e Client Components. Sem importações de next/headers ou código server-only.

export type ProductStatus = "rascunho" | "activo" | "inactivo";

export interface ProductBonus {
  nome: string;
  descricao?: string;
  formato?: string;
  valor_percebido?: string;
  disponibilidade?: string;
}

export interface ContentModule {
  titulo: string;
  descricao?: string;
  componentes: string[];
}

export interface ProductCondicoes {
  parcelamento?: boolean;
  num_prestacoes?: number;
  vagas_limitadas?: boolean;
  num_vagas?: number;
  duracao?: string;
}

export interface ProductLinks {
  pagina?: string;
  checkout?: string;
  recursos?: string[];
}

export interface StudentProduct {
  id: string;
  student_id: string;
  name: string;
  description: string | null;
  promise: string | null;
  price: number | null;
  product_type: string | null;
  value_ladder_position: number | null;
  beneficios: string[];
  garantia: string | null;
  bonus: ProductBonus[];
  product_status: ProductStatus;
  review_status: import("@/lib/types/review-status").ReviewStatus;
  review_notes: string | null;
  previous_product_id: string | null;
  next_product_id: string | null;
  content_modules: ContentModule[];
  condicoes: ProductCondicoes;
  upsells: string[];
  downsells: string[];
  audiencias: string[];
  links: ProductLinks;
  estrategia_venda: string | null;
  modo_entrega: string | null;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type LaunchStatus = "planeado" | "em_curso" | "concluido" | "cancelado";

export type LaunchPhase =
  | "rascunho"
  | "planeamento"
  | "distribuicao"
  | "captacao"
  | "aquecimento"
  | "evento"
  | "venda"
  | "downsell"
  | "concluido";

export type NameIdeaStatus = "sugestao" | "em_apreciacao" | "aprovado" | "rejeitado";
export type NameIdeaType = "nome" | "promessa";

export interface LaunchNameIdea {
  id: string;
  launch_id: string;
  type: NameIdeaType;
  content: string;
  status: NameIdeaStatus;
  notes: string | null;
  created_at: string;
}

export interface StudentLaunchAudience {
  launch_id: string;
  audience_profile_id: string;
  is_primary: boolean;
}

export function calcLaunchPhase(launch: StudentLaunch): LaunchPhase {
  if (launch.status === "cancelado" || launch.status === "concluido") return "concluido";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pd = (s: string | null): Date | null => {
    if (!s) return null;
    const d = new Date(s + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  };

  const start        = pd(launch.start_date);
  const capture      = pd(launch.capture_start_date);
  const launchDate   = pd(launch.launch_date);
  const cartOpen     = pd(launch.cart_open_date);
  const cartClose    = pd(launch.cart_close_date);
  const downStart    = pd(launch.downsell_start_date);
  const downEnd      = pd(launch.downsell_end_date);

  // Downsell window
  if (downStart && today >= downStart && (!downEnd || today <= downEnd)) return "downsell";

  // Cart closed
  if (cartClose && today > cartClose) return "concluido";

  // Venda (cart open)
  if (cartOpen && today >= cartOpen && (!cartClose || today <= cartClose)) return "venda";

  // Post-launch but no cart → assume venda
  if (launchDate && today > launchDate) return "venda";

  // Evento (launch day)
  if (launchDate && today.getTime() === launchDate.getTime()) return "evento";

  // Aquecimento (3 dias antes do evento)
  if (launchDate) {
    const aq = new Date(launchDate);
    aq.setDate(aq.getDate() - 3);
    if (today >= aq && today < launchDate) return "aquecimento";
  }

  // Captação
  if (capture && today >= capture) return "captacao";

  // Distribuição
  if (start && today >= start) return "distribuicao";

  // start_date exists but in future
  if (start && today < start) return "planeamento";

  return "rascunho";
}

export interface StudentLaunch {
  id: string;
  student_id: string;
  title: string;
  type: string | null;
  status: LaunchStatus;
  goal: string | null;
  notes: string | null;
  channels: string[];
  promise: string | null;
  sub_promise: string | null;
  main_product_id: string | null;
  downsell_product_id: string | null;
  upsell_product_id: string | null;
  ticket: number | null;
  start_date: string | null;
  end_date: string | null;
  capture_start_date: string | null;
  launch_date: string | null;
  cart_open_date: string | null;
  cart_close_date: string | null;
  downsell_start_date: string | null;
  downsell_end_date: string | null;
  budget_distribuicao: number | null;
  budget_captacao: number | null;
  budget_antecipacao: number | null;
  budget_remarketing: number | null;
  lead_goal_1_paid: number | null;
  lead_goal_2_paid: number | null;
  lead_goal_3_paid: number | null;
  lead_goal_1_organic: number | null;
  lead_goal_2_organic: number | null;
  lead_goal_3_organic: number | null;
  conversion_rate_leads: number | null;
  sales_break_even_count: number | null;
  sales_break_even_revenue: number | null;
  sales_goal_1_count: number | null;
  sales_goal_1_revenue: number | null;
  sales_goal_2_count: number | null;
  sales_goal_2_revenue: number | null;
  sales_goal_3_count: number | null;
  sales_goal_3_revenue: number | null;
  completed_at: string | null;
  revenue_synced: boolean;
  deletion_requested_at: string | null;
  deletion_requested_by: string | null;
  product_snapshot: Record<string, unknown> | null;
  snapshot_at_creation: Record<string, unknown> | null;
  event_name: string | null;
  event_type: string | null;
  event_platform: string | null;
  event_time: string | null;
  big_idea: string | null;
  approved_promise: string | null;
  launch_model: string | null;
  review_status: import("@/lib/types/review-status").ReviewStatus;
  review_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentLaunchDebrief {
  id: string;
  launch_id: string;
  investimento_total: number;
  investimento_distribuicao: number;
  investimento_captacao: number;
  investimento_antecipacao: number;
  investimento_remarketing: number;
  visitantes_pagina: number | null;
  leads_totais: number | null;
  leads_pagas_pct: number | null;
  leads_organicas_pct: number | null;
  leads_publico_quente: number | null;
  leads_publico_frio: number | null;
  leads_wpp: number | null;
  ao_vivo_maximo: number | null;
  ao_vivo_estavel: number | null;
  ao_vivo_pitch: number | null;
  visualizacoes: number | null;
  melhor_video: string | null;
  melhor_carrossel: string | null;
  melhor_estatico: string | null;
  criativos_anexos: unknown[];
  views_lpv: number | null;
  views_checkout: number | null;
  total_vendas: number | null;
  vendas_dia_evento: number | null;
  vendas_workshop: number | null;
  receita_liquida_fase_venda: number | null;
  referencias_geradas: number | null;
  referencias_pagas_pct: number | null;
  downsell_vendas: number | null;
  downsell_receita_bruta: number | null;
  downsell_receita_liquida: number | null;
  observacoes: string | null;
  revenue_synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface DebriefCalculated {
  taxa_conversao_lp: number | null;
  cpl: number | null;
  taxa_conv_lead_wpp: number | null;
  taxa_comparecimento_total: number | null;
  taxa_comparecimento_wpp: number | null;
  taxa_conversao_lpv: number | null;
  taxa_conversao_checkout: number | null;
  taxa_conversao_leads: number | null;
  taxa_conversao_ao_vivo: number | null;
  roas: number | null;
  receita_liquida_total: number | null;
  receita_bruta_total: number | null;
  roas_total: number | null;
}

export function calcDebrief(
  d: StudentLaunchDebrief,
  ticket: number | null,
): DebriefCalculated {
  const div = (a: number | null | undefined, b: number | null | undefined): number | null => {
    const an = a ?? null;
    const bn = b ?? null;
    if (an == null || bn == null || bn === 0) return null;
    const r = an / bn;
    return isFinite(r) ? r : null;
  };

  const receita_liquida_total =
    (d.receita_liquida_fase_venda ?? 0) + (d.downsell_receita_liquida ?? 0) > 0
      ? (d.receita_liquida_fase_venda ?? 0) + (d.downsell_receita_liquida ?? 0)
      : null;

  const receita_bruta_total =
    ticket != null && d.total_vendas != null
      ? d.total_vendas * ticket + (d.downsell_receita_bruta ?? 0)
      : null;

  const inv = d.investimento_total > 0 ? d.investimento_total : null;

  return {
    taxa_conversao_lp:         div(d.leads_totais, d.visitantes_pagina),
    cpl:                       div(d.investimento_captacao, d.leads_totais),
    taxa_conv_lead_wpp:        div(d.leads_wpp, d.leads_totais),
    taxa_comparecimento_total: div(d.ao_vivo_estavel, d.leads_totais),
    taxa_comparecimento_wpp:   div(d.ao_vivo_estavel, d.leads_wpp),
    taxa_conversao_lpv:        div(d.total_vendas, d.views_lpv),
    taxa_conversao_checkout:   div(d.total_vendas, d.views_checkout),
    taxa_conversao_leads:      div(d.total_vendas, d.leads_totais),
    taxa_conversao_ao_vivo:    div(d.total_vendas, d.ao_vivo_estavel),
    roas:                      div(d.receita_liquida_fase_venda, inv),
    receita_liquida_total,
    receita_bruta_total,
    roas_total:                div(receita_liquida_total, inv),
  };
}
