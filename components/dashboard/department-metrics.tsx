import Link from "next/link";

interface DepartmentCardProps {
  title: string;
  href: string;
  rows: { label: string; value: number; href?: string }[];
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
        {/* Vendas — card customizado com links individuais por métrica */}
        <div className="bg-card px-4 py-4 md:px-6 md:py-5">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Vendas
          </p>
          <div className="space-y-3">
            <Link
              href="/tarefas"
              className="flex items-center justify-between gap-3 hover:text-foreground transition-colors"
            >
              <span className="text-sm text-muted-foreground">Tarefas abertas</span>
              <span className="text-sm font-medium tracking-[-0.02em]">{vendas.openTasks}</span>
            </Link>
            <Link
              href="/lancamentos"
              className="flex items-center justify-between gap-3 hover:text-foreground transition-colors"
            >
              <span className="text-sm text-muted-foreground">Lançamentos ativos</span>
              <span className="text-sm font-medium tracking-[-0.02em]">{vendas.activeLaunches}</span>
            </Link>
            <Link
              href="/clientes"
              className="flex items-center justify-between gap-3 hover:text-foreground transition-colors"
            >
              <span className="text-sm text-muted-foreground">Clientes ativos</span>
              <span className="text-sm font-medium tracking-[-0.02em]">{vendas.activeClients}</span>
            </Link>
          </div>
        </div>

        {/* Marketing / Tráfego */}
        <DepartmentCard
          title="Marketing / Tráfego"
          href="/marketing"
          rows={[
            { label: "Tarefas abertas", value: marketing.openTasks },
            { label: "Conteúdos publicados (mês)", value: marketing.contentsPublished },
          ]}
        />

        {/* Operações / Design */}
        <DepartmentCard
          title="Operações / Design"
          href="/lancamentos"
          rows={[
            { label: "Tarefas abertas", value: operacoesDesign.openTasks },
            { label: "Projetos entregues (mês)", value: operacoesDesign.launchesDelivered },
          ]}
        />

        {/* Desenvolvimento */}
        <DepartmentCard
          title="Desenvolvimento"
          href="/tarefas"
          rows={[{ label: "Tarefas abertas", value: desenvolvimento.openTasks }]}
        />
      </div>
    </div>
  );
}
