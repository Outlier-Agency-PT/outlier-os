"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SyncSheetsButton() {
  const [loading, setLoading] = useState(false);

  async function handleSync() {
    setLoading(true);
    try {
      const res = await fetch("/api/sync-sheets", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Sincronizado: ${data.updated} actualizados, ${data.created} criados`);
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
      {loading ? "A sincronizar..." : "Sincronizar Google Sheets"}
    </Button>
  );
}
