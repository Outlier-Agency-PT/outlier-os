"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { MODULES, SECTION_LABELS, modulesBySection, type ModuleSection } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const SECTIONS: ModuleSection[] = ["dashboard", "operacional", "financeiro", "gestao"];

export function Sidebar({ userEmail, userName }: { userEmail?: string; userName?: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();
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
        "relative flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-[width]",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        {!collapsed && (
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            OUTLIER <span className="text-primary">OS</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="rounded-md p-1 hover:bg-accent"
          aria-label={collapsed ? "Expandir menu" : "Colapsar menu"}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>

      {/* Sections */}
      <nav className="flex-1 overflow-y-auto px-2">
        {SECTIONS.map((section) => {
          const items = modulesBySection(section);
          if (items.length === 0) return null;
          // Configurações é renderizado no footer, não aqui
          const filtered = items.filter((m) => m.key !== "configuracoes");
          if (filtered.length === 0) return null;

          return (
            <div key={section} className="mb-4">
              {!collapsed && (
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {SECTION_LABELS[section]}
                </p>
              )}
              <ul className="space-y-0.5">
                {filtered.map((m) => {
                  const Icon = m.icon;
                  const active = pathname === m.href || pathname.startsWith(m.href + "/");
                  return (
                    <li key={m.key}>
                      <Link
                        href={m.href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "hover:bg-accent",
                        )}
                        title={collapsed ? m.label : undefined}
                      >
                        <Icon className="size-4 shrink-0" />
                        {!collapsed && <span>{m.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer: Configurações + Modo Escuro + User */}
      <div className="border-t p-2">
        <Link
          href="/configuracoes"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
            pathname.startsWith("/configuracoes") && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          {(() => {
            const Cfg = MODULES.find((m) => m.key === "configuracoes")!.icon;
            return <Cfg className="size-4 shrink-0" />;
          })()}
          {!collapsed && <span>Configurações</span>}
        </Link>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
        >
          {theme === "dark" ? (
            <Sun className="size-4 shrink-0" />
          ) : (
            <Moon className="size-4 shrink-0" />
          )}
          {!collapsed && <span>{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>}
        </button>

        {!collapsed && userEmail && (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-md p-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{userName ?? userEmail.split("@")[0]}</p>
              <p className="truncate text-[10px] text-muted-foreground">{userEmail}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSignOut}
              aria-label="Sair"
              className="size-7"
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
