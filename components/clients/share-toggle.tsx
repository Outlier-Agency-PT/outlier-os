"use client";

import { useState } from "react";
import { Copy, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { togglePublicShareAction } from "@/lib/actions/clients";
import { toast } from "sonner";

interface Props {
  clientId: string;
  shareToken: string | null;
  enabled: boolean;
  appUrl: string;
}

export function ShareToggle({ clientId, shareToken, enabled: initialEnabled, appUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = shareToken ? `${appUrl}/share/${shareToken}` : "";

  async function toggle(newValue: boolean) {
    setLoading(true);
    const result = await togglePublicShareAction(clientId, newValue);
    setLoading(false);
    if ("error" in result && result.error) {
      toast.error("Falha ao alterar partilha");
      return;
    }
    setEnabled(newValue);
    toast.success(newValue ? "Partilha ativada" : "Partilha desativada");
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copiado");
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Share2 />
        Partilhar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dashboard partilhado</DialogTitle>
            <DialogDescription>
              Permite que o cliente aceda a um dashboard read-only sem login.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Partilha pública</p>
                <p className="text-xs text-muted-foreground">
                  {enabled ? "Ativa — qualquer pessoa com o link acede" : "Inativa"}
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={toggle} disabled={loading} />
            </div>

            {enabled && url && (
              <div className="space-y-1.5">
                <Label htmlFor="url">URL de partilha</Label>
                <div className="flex items-center gap-2">
                  <Input id="url" value={url} readOnly className="font-mono text-xs" />
                  <Button size="icon" variant="outline" onClick={copyUrl}>
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Envia este link ao cliente. Mostra tarefas em curso, conteúdos publicados,
                  relatórios e form de feedback.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
