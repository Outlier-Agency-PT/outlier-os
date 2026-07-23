"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import {
  getStudentSelfFinancialAction,
  updateStudentSelfRevenueAction,
  getStudentRevenueHistoryAction,
} from "@/lib/actions/students";
import type { StudentRevenueEntry } from "@/lib/queries/students";

type FinancialData = {
  id: string;
  revenue_generated: number | null;
  revenue_goal: number | null;
  investment_budget: number | null;
  start_date: string | null;
  debriefing: string | null;
};

function fmt(n: number) {
  return n.toLocaleString("pt-PT");
}

export function StudentROI() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [history, setHistory] = useState<StudentRevenueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ revenue: "", debriefing: "" });
  const [saving, setSaving] = useState(false);

  async function loadHistory(studentDbId: string) {
    const hist = await getStudentRevenueHistoryAction(studentDbId);
    setHistory(hist);
  }

  useEffect(() => {
    async function load() {
      const financial = await getStudentSelfFinancialAction();
      setData(financial);
      if (financial) {
        await loadHistory(financial.id);
        setForm({
          revenue: financial.revenue_generated?.toString() ?? "",
          debriefing: financial.debriefing ?? "",
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    const revenue = form.revenue !== "" ? parseFloat(form.revenue) : null;
    // debriefing deprecated — passa valor existente inalterado para preservar dados antigos
    const result = await updateStudentSelfRevenueAction(revenue, data?.debriefing ?? null);
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      setData((prev) =>
        prev ? { ...prev, revenue_generated: revenue } : prev,
      );
      if (data) await loadHistory(data.id);
      setEditing(false);
      toast.success("Progresso guardado");
    }
    setSaving(false);
  }

  if (loading || !data) return null;

  const roi =
    data.investment_budget && data.investment_budget > 0 && data.revenue_generated != null
      ? data.revenue_generated / data.investment_budget
      : null;

  const progressPct =
    data.revenue_goal && data.revenue_goal > 0 && data.revenue_generated != null
      ? Math.min(100, Math.round((data.revenue_generated / data.revenue_goal) * 100))
      : 0;

  const roiColor =
    roi === null
      ? "text-muted-foreground"
      : roi >= 1
        ? "text-emerald-600"
        : roi > 0
          ? "text-amber-600"
          : "text-muted-foreground";

  const chartData = history.map((h) => ({
    date: new Date(h.recorded_at).toLocaleDateString("pt-PT", { month: "short", day: "numeric" }),
    value: Number(h.value),
  }));

  return (
    <div className="rounded-lg border bg-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">O Meu Progresso Financeiro</h3>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Editar
          </button>
        )}
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-muted/40 p-3 text-center">
          <p className="text-xs text-muted-foreground">Investido</p>
          <p className="mt-1 text-lg font-semibold">
            {data.investment_budget != null ? `${fmt(data.investment_budget)}€` : "—"}
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 text-center">
          <p className="text-xs text-muted-foreground">Gerado</p>
          <p className="mt-1 text-lg font-semibold">
            {data.revenue_generated != null ? `${fmt(data.revenue_generated)}€` : "—"}
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 text-center">
          <p className="text-xs text-muted-foreground">ROI</p>
          <p className={`mt-1 text-lg font-semibold ${roiColor}`}>
            {roi != null ? `${roi.toFixed(1)}x` : "—"}
          </p>
        </div>
      </div>

      {/* Barra de meta */}
      {data.revenue_goal && data.revenue_goal > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {fmt(data.revenue_generated ?? 0)}€ de {fmt(data.revenue_goal)}€
            </span>
            <span className="font-medium">{progressPct}% da meta</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full transition-all"
              style={{ width: `${progressPct}%`, backgroundColor: "#A12B2B" }}
            />
          </div>
        </div>
      )}

      {/* Gráfico */}
      {chartData.length >= 2 ? (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${v}€`
                }
              />
              <Tooltip
                formatter={(v: number) => [`${fmt(v)}€`, "Receita"]}
                contentStyle={{ fontSize: 12, borderRadius: 3 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#A12B2B"
                strokeWidth={2}
                dot={{ fill: "#A12B2B", r: 3 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Actualiza a tua receita para ver a evolução aqui
        </p>
      )}

      {/* Formulário de edição */}
      {editing && (
        <div className="space-y-3 border-t pt-4">
          <div>
            <label className="block text-xs font-medium mb-1">Receita Gerada (€)</label>
            <input
              type="number"
              value={form.revenue}
              onChange={(e) => setForm({ ...form, revenue: e.target.value })}
              className="w-full border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              style={{ borderRadius: 3 }}
            />
          </div>
          <div className="rounded border border-muted bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
            As notas de debriefing ficam agora em cada lançamento, na tab Debriefing.{" "}
            <a href="/incubadora" className="underline hover:text-foreground">
              Ver Lançamentos
            </a>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: "#A12B2B", borderRadius: 3 }}
            >
              {saving ? "A guardar..." : "Guardar"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="border px-3 py-1.5 text-sm hover:bg-muted/50"
              style={{ borderRadius: 3 }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Debriefing legacy */}
      {!editing && data.debriefing && (
        <div className="border-t pt-3 space-y-1">
          <p className="text-xs text-muted-foreground">Nota anterior (migrar para lançamento):</p>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{data.debriefing}</p>
        </div>
      )}
    </div>
  );
}
