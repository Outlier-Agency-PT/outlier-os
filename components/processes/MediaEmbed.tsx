"use client";

import { useState } from "react";
import { AlertCircle, ExternalLink, Maximize2, Minimize2 } from "lucide-react";

type EmbedType = "video" | "loom" | "drive-file" | "drive-doc";

interface Props {
  src: string;
  type: EmbedType;
  title?: string;
}

function extractLoomId(url: string): string {
  const match = url.match(/loom\.com\/share\/([^?#/]+)/);
  return match?.[1] ?? "";
}

function extractDriveFileId(url: string): string {
  const match = url.match(/\/d\/([^/]+)\//);
  return match?.[1] ?? "";
}

function buildDriveDocEmbedUrl(url: string): string {
  if (url.includes("docs.google.com/spreadsheets")) {
    const base = url.split("/edit")[0].split("/pubhtml")[0];
    return `${base}/pubhtml?embedded=true`;
  }
  if (url.includes("docs.google.com/presentation")) {
    const base = url.split("/edit")[0].split("/embed")[0];
    return `${base}/embed?start=false&loop=false`;
  }
  const base = url.split("/edit")[0].split("/pub")[0];
  return `${base}/pub?embedded=true`;
}

function ErrorState({ message, src }: { message: string; src: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      <AlertCircle className="size-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        className="shrink-0 text-xs border border-border rounded px-2 py-1 hover:bg-muted transition-colors"
        onClick={() => window.open(src, "_blank", "noopener,noreferrer")}
      >
        Abrir
        <ExternalLink className="inline ml-1 size-3" />
      </button>
    </div>
  );
}

interface EmbedShellProps {
  src: string;
  embedSrc: string;
  label: string;
  errored: boolean;
  errorMessage: string;
  onError: () => void;
}

function EmbedShell({ src, embedSrc, label, errored, errorMessage, onError }: EmbedShellProps) {
  const [expanded, setExpanded] = useState(false);

  if (errored) {
    return <ErrorState message={errorMessage} src={src} />;
  }

  return (
    <div
      className={`relative mx-auto rounded-lg overflow-hidden border border-border ${
        expanded ? "w-full" : "w-full max-w-2xl"
      }`}
    >
      <iframe
        src={embedSrc}
        className={`w-full block ${expanded ? "aspect-video" : "h-[240px]"}`}
        allowFullScreen
        frameBorder={0}
        onError={onError}
      />
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-1.5 bg-background/80 backdrop-blur-sm border-t border-border/50">
        <span className="text-xs text-muted-foreground truncate">{label}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center justify-center rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={expanded ? "Minimizar" : "Expandir"}
          >
            {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => window.open(src, "_blank", "noopener,noreferrer")}
            className="flex items-center justify-center rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Abrir em nova aba"
          >
            <ExternalLink className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function MediaEmbed({ src, type, title }: Props) {
  const [errored, setErrored] = useState(false);

  if (type === "video") {
    return (
      <div className="my-4">
        {errored ? (
          <ErrorState message="Vídeo não disponível" src={src} />
        ) : (
          <video
            controls
            className="w-full rounded-lg max-h-[320px]"
            onError={() => setErrored(true)}
          >
            <source src={src} />
          </video>
        )}
        {title && (
          <span className="block text-sm text-muted-foreground mt-1">{title}</span>
        )}
      </div>
    );
  }

  if (type === "loom") {
    const videoId = extractLoomId(src);
    return (
      <div className="my-4">
        <EmbedShell
          src={src}
          embedSrc={`https://www.loom.com/embed/${videoId}`}
          label={title ?? "Vídeo"}
          errored={errored}
          errorMessage="Não foi possível carregar o vídeo"
          onError={() => setErrored(true)}
        />
      </div>
    );
  }

  if (type === "drive-file") {
    const fileId = extractDriveFileId(src);
    return (
      <div className="my-4">
        <EmbedShell
          src={src}
          embedSrc={`https://drive.google.com/file/d/${fileId}/preview`}
          label={title ?? "Ficheiro"}
          errored={errored}
          errorMessage="Não foi possível carregar o ficheiro"
          onError={() => setErrored(true)}
        />
      </div>
    );
  }

  // drive-doc
  return (
    <div className="my-4">
      <EmbedShell
        src={src}
        embedSrc={buildDriveDocEmbedUrl(src)}
        label={title ?? "Documento"}
        errored={errored}
        errorMessage="Não foi possível carregar o documento"
        onError={() => setErrored(true)}
      />
    </div>
  );
}
