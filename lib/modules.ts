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
  type LucideIcon,
} from "lucide-react";

export type ModuleKey =
  | "dashboard"
  | "clientes"
  | "tarefas"
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

export type ModuleSection = "dashboard" | "operacional" | "financeiro" | "gestao";

export interface ModuleDef {
  key: ModuleKey;
  label: string;
  href: string;
  icon: LucideIcon;
  section: ModuleSection;
}

export const MODULES: ModuleDef[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, section: "dashboard" },
  { key: "clientes", label: "Clientes", href: "/clientes", icon: Users, section: "operacional" },
  { key: "tarefas", label: "Tarefas", href: "/tarefas", icon: CheckSquare, section: "operacional" },
  { key: "lancamentos", label: "Lançamentos", href: "/lancamentos", icon: Rocket, section: "operacional" },
  { key: "conteudo", label: "Conteúdo", href: "/conteudo", icon: FileText, section: "operacional" },
  { key: "incubadora", label: "Incubadora", href: "/incubadora", icon: GraduationCap, section: "operacional" },
  { key: "relatorios", label: "Relatórios", href: "/relatorios", icon: ClipboardList, section: "operacional" },
  { key: "financeiro", label: "Financeiro", href: "/financeiro", icon: DollarSign, section: "financeiro" },
  { key: "okrs", label: "OKRs", href: "/okrs", icon: Target, section: "gestao" },
  { key: "processos", label: "Processos", href: "/processos", icon: BookOpen, section: "gestao" },
  { key: "reunioes", label: "Reuniões", href: "/reunioes", icon: Calendar, section: "gestao" },
  { key: "equipa", label: "Equipa", href: "/equipa", icon: UsersRound, section: "gestao" },
  { key: "configuracoes", label: "Configurações", href: "/configuracoes", icon: Settings, section: "dashboard" },
];

export const SECTION_LABELS: Record<ModuleSection, string> = {
  dashboard: "DASHBOARD",
  operacional: "OPERACIONAL",
  financeiro: "FINANCEIRO",
  gestao: "GESTÃO",
};

export function modulesBySection(section: ModuleSection): ModuleDef[] {
  return MODULES.filter((m) => m.section === section);
}
