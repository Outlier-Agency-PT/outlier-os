"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface EquipaTabsProps {
  isAdmin: boolean;
}

export function EquipaTabs({ isAdmin }: EquipaTabsProps) {
  const pathname = usePathname();
  const isMetricas = pathname.startsWith("/equipa/metricas");

  if (!isAdmin) return null;

  return (
    <div className="flex px-4 pt-4 md:px-8">
      <div className="flex gap-px border border-border bg-border">
        <Link
          href="/equipa"
          className={cn(
            "px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors",
            !isMetricas
              ? "bg-foreground text-background"
              : "bg-card text-muted-foreground hover:bg-muted",
          )}
        >
          Membros
        </Link>
        <Link
          href="/equipa/metricas"
          className={cn(
            "px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors",
            isMetricas
              ? "bg-foreground text-background"
              : "bg-card text-muted-foreground hover:bg-muted",
          )}
        >
          Métricas
        </Link>
      </div>
    </div>
  );
}
