import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { DecisionData } from "@/lib/actions/processes";

interface Props {
  data: DecisionData;
}

export function DecisionView({ data }: Props) {
  const fields = [
    { label: "Contexto da decisão", value: data.context },
    { label: "Alternativas consideradas", value: data.alternatives },
    { label: "Quem decidiu", value: data.decided_by_name || "—" },
    {
      label: "Data da decisão",
      value: data.decided_at
        ? format(new Date(data.decided_at), "d 'de' MMMM 'de' yyyy", { locale: pt })
        : "—",
    },
    { label: "Impacto esperado", value: data.impact },
  ];

  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.label} className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {f.label}
          </p>
          <p className="text-sm whitespace-pre-wrap">{f.value}</p>
        </div>
      ))}
    </div>
  );
}
