"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props {
  clientId: string;
}

export function ShareFeedbackForm({ clientId }: Props) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);

    const res = await fetch("/api/share/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, name: name || "Cliente", body }),
    });

    setLoading(false);
    if (!res.ok) {
      toast.error("Falha ao enviar feedback");
      return;
    }
    toast.success("Feedback enviado. Obrigado!");
    setBody("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="name">O teu nome</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Opcional"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="body">Mensagem</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={3}
          placeholder="Escreve o teu feedback ou pergunta..."
        />
      </div>
      <Button type="submit" disabled={loading || !body.trim()}>
        {loading ? "A enviar..." : "Enviar feedback"}
      </Button>
    </form>
  );
}
