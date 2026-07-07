import Link from "next/link";

interface DepartmentCardProps {
  title: string;
  href: string;
  rows: { label: string; value: number }[];
}

function DepartmentCard({ title, href, rows }: DepartmentCardProps) {
  return (
    <Link
      href={href}
      className="block cursor-pointer bg-card px-4 py-4 transition-colors hover:bg-accent/50 md:px-6 md:py-5"
    >
      <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className="text-lg font-light tabular-nums tracking-[-0.02em]">{row.value}</span>
          </div>
        ))}
      </div>
    </Link>
  );
}

interface DepartmentMetricsProps {
  vendas: { openTasks: number; activeLaunches: number; activeClients: number };
  marketing: { openTasks: number; contentsPublished: number };
  operacoesDesign: { openTasks: number; launchesDelivered: number };
  desenvolvimento: { openTasks: number };
}

export function DepartmentMetrics({
  vendas,
  marketing,
  operacoesDesign,
  desenvolvimento,
}: DepartmentMetricsProps) {
  return (
    <div>
      <div className="border-b border-border pb-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Métricas por Departamento
        </h2>
      </div>
      <div className="mt-4 grid w-full grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        <DepartmentCard
          title="Vendas"
          href="/tarefas"
          rows={[
            { label: "Tarefas abertas", value: vendas.openTasks },
            { label: "Lançamentos ativos", value: vendas.activeLaunches },
            { label: "Clientes ativos", value: vendas.activeClients },
          ]}
        />
        <DepartmentCard
          title="Marketing / Tráfego"
          href="/tarefas"
          rows={[
            { label: "Tarefas abertas", value: marketing.openTasks },
            { label: "Conteúdos publicados (mês)", value: marketing.contentsPublished },
          ]}
        />
        <DepartmentCard
          title="Operações / Design"
          href="/tarefas"
          rows={[
            { label: "Tarefas abertas", value: operacoesDesign.openTasks },
            { label: "Projetos entregues (mês)", value: operacoesDesign.launchesDelivered },
          ]}
        />
        <DepartmentCard
          title="Desenvolvimento"
          href="/tarefas"
          rows={[{ label: "Tarefas abertas", value: desenvolvimento.openTasks }]}
        />
      </div>
    </div>
  );
}
