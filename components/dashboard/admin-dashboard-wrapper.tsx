"use client";

import { useState, useLayoutEffect } from "react";
import { cn } from "@/lib/utils";

type DashView = "admin" | "colaborador";
const PREF_KEY = "dashboard_view_preference";

interface Props {
  adminView: React.ReactNode;
  colaboradorView: React.ReactNode;
}

export function AdminDashboardWrapper({ adminView, colaboradorView }: Props) {
  const [view, setView] = useState<DashView>("admin");

  useLayoutEffect(() => {
    const saved = localStorage.getItem(PREF_KEY);
    if (saved === "admin" || saved === "colaborador") {
      setView(saved);
    }
  }, []);

  function switchView(v: DashView) {
    setView(v);
    localStorage.setItem(PREF_KEY, v);
  }

  return (
    <>
      <div className="flex items-center px-4 pt-4 md:px-8">
        <div className="flex gap-px border border-border bg-border">
          <button
            onClick={() => switchView("admin")}
            className={cn(
              "px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors",
              view === "admin"
                ? "bg-foreground text-background"
                : "bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            Vista Admin
          </button>
          <button
            onClick={() => switchView("colaborador")}
            className={cn(
              "px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors",
              view === "colaborador"
                ? "bg-foreground text-background"
                : "bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            Vista Colaborador
          </button>
        </div>
      </div>

      <div className={view === "admin" ? undefined : "hidden"}>{adminView}</div>
      <div className={view === "colaborador" ? undefined : "hidden"}>{colaboradorView}</div>
    </>
  );
}
