"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  getStudentSalesPageAction,
  updateStudentSalesPageAction,
} from "@/lib/actions/students";

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function StudentSalesPage() {
  const [salesPageUrl, setSalesPageUrl] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStudentSalesPageAction().then((data) => {
      if (data) {
        setSalesPageUrl(data.sales_page_url);
        setPublishedAt(data.sales_page_published_at);
        setInputValue(data.sales_page_url ?? "");
      }
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setUrlError("Insere um URL para a tua página.");
      return;
    }
    if (!isValidUrl(trimmed)) {
      setUrlError("URL inválido. Deve começar com https:// ou http://");
      return;
    }
    setUrlError("");
    setSaving(true);
    const result = await updateStudentSalesPageAction(trimmed);
    setSaving(false);
    if ("error" in result && result.error) {
      toast.error(result.error as string);
    } else {
      const isFirst = !salesPageUrl;
      setSalesPageUrl(trimmed);
      if (isFirst) setPublishedAt(new Date().toISOString());
      setEditing(false);
      toast.success(isFirst ? "Página publicada! Badge desbloqueado em breve." : "URL actualizado.");
    }
  }

  if (loading) return null;

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Globe className="size-4 shrink-0 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">Página de Vendas</h3>
            {publishedAt && !editing && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Publicada em{" "}
                {new Date(publishedAt).toLocaleDateString("pt-PT", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </div>

        {!editing && (
          <Button
            size="sm"
            variant={salesPageUrl ? "outline" : "default"}
            onClick={() => {
              setInputValue(salesPageUrl ?? "");
              setUrlError("");
              setEditing(true);
            }}
          >
            {salesPageUrl ? "Editar URL" : "Adicionar página"}
          </Button>
        )}
      </div>

      {/* URL existente — leitura */}
      {!editing && salesPageUrl && (
        <div className="mt-3">
          <a
            href={salesPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            <span className="max-w-xs truncate">{salesPageUrl}</span>
            <ExternalLink className="size-3 shrink-0" />
          </a>
        </div>
      )}

      {/* Formulário de edição */}
      {editing && (
        <div className="mt-4 space-y-2">
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (urlError) setUrlError("");
            }}
            placeholder="https://minhaloja.com/pagina-vendas"
            className={urlError ? "border-destructive" : ""}
            autoFocus
          />
          {urlError && <p className="text-xs text-destructive">{urlError}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "A guardar..." : salesPageUrl ? "Guardar" : "Publicar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(false);
                setUrlError("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {!editing && !salesPageUrl && (
        <p className="mt-2 text-sm text-muted-foreground">
          Ainda não tens uma página de vendas registada.
        </p>
      )}
    </div>
  );
}
