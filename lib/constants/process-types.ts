export const DOC_TYPES = [
  { value: "processo",  label: "Processo / SOP" },
  { value: "playbook",  label: "Playbook" },
  { value: "guia",      label: "Guia" },
  { value: "template",  label: "Template" },
  { value: "checklist", label: "Checklist" },
  { value: "decisao",   label: "Decisão" },
  { value: "trilha",    label: "Trilha de Lançamento" },
] as const;

export type DocType = (typeof DOC_TYPES)[number]["value"];
