// Tipos e utilitários partilhados para o fluxo de revisão coach ↔ aluno.
// Sem importações server-only — pode ser usado em Client e Server Components.

export type ReviewStatus =
  | "nao_iniciado"
  | "em_preenchimento"
  | "pronto_revisao"
  | "alteracoes_pedidas"
  | "aprovado"
  | "arquivado";

export const REVIEW_STATUS_OPTIONS: ReviewStatus[] = [
  "nao_iniciado",
  "em_preenchimento",
  "pronto_revisao",
  "alteracoes_pedidas",
  "aprovado",
  "arquivado",
];

interface ReviewStatusMeta {
  label: string;
  /** Classes Tailwind para o badge (bg + text + border). */
  classes: string;
}

export const REVIEW_STATUS_META: Record<ReviewStatus, ReviewStatusMeta> = {
  nao_iniciado: {
    label: "Não iniciado",
    classes:
      "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  },
  em_preenchimento: {
    label: "Em preenchimento",
    classes:
      "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  pronto_revisao: {
    label: "Pronto para revisão",
    classes:
      "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  alteracoes_pedidas: {
    label: "Alterações pedidas",
    classes:
      "border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  aprovado: {
    label: "Aprovado",
    classes:
      "border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  arquivado: {
    label: "Arquivado",
    classes:
      "border-zinc-300 bg-zinc-200 text-zinc-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-400",
  },
};

/** Transições válidas por papel:
 *  - Aluno: nao_iniciado → em_preenchimento → pronto_revisao
 *           (pode voltar a em_preenchimento quando coach pede alterações)
 *  - Coach: pronto_revisao → aprovado | alteracoes_pedidas
 *           Qualquer estado → arquivado
 */
export const ALUNO_TRANSITIONS: Partial<Record<ReviewStatus, ReviewStatus[]>> = {
  nao_iniciado:       ["em_preenchimento"],
  em_preenchimento:   ["pronto_revisao"],
  alteracoes_pedidas: ["em_preenchimento"],
};

export const COACH_TRANSITIONS: Partial<Record<ReviewStatus, ReviewStatus[]>> = {
  pronto_revisao:   ["aprovado", "alteracoes_pedidas"],
  aprovado:         ["alteracoes_pedidas", "arquivado"],
  em_preenchimento: ["arquivado"],
  nao_iniciado:     ["arquivado"],
};
