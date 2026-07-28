"use client";

import { useState } from "react";
import { AlertCircle, AlertTriangle, Check, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ToolsViewProps {
  initialTicket?: number;
  initialBudget?: number;
}

interface CalculatorInputs {
  budget: number;
  ticket: number;
  cpm: number;
  ctr: number;
  pct_organica: number;
  frequencia: number;
  tx_cliques_vp: number;
  tx_vp_leads: number;
  tx_leads_wpp: number;
  tx_wpp_aovivo: number;
  tx_aovivo_venda: number;
}

interface CalculatorResults {
  alcance: number;
  cliques: number;
  vp: number;
  leads_pagos: number;
  leads_organicos: number;
  total_leads: number;
  leads_wpp: number;
  comparencia: number;
  vendas: number;
  faturamento: number;
  cpl: number;
  roi: number;
}

interface ScenarioResults {
  vendas: number;
  faturamento: number;
  total_leads: number;
  cpl: number;
  roi: number;
}

interface ScoreMetrics {
  ctr: number;
  cpl: number;
  roi: number;
  taxa_aovivo_venda: number;
}

interface Recommendation {
  metric: string;
  message: string;
}

export function ToolsView({ initialTicket, initialBudget }: ToolsViewProps) {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    budget: 0,
    ticket: 0,
    cpm: 0,
    ctr: 0,
    pct_organica: 0,
    frequencia: 0,
    tx_cliques_vp: 0,
    tx_vp_leads: 0,
    tx_leads_wpp: 0,
    tx_wpp_aovivo: 0,
    tx_aovivo_venda: 0,
  });

  const [validationError, setValidationError] = useState<string>("");

  const [results, setResults] = useState<{
    base: CalculatorResults;
    otimista: ScenarioResults;
    realista: ScenarioResults;
    pessimista: ScenarioResults;
    scores: ScoreMetrics;
    final_score: number;
    classification: string;
    recommendations: Recommendation[];
  } | null>(null);

  const validateAndCalculate = () => {
    const emptyFields = [];
    if (!inputs.budget) emptyFields.push("Budget");
    if (!inputs.ticket) emptyFields.push("Ticket");
    if (!inputs.cpm) emptyFields.push("CPM");
    if (!inputs.ctr) emptyFields.push("CTR");
    if (inputs.pct_organica === null || inputs.pct_organica === undefined || inputs.pct_organica === 0) emptyFields.push("% Orgânica");
    if (!inputs.frequencia) emptyFields.push("Frequência");
    if (!inputs.tx_cliques_vp) emptyFields.push("Cliques→VP");
    if (!inputs.tx_vp_leads) emptyFields.push("VP→Leads");
    if (!inputs.tx_leads_wpp) emptyFields.push("Leads→WPP");
    if (!inputs.tx_wpp_aovivo) emptyFields.push("WPP→AoVivo");
    if (!inputs.tx_aovivo_venda) emptyFields.push("AoVivo→Venda");

    if (emptyFields.length > 0) {
      setValidationError(`Preenche os campos: ${emptyFields.join(", ")}`);
      return;
    }

    setValidationError("");
    calculateMetrics();
  };

  const calculateMetrics = () => {
    const {
      budget,
      ticket,
      cpm,
      ctr,
      pct_organica,
      frequencia,
      tx_cliques_vp,
      tx_vp_leads,
      tx_leads_wpp,
      tx_wpp_aovivo,
      tx_aovivo_venda,
    } = inputs;

    // Cálculos base
    const alcance = (budget / cpm) * 1000 / frequencia;
    const cliques = alcance * (ctr / 100);
    const vp = cliques * (tx_cliques_vp / 100);
    const leads_pagos = vp * (tx_vp_leads / 100);

    // Multiplicador orgânico realista
    const multOrg = 2;
    const leads_organicos = leads_pagos * (pct_organica / 100) * multOrg;
    const total_leads = leads_pagos + leads_organicos;
    const leads_wpp = total_leads * (tx_leads_wpp / 100);
    const comparencia = leads_wpp * (tx_wpp_aovivo / 100);
    const vendas = Math.floor(comparencia * (tx_aovivo_venda / 100));
    const faturamento = vendas * ticket;
    const cpl = leads_pagos > 0 ? budget / leads_pagos : 0;
    const roi = budget > 0 ? (faturamento - budget) / budget : 0;

    // Cenários
    const applyMultiplier = (base: CalculatorResults, convMult: number, orgMult: number): ScenarioResults => {
      const leads_pagos_scenario = base.leads_pagos;
      const leads_organicos_scenario = (leads_pagos_scenario * (pct_organica / 100) * multOrg * orgMult);
      const total_leads_scenario = leads_pagos_scenario + leads_organicos_scenario;
      const leads_wpp_scenario = total_leads_scenario * (tx_leads_wpp / 100) * convMult;
      const comparencia_scenario = leads_wpp_scenario * (tx_wpp_aovivo / 100) * convMult;
      const vendas_scenario = Math.floor(comparencia_scenario * (tx_aovivo_venda / 100) * convMult);
      const faturamento_scenario = vendas_scenario * ticket;
      const cpl_scenario = leads_pagos_scenario > 0 ? budget / leads_pagos_scenario : 0;
      const roi_scenario = budget > 0 ? (faturamento_scenario - budget) / budget : 0;

      return {
        vendas: vendas_scenario,
        faturamento: faturamento_scenario,
        total_leads: Math.floor(total_leads_scenario),
        cpl: cpl_scenario,
        roi: roi_scenario,
      };
    };

    const baseResults: CalculatorResults = {
      alcance,
      cliques,
      vp,
      leads_pagos,
      leads_organicos,
      total_leads,
      leads_wpp,
      comparencia,
      vendas,
      faturamento,
      cpl,
      roi,
    };

    const otimista = applyMultiplier(baseResults, 1.3, 1.2);
    const realista = applyMultiplier(baseResults, 1.0, 1.0);
    const pessimista = applyMultiplier(baseResults, 0.7, 0.8);

    // Scoring
    const scores: ScoreMetrics = {
      ctr: calculateCTRScore(ctr),
      cpl: calculateCPLScore(realista.cpl),
      roi: calculateROIScore(realista.roi),
      taxa_aovivo_venda: calculateConversionScore(tx_aovivo_venda),
    };

    const final_score = Math.round(
      (scores.ctr + scores.cpl + scores.roi + scores.taxa_aovivo_venda) / 4
    );

    const classification =
      final_score >= 85
        ? "Excelente"
        : final_score >= 65
          ? "Bom"
          : final_score >= 45
            ? "Médio"
            : "Fraco";

    // Recomendações
    const recommendations: Recommendation[] = [];

    if (ctr < 1) {
      recommendations.push({
        metric: "CTR",
        message: "O teu CTR está abaixo do benchmark. Testa novos criativos com headlines mais directas.",
      });
    }

    if (realista.cpl > 30) {
      recommendations.push({
        metric: "CPL",
        message: "O custo por lead está elevado. Considera segmentar melhor o público ou testar novos formatos de anúncio.",
      });
    }

    if (realista.roi < 0.5) {
      recommendations.push({
        metric: "ROI",
        message: "O retorno está abaixo do esperado. Revê o ticket do produto ou as taxas de conversão do funil.",
      });
    }

    if (tx_aovivo_venda < 1) {
      recommendations.push({
        metric: "Taxa AoVivo→Venda",
        message: "A taxa de conversão em directo está baixa. Trabalha o argumento de venda e as objecções mais comuns.",
      });
    }

    setResults({
      base: baseResults,
      otimista,
      realista,
      pessimista,
      scores,
      final_score,
      classification,
      recommendations,
    });
  };

  const calculateCTRScore = (ctr: number): number => {
    if (ctr >= 1 && ctr <= 3) return 85;
    if (ctr < 1) return Math.max(0, 50 - (1 - ctr) * 50);
    if (ctr > 3) return Math.min(100, 85 + (ctr - 3) * 5);
    return 50;
  };

  const calculateCPLScore = (cpl: number): number => {
    if (cpl < 5) return 100;
    if (cpl <= 15) return 80;
    if (cpl <= 30) return 60;
    return Math.max(0, 30 - (cpl - 30) * 2);
  };

  const calculateROIScore = (roi: number): number => {
    if (roi > 3) return 100;
    if (roi >= 1.5) return 80;
    if (roi >= 0.5) return 60;
    return Math.max(0, roi * 100);
  };

  const calculateConversionScore = (conv: number): number => {
    if (conv > 5) return 100;
    if (conv >= 3) return 80;
    if (conv >= 1) return 60;
    return Math.max(0, conv * 30);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 85) return "bg-emerald-100 text-emerald-700 border-emerald-300";
    if (score >= 65) return "bg-blue-100 text-blue-700 border-blue-300";
    if (score >= 45) return "bg-amber-100 text-amber-700 border-amber-300";
    return "bg-red-100 text-red-700 border-red-300";
  };

  return (
    <div className="space-y-8 p-8">
      {/* Bloco 1: Dados Base */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Dados Base</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-2">Budget (€)</label>
            <input
              type="number"
              value={inputs.budget || ""}
              onChange={(e) => setInputs({ ...inputs, budget: parseFloat(e.target.value) || 0 })}
              placeholder={`ex: ${initialBudget || "1000"}`}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Ticket (€)</label>
            <input
              type="number"
              value={inputs.ticket || ""}
              onChange={(e) => setInputs({ ...inputs, ticket: parseFloat(e.target.value) || 0 })}
              placeholder={`ex: ${initialTicket || "97"}`}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">CPM (€)</label>
            <input
              type="number"
              step="0.01"
              value={inputs.cpm || ""}
              onChange={(e) => setInputs({ ...inputs, cpm: parseFloat(e.target.value) || 0 })}
              placeholder="ex: 5"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">CTR (%)</label>
            <input
              type="number"
              step="0.1"
              value={inputs.ctr || ""}
              onChange={(e) => setInputs({ ...inputs, ctr: parseFloat(e.target.value) || 0 })}
              placeholder="ex: 2"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">% Orgânica</label>
            <input
              type="number"
              step="0.1"
              value={inputs.pct_organica || ""}
              onChange={(e) => setInputs({ ...inputs, pct_organica: parseFloat(e.target.value) || 0 })}
              placeholder="ex: 20"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Frequência</label>
            <input
              type="number"
              step="0.1"
              value={inputs.frequencia || ""}
              onChange={(e) => setInputs({ ...inputs, frequencia: parseFloat(e.target.value) || 0 })}
              placeholder="ex: 1"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Bloco 2: Taxas de Conversão */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Taxas de Conversão</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="block text-sm font-medium mb-2">Cliques→VP (%)</label>
            <input
              type="number"
              step="0.1"
              value={inputs.tx_cliques_vp || ""}
              onChange={(e) => setInputs({ ...inputs, tx_cliques_vp: parseFloat(e.target.value) || 0 })}
              placeholder="ex: 50"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">VP→Leads (%)</label>
            <input
              type="number"
              step="0.1"
              value={inputs.tx_vp_leads || ""}
              onChange={(e) => setInputs({ ...inputs, tx_vp_leads: parseFloat(e.target.value) || 0 })}
              placeholder="ex: 30"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Leads→WPP (%)</label>
            <input
              type="number"
              step="0.1"
              value={inputs.tx_leads_wpp || ""}
              onChange={(e) => setInputs({ ...inputs, tx_leads_wpp: parseFloat(e.target.value) || 0 })}
              placeholder="ex: 60"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">WPP→AoVivo (%)</label>
            <input
              type="number"
              step="0.1"
              value={inputs.tx_wpp_aovivo || ""}
              onChange={(e) => setInputs({ ...inputs, tx_wpp_aovivo: parseFloat(e.target.value) || 0 })}
              placeholder="ex: 50"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">AoVivo→Venda (%)</label>
            <input
              type="number"
              step="0.1"
              value={inputs.tx_aovivo_venda || ""}
              onChange={(e) => setInputs({ ...inputs, tx_aovivo_venda: parseFloat(e.target.value) || 0 })}
              placeholder="ex: 4"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="space-y-3 mt-6">
          {validationError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
              {validationError}
            </div>
          )}
          <Button
            onClick={validateAndCalculate}
            className="w-full bg-brand hover:bg-brand/90"
          >
            Calcular
          </Button>
        </div>
      </div>

      {results && (
        <>
          {/* Score Final */}
          <div className={`rounded-lg border p-6 ${getScoreColor(results.final_score)}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Score de Potencial</h3>
                <p className="text-sm opacity-90 mt-1">Baseado em benchmarks da indústria</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{results.final_score}</div>
                <div className="text-sm font-medium mt-1">{results.classification}</div>
              </div>
            </div>
          </div>

          {/* Cenários */}
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Otimista", data: results.otimista, color: "emerald" },
              { label: "Realista", data: results.realista, color: "blue" },
              { label: "Pessimista", data: results.pessimista, color: "amber" },
            ].map(({ label, data, color }) => (
              <div key={label} className="rounded-lg border bg-card p-4">
                <h4 className="font-semibold mb-4 text-center">{label}</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Faturamento</span>
                    <span className="font-medium">{formatCurrency(data.faturamento)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vendas</span>
                    <span className="font-medium">{data.vendas}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Leads</span>
                    <span className="font-medium">{data.total_leads}</span>
                  </div>
                  <div className="flex justify-between border-t pt-3">
                    <span className="text-muted-foreground">CPL</span>
                    <span className="font-medium">{formatCurrency(data.cpl)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ROI</span>
                    <span className={`font-medium ${data.roi > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {(data.roi * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recomendações */}
          {results.recommendations.length > 0 && (
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="size-5 text-amber-600" />
                <h3 className="font-semibold">Recomendações</h3>
              </div>
              <div className="space-y-3">
                {results.recommendations.map((rec, idx) => (
                  <div key={idx} className="rounded-lg bg-amber-50 p-3 text-sm">
                    <div className="font-medium text-amber-900 mb-1">{rec.metric}</div>
                    <p className="text-amber-800">{rec.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Análise de Benchmarks */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 font-semibold flex items-center gap-2">
              <TrendingUp className="size-5" />
              Análise de Benchmarks
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">CTR Actual vs Benchmark</div>
                <div className="mt-1 text-lg font-medium">
                  <span className="flex items-center gap-1">
                    {inputs.ctr.toFixed(2)}%
                    {inputs.ctr >= 1 && inputs.ctr <= 3
                      ? <Check className="size-4 text-green-600" />
                      : <AlertTriangle className="size-4 text-amber-500" />}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Benchmark: 1–3%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">CPL Actual vs Benchmark</div>
                <div className="mt-1 text-lg font-medium">
                  <span className="flex items-center gap-1">
                    {formatCurrency(results.realista.cpl)}
                    {results.realista.cpl < 5
                      ? <Check className="size-4 text-green-600" />
                      : <AlertTriangle className="size-4 text-amber-500" />}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Benchmark: &lt;5€ excelente</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">ROI Actual vs Benchmark</div>
                <div className="mt-1 text-lg font-medium">
                  <span className="flex items-center gap-1">
                    {(results.realista.roi * 100).toFixed(0)}%
                    {results.realista.roi > 3
                      ? <Check className="size-4 text-green-600" />
                      : <AlertTriangle className="size-4 text-amber-500" />}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Benchmark: &gt;3× excelente</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Taxa AoVivo→Venda vs Benchmark</div>
                <div className="mt-1 text-lg font-medium">
                  <span className="flex items-center gap-1">
                    {inputs.tx_aovivo_venda.toFixed(2)}%
                    {inputs.tx_aovivo_venda > 5
                      ? <Check className="size-4 text-green-600" />
                      : <AlertTriangle className="size-4 text-amber-500" />}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Benchmark: &gt;5% excelente</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
