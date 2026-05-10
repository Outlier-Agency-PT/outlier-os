"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  updateReportContentAction,
  publishReportAction,
  unpublishReportAction,
} from "@/lib/actions/reports";
import { toast } from "sonner";

interface Props {
  reportId: string;
  initialContent: string;
  status: "rascunho" | "publicado";
}

export function ReportEditor({ reportId, initialContent, status }: Props) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  async function save() {
    setSaving(true);
    const result = await updateReportContentAction(reportId, content);
    setSaving(false);
    if ("error" in result && result.error) {
      toast.error("Falha ao guardar");
      return;
    }
    toast.success("Guardado");
    setEditing(false);
    router.refresh();
  }

  async function togglePublish() {
    const action = status === "publicado" ? unpublishReportAction : publishReportAction;
    const result = await action(reportId);
    if ("error" in result && result.error) {
      toast.error("Erro");
      return;
    }
    toast.success(status === "publicado" ? "Despublicado" : "Publicado");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-3 flex items-center justify-end gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setContent(initialContent); }}>
                Cancelar
              </Button>
              <Button onClick={save} disabled={saving}>{saving ? "A guardar..." : "Guardar"}</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>Editar</Button>
              <Button onClick={togglePublish}>
                {status === "publicado" ? "Despublicar" : "Publicar"}
              </Button>
            </>
          )}
        </div>
        {editing ? (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="font-mono text-sm"
          />
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-sm">{content}</pre>
        )}
      </CardContent>
    </Card>
  );
}
