"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  lastSyncAt: string | null;
}

export function SyncFinanceiroButton({ lastSyncAt }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleSync() {
    setLoading(true);
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch("/api/sync-financial-clientes", { method: "POST" }),
        fetch("/api/sync-financial-fluxo", { method: "POST" }),
        fetch("/api/sync-financial-pagamentos", { method: "POST" }),
      ]);
      const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);
      const ok = d1.ok && d2.ok && d3.ok;
      if (ok) {
        toast.success("Dados sincronizados com sucesso");
        window.location.reload();
      } else {
        const err = [d1, d2, d3].find((d) => !d.ok)?.error ?? "Erro desconhecido";
        toast.error("Erro na sincronização: " + err);
      }
    } catch {
      toast.error("Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" onClick={handleSync} disabled={loading} className="gap-2">
        <RefreshCw className={loading ? "animate-spin" : ""} size={15} />
        {loading ? "A sincronizar..." : "Sincronizar Dados"}
      </Button>
      {lastSyncAt && (
        <span className="text-[11px] text-muted-foreground">
          Última sincronização: {new Date(lastSyncAt).toLocaleString("pt-PT")}
        </span>
      )}
    </div>
  );
}
