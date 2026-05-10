import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportEditor } from "@/components/reports/report-editor";
import { getReportById } from "@/lib/queries/reports";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { id } = await params;
  const report = await getReportById(id);
  if (!report) notFound();

  return (
    <>
      <PageHeader
        title={`Relatório ${report.type === "semanal" ? "Semanal" : "Mensal"}`}
        description={
          <span className="flex items-center gap-2 text-sm">
            <span>{report.client?.name ?? "—"}</span>
            <span>·</span>
            <span>{formatDate(report.period_start)} → {formatDate(report.period_end)}</span>
            <Badge variant={report.status === "publicado" ? "default" : "secondary"}>
              {report.status}
            </Badge>
          </span>
        }
        actions={
          <Button variant="outline" asChild>
            <Link href="/relatorios">
              <ArrowLeft />
              Voltar
            </Link>
          </Button>
        }
      />
      <div className="space-y-6 p-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Object.entries(report.kpis).map(([k, v]) => (
            <Card key={k}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{v}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {k.replace(/_/g, " ")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <ReportEditor
          reportId={report.id}
          initialContent={report.content_md ?? ""}
          status={report.status}
        />
      </div>
    </>
  );
}
