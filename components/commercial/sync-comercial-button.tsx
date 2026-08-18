"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SyncComercialButton() {
  const [loading, setLoading] = useState(false);

  async function handleSync() {
    setLoading(true);
    try {
      const res = await fetch("/api/sync-sheets-comercial", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        const s = data.synced;
        const closer = (s.closer_incubadora ?? 0) + (s.closer_servicos ?? 0);
        const sdr = (s.sdr_incubadora ?? 0) + (s.sdr_servicos ?? 0);
        toast.success(
          `Sincronizado: ${closer} closer, ${sdr} SDR, ${s.bdr} BDR, ${s.call_tracking} call tracking, ${s.vendas_funnil} vendas, ${s.roas} ROAS`
        );
        window.location.reload();
      } else {
        toast.error("Erro na sincronização: " + data.error);
      }
    } catch {
      toast.error("Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleSync} disabled={loading} className="gap-2">
      <RefreshCw className={loading ? "animate-spin" : ""} size={15} />
      {loading ? "A sincronizar..." : "Sincronizar Comercial & Marketing"}
    </Button>
  );
}
