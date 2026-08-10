"use client";

import { useState, useEffect } from "react";
import { getStudentsROISummaryAction } from "@/lib/actions/students";
import type { StudentROISummary } from "@/lib/queries/students";
import { Input } from "@/components/ui/input";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ROIBadge({ roi }: { roi: number | null }) {
  if (roi === null) return <span className="text-xs text-muted-foreground">—</span>;
  const cls =
    roi >= 1
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : roi > 0
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${cls}`}
      style={{ borderRadius: 9999 }}
    >
      {roi.toFixed(1)}x
    </span>
  );
}

function MiniProgress({ value, goal }: { value: number | null; goal: number | null }) {
  if (!goal || goal <= 0 || value == null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const pct = Math.min(100, Math.round((value / goal) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: "#A12B2B" }} />
      </div>
      <span className="text-xs text-muted-foreground">{pct}%</span>
    </div>
  );
}

export function StudentsROIDashboard() {
  const [students, setStudents] = useState<StudentROISummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getStudentsROISummaryAction().then((data) => {
      setStudents(data);
      setLoading(false);
    });
  }, []);

  if (loading || students.length === 0) return null;

  const filtered = search
    ? students.filter((s) =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase())
      )
    : students;

  const today = new Date();
  const LIMIT = 5;
  const visible = expanded ? filtered : filtered.slice(0, LIMIT);

  return (
    <div className="mx-auto max-w-7xl px-8 py-6">
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4 gap-4">
          <h2 className="font-semibold">ROI dos Alunos</h2>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar aluno..."
            className="max-w-xs h-8 text-sm"
          />
          <span
            className="bg-muted px-2.5 py-0.5 text-xs font-medium shrink-0"
            style={{ borderRadius: 9999 }}
          >
            {filtered.length} {filtered.length === 1 ? "ativo" : "ativos"}
          </span>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">Aluno</th>
                  <th className="px-4 py-2.5 text-right font-medium">Investido</th>
                  <th className="px-4 py-2.5 text-right font-medium">Gerado</th>
                  <th className="px-4 py-2.5 text-center font-medium">ROI</th>
                  <th className="px-4 py-2.5 text-left font-medium">Meta</th>
                  <th className="px-4 py-2.5 text-left font-medium">Última actualização</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((s) => {
                  const daysActive = s.start_date
                    ? Math.ceil(
                        (today.getTime() - new Date(s.start_date).getTime()) /
                          (1000 * 60 * 60 * 24),
                      )
                    : 0;
                  const isAtRisk =
                    (!s.revenue_generated || s.revenue_generated === 0) && daysActive > 30;

                  return (
                    <tr
                      key={s.id}
                      className={`transition-colors ${isAtRisk ? "bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30" : "hover:bg-muted/20"}`}
                    >
                      <td className="px-5 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {s.investment_budget != null
                          ? `${s.investment_budget.toLocaleString("pt-PT")}€`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {s.revenue_generated != null
                          ? `${s.revenue_generated.toLocaleString("pt-PT")}€`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ROIBadge roi={s.roi} />
                      </td>
                      <td className="px-4 py-3">
                        <MiniProgress value={s.revenue_generated} goal={s.revenue_goal} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {s.last_updated ? formatDate(s.last_updated) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {filtered.length > LIMIT && (
                <tfoot>
                  <tr>
                    <td colSpan={6} className="px-5 py-3 text-center">
                      <button
                        onClick={() => setExpanded((v) => !v)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {expanded ? "Ver menos" : `Ver mais ${filtered.length - LIMIT} alunos`}
                      </button>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
      </div>
    </div>
  );
}
