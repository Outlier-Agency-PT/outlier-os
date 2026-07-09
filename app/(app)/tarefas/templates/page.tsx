import { PageHeader } from "@/components/layout/page-header";
import { TemplatesManager } from "@/components/tasks/templates-manager";
import { getTaskTemplates, getTaskTemplateCategories } from "@/lib/queries/templates";
import { getTaskSpaces } from "@/lib/queries/tasks";
import { getTeamMembers } from "@/lib/queries/team";
import { getStatuses } from "@/lib/queries/statuses";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const [templates, spaces, members, categories, statuses] = await Promise.all([
    getTaskTemplates(),
    getTaskSpaces(),
    getTeamMembers(),
    getTaskTemplateCategories(),
    getStatuses("task_statuses"),
  ]);

  return (
    <>
      <PageHeader
        title="Templates de Tarefas"
        description={`${templates.length} ${templates.length === 1 ? "template" : "templates"}`}
      />
      <TemplatesManager
        templates={templates}
        spaces={spaces}
        members={members.map((m) => ({ id: m.id, label: m.full_name }))}
        categories={categories}
        statuses={statuses.map((s) => ({ id: s.id, label: s.label, color: s.color }))}
      />
    </>
  );
}
