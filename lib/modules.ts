import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Rocket,
  FileText,
  GraduationCap,
  ClipboardList,
  DollarSign,
  Target,
  BookOpen,
  Calendar,
  UsersRound,
  Settings,
  Compass,
  Lightbulb,
  Gauge,
  PenLine,
  type LucideIcon,
} from "lucide-react";

export type ModuleKey =
  | "dashboard"
  | "iniciativas"
  | "decisoes"
  | "mentorias"
  | "clientes"
  | "tarefas"
  | "whiteboard"
  | "lancamentos"
  | "conteudo"
  | "incubadora"
  | "relatorios"
  | "financeiro"
  | "okrs"
  | "processos"
  | "reunioes"
  | "equipa"
  | "configuracoes";

export type ModuleSection =
  | "dashboard"
  | "estrategia"
  | "operacional"
  | "financeiro"
  | "gestao";

export interface ModuleDef {
  key: ModuleKey;
  label: string;
  href: string;
  icon: LucideIcon;
  section: ModuleSection;
}

export const MODULES: ModuleDef[] = [
  // DASHBOARD
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, section: "dashboard" },

  // ESTRATÉGIA — Camada de decisão CEO
  { key: "iniciativas", label: "Iniciativas", href: "/iniciativas", icon: Compass, section: "estrategia" },
  { key: "decisoes", label: "Decisões", href: "/decisoes", icon: Gauge, section: "estrategia" },
  { key: "mentorias", label: "Mentorias", href: "/mentorias", icon: Lightbulb, section: "estrategia" },

  // OPERACIONAL
  { key: "clientes", label: "Clientes", href: "/clientes", icon: Users, section: "operacional" },
  { key: "tarefas", label: "Tarefas", href: "/tarefas", icon: CheckSquare, section: "operacional" },
  { key: "whiteboard", label: "Whiteboard", href: "/whiteboard", icon: PenLine, section: "operacional" },
  { key: "lancamentos", label: "Lançamentos", href: "/lancamentos", icon: Rocket, section: "operacional" },
  { key: "conteudo", label: "Conteúdo", href: "/conteudo", icon: FileText, section: "operacional" },
  { key: "incubadora", label: "Incubadora", href: "/incubadora", icon: GraduationCap, section: "operacional" },
  { key: "relatorios", label: "Relatórios", href: "/relatorios", icon: ClipboardList, section: "operacional" },

  // FINANCEIRO
  { key: "financeiro", label: "Financeiro", href: "/financeiro", icon: DollarSign, section: "financeiro" },

  // GESTÃO
  { key: "okrs", label: "OKRs", href: "/okrs", icon: Target, section: "gestao" },
  { key: "processos", label: "Processos", href: "/processos", icon: BookOpen, section: "gestao" },
  { key: "reunioes", label: "Reuniões", href: "/reunioes", icon: Calendar, section: "gestao" },
  { key: "equipa", label: "Equipa", href: "/equipa", icon: UsersRound, section: "gestao" },

  // FOOTER
  { key: "configuracoes", label: "Configurações", href: "/configuracoes", icon: Settings, section: "dashboard" },
];

export const SECTION_LABELS: Record<ModuleSection, string> = {
  dashboard: "DASHBOARD",
  estrategia: "ESTRATÉGIA",
  operacional: "OPERACIONAL",
  financeiro: "FINANCEIRO",
  gestao: "GESTÃO",
};

export function modulesBySection(section: ModuleSection): ModuleDef[] {
  return MODULES.filter((m) => m.section === section);
}
