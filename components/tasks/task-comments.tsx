"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AvatarDisplay } from "@/components/avatar-display";
import { postTaskCommentAction } from "@/lib/actions/tasks";
import { formatRelative } from "@/lib/utils";
import { toast } from "sonner";
import type { TaskComment } from "@/lib/queries/task-detail";

interface Props {
  taskId: string;
  comments: TaskComment[];
}

export function TaskComments({ taskId, comments }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!body.trim()) return;
    startTransition(async () => {
      const r = await postTaskCommentAction(taskId, body);
      if ("error" in r && r.error) {
        toast.error("Erro a comentar");
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comentários ({comments.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments.length > 0 && (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="flex items-start gap-3">
                <AvatarDisplay name={c.author?.full_name ?? "?"} size="sm" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{c.author?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{formatRelative(c.created_at)}</p>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-2 border-t pt-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder="Escreve um comentário... (Ctrl+Enter envia)"
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submit();
            }}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={submit} disabled={isPending || !body.trim()}>
              <Send className="size-3.5" />
              Enviar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
