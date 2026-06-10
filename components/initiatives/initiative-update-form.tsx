"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { postInitiativeUpdateAction } from "@/lib/actions/initiatives";
import { toast } from "sonner";

export function InitiativeUpdateForm({ initiativeId }: { initiativeId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!content.trim()) return;
    startTransition(async () => {
      const r = await postInitiativeUpdateAction(initiativeId, content);
      if ("error" in r && r.error) {
        toast.error("Erro a publicar");
        return;
      }
      setContent("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 border-b pb-4">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={2}
        placeholder="Update curto sobre esta iniciativa... (Ctrl+Enter envia)"
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submit();
        }}
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={submit} disabled={isPending || !content.trim()}>
          <Send className="size-3.5" />
          Publicar
        </Button>
      </div>
    </div>
  );
}
