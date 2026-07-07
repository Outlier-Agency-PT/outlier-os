"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Moon, Sun, LogOut, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { MODULES, SECTION_LABELS, modulesBySection, type ModuleSection } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const SECTIONS: ModuleSection[] = ["dashboard", "estrategia", "operacional", "financeiro", "gestao"];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  resolvedTheme,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  collapsed: boolean;
  resolvedTheme: string | undefined;
}) {
  const activeIcon = resolvedTheme === "dark" ? "/outtemaescuro.png" : "/outtemaclaro.png";

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "relative flex items-center gap-3 py-[7px] text-[14px] transition-colors",
        collapsed ? "justify-center" : active ? "pl-8 pr-4" : "pl-4 pr-4",
        active
          ? "text-sidebar-accent-foreground"
          : "text-sidebar-foreground/55 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/90",
      )}
    >
      {active && !collapsed && (
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
          <Image
            src={activeIcon}
            alt=""
            width={12}
            height={12}
            className="h-auto w-3"
            style={{ filter: "invert(27%) sepia(100%) saturate(2000%) hue-rotate(330deg) brightness(90%)" }}
          />
        </span>
      )}
      {active && collapsed && (
        <span className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2">
          <Image
            src={activeIcon}
            alt=""
            width={12}
            height={12}
            className="h-auto w-3"
            style={{ filter: "invert(27%) sepia(100%) saturate(2000%) hue-rotate(330deg) brightness(90%)" }}
          />
        </span>
      )}
      <Icon className="size-3.5 shrink-0" />
      {!collapsed && <span className="tracking-[-0.01em]">{label}</span>}
    </Link>
  );
}

export function Sidebar({
  userEmail,
  userName,
  role,
  permissionsModules,
  onSearchClick,
}: {
  userEmail?: string;
  userName?: string;
  role?: string;
  permissionsModules?: string[];
  onSearchClick?: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-150",
        collapsed ? "w-14" : "w-52",
      )}
    >
      {/* ── Logotipo ── */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-border",
          collapsed ? "justify-center" : "gap-3 px-4",
        )}
      >
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            aria-label="Expandir menu"
            className="flex items-center justify-center p-1 text-sidebar-foreground/30 transition-colors hover:text-sidebar-foreground/70"
          >
            <ChevronRight className="size-3.5" />
          </button>
        ) : (
          <>
            <Link href="/dashboard" className="min-w-0 flex-1">
              <Image
                src={resolvedTheme === "dark" ? "/outlierlogoescuro.png" : "/logooutliermodoclaro.png"}
                alt="Outlier Agency"
                width={140}
                height={28}
                className="h-auto w-[140px]"
                priority
              />
            </Link>
            <button
              onClick={() => setCollapsed(true)}
              aria-label="Colapsar menu"
              className="shrink-0 p-1 text-sidebar-foreground/25 transition-colors hover:text-sidebar-foreground/60"
            >
              <ChevronLeft className="size-3.5" />
            </button>
          </>
        )}
      </div>

      {/* ── Pesquisa ── */}
      <button
        onClick={onSearchClick}
        title={collapsed ? "Pesquisar (Ctrl+K)" : undefined}
        className={cn(
          "flex items-center gap-3 border-b border-border py-[9px] text-[14px] text-sidebar-foreground/55 transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/90",
          collapsed ? "justify-center" : "px-4",
        )}
      >
        <Search className="size-3.5 shrink-0" />
        {!collapsed && (
          <>
            <span className="tracking-[-0.01em]">Pesquisar</span>
            <span className="ml-auto text-[11px] text-sidebar-foreground/30">Ctrl+K</span>
          </>
        )}
      </button>

      {/* ── Navegação ── */}
      <nav className="flex-1 overflow-y-auto py-4">
        {SECTIONS.map((section) => {
          const items = modulesBySection(section);
          if (items.length === 0) return null;
          const filtered = items.filter(
            (m) =>
              m.key !== "configuracoes" &&
              (m.key === "dashboard" ||
                role === "admin" ||
                (permissionsModules ?? []).includes(m.key)),
          );
          if (filtered.length === 0) return null;

          return (
            <div key={section} className="mb-5">
              {!collapsed && (
                <p className="px-4 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/40">
                  {SECTION_LABELS[section]}
                </p>
              )}
              <ul>
                {filtered.map((m) => (
                  <li key={m.key}>
                    <NavItem
                      href={m.href}
                      label={m.label}
                      icon={m.icon}
                      active={pathname === m.href || pathname.startsWith(m.href + "/")}
                      collapsed={collapsed}
                      resolvedTheme={resolvedTheme}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* ── Rodapé ── */}
      <div className="shrink-0 border-t border-border py-1">
        {(() => {
          const cfgModule = MODULES.find((m) => m.key === "configuracoes")!;
          return (
            <NavItem
              href="/configuracoes"
              label="Configurações"
              icon={cfgModule.icon}
              active={pathname.startsWith("/configuracoes")}
              collapsed={collapsed}
              resolvedTheme={resolvedTheme}
            />
          );
        })()}

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className={cn(
            "flex w-full items-center gap-3 py-[7px] text-[14px] text-sidebar-foreground/55 transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/90",
            collapsed ? "justify-center" : "pl-4 pr-4",
          )}
        >
          {theme === "dark" ? (
            <Sun className="size-3.5 shrink-0" />
          ) : (
            <Moon className="size-3.5 shrink-0" />
          )}
          {!collapsed && (
            <span className="tracking-[-0.01em]">
              {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
            </span>
          )}
        </button>

        {!collapsed && userEmail && (
          <div className="mx-3 mb-2 mt-1 flex items-center gap-2 border-t border-border pt-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium leading-tight text-sidebar-foreground/75">
                {userName ?? userEmail.split("@")[0]}
              </p>
              <p className="truncate text-[10px] leading-tight text-sidebar-foreground/30">
                {userEmail}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSignOut}
              aria-label="Sair"
              className="size-6 shrink-0 text-sidebar-foreground/40 hover:bg-transparent hover:text-sidebar-foreground/70"
            >
              <LogOut className="size-3" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
