"use client";

import { useState } from "react";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TransactionForm } from "./transaction-form";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PnLSummary, Transaction, FinancialCategory } from "@/lib/queries/financial";

interface Props {
  summary: PnLSummary;
  transactions: Transaction[];
  categories: FinancialCategory[];
  clients: { id: string; name: string }[];
  year: number;
}

export function FinancialDashboard({ summary, transactions, categories, clients, year }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b px-8 py-4">
        <p className="text-sm text-muted-foreground">Ano <strong className="text-foreground">{year}</strong></p>
        <Button onClick={() => setOpen(true)} className="ml-auto">
          <Plus />
          Nova Transação
        </Button>
      </div>

      <div className="space-y-6 p-8">
        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Receita Total"
            value={formatCurrency(summary.totalReceita)}
            icon={TrendingUp}
            tone="text-green-600"
          />
          <KpiCard
            label="Despesa Total"
            value={formatCurrency(summary.totalDespesa)}
            icon={TrendingDown}
            tone="text-red-600"
          />
          <KpiCard
            label="Lucro"
            value={formatCurrency(summary.lucro)}
            tone={summary.lucro >= 0 ? "text-green-600" : "text-red-600"}
          />
          <KpiCard
            label="Margem"
            value={`${summary.margin.toFixed(1)}%`}
            tone={summary.margin >= 0 ? "text-green-600" : "text-red-600"}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receita vs Despesa por mês</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.byMonth.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados.</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={summary.byMonth}>
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="receita" fill="#10B981" />
                    <Bar dataKey="despesa" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por Categoria</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CategoryPie title="Receita" data={summary.byCategoryReceita} />
              <CategoryPie title="Despesa" data={summary.byCategoryDespesa} />
            </CardContent>
          </Card>
        </div>

        {/* Transações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transações ({transactions.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Sem transações ainda. Cria a primeira.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 font-medium">Descrição</th>
                    <th className="px-4 py-2 font-medium">Categoria</th>
                    <th className="px-4 py-2 font-medium">Cliente</th>
                    <th className="px-4 py-2 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.slice(0, 50).map((t) => (
                    <tr key={t.id} className="hover:bg-muted/50">
                      <td className="px-4 py-2 text-xs text-muted-foreground">{formatDate(t.transaction_date)}</td>
                      <td className="px-4 py-2 font-medium">{t.description}</td>
                      <td className="px-4 py-2">
                        {t.category && (
                          <Badge variant="outline" className="text-[10px]">
                            {t.category.name}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{t.client?.name ?? "—"}</td>
                      <td className={`px-4 py-2 text-right font-medium ${
                        t.type === "receita" ? "text-green-600" : "text-red-600"
                      }`}>
                        {t.type === "receita" ? "+" : "-"}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <TransactionForm
        open={open}
        onOpenChange={setOpen}
        categories={categories.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
        clients={clients}
      />
    </>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          {Icon && <Icon className={`size-4 ${tone}`} />}
        </div>
        <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function CategoryPie({ title, data }: { title: string; data: Array<{ name: string; total: number; color: string }> }) {
  if (data.length === 0) {
    return (
      <div>
        <p className="mb-2 text-xs font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">Sem dados</p>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-2 text-xs font-medium">{title}</p>
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={50}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
