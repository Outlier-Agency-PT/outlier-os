"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { updateWhiteboardAction } from "@/lib/actions/whiteboards";
import type { Whiteboard } from "@/lib/queries/whiteboards";

// Excalidraw is browser-only — no SSR
const Excalidraw = dynamic(
  () =>
    import("@excalidraw/excalidraw").then((mod) => ({
      default: mod.Excalidraw,
    })),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">A carregar…</div> },
);

const DEBOUNCE_MS = 2000;

export function WhiteboardEditor({ whiteboard }: { whiteboard: Whiteboard }) {
  const [title, setTitle]           = useState(whiteboard.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [saved, setSaved]           = useState(false);
  const timerRef                    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIndicatorRef           = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const excalidrawAPIRef            = useRef<any>(null);

  // Show "Guardado" badge briefly after each save
  function flashSaved() {
    setSaved(true);
    if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current);
    savedIndicatorRef.current = setTimeout(() => setSaved(false), 2500);
  }

  // Debounced save of canvas data
  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: any, appState: any, files: any) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        // strip fields that must not be persisted: Maps break JSON, dimensions are recalculated on load
        const {
          collaborators: _c,
          height: _h,
          width: _w,
          offsetTop: _ot,
          offsetLeft: _ol,
          isLoading: _il,
          ...appStateToSave
        } = appState;
        await updateWhiteboardAction(whiteboard.id, {
          elements,
          appState: appStateToSave,
          files,
        });
        flashSaved();
      }, DEBOUNCE_MS);
    },
    [whiteboard.id],
  );

  // Save title on Enter or blur
  async function saveTitle(newTitle: string) {
    const trimmed = newTitle.trim() || whiteboard.title;
    setTitle(trimmed);
    setEditingTitle(false);
    if (trimmed !== title) {
      await updateWhiteboardAction(whiteboard.id, whiteboard.data, trimmed);
      flashSaved();
    }
  }

  // Close library sidebar after mount — Excalidraw 0.18 opens it by default
  useEffect(() => {
    if (excalidrawAPIRef.current) {
      excalidrawAPIRef.current.updateScene({ appState: { openSidebar: null } });
    }
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current);
    };
  }, []);

  // Restore initial Excalidraw state from saved data
  const rawData = whiteboard.data as {
    elements?: unknown;
    appState?: Record<string, unknown>;
    files?: unknown;
  };

  // Guard against corrupted data (e.g. library shapes saved as elements)
  const safeElements = Array.isArray(rawData?.elements) ? rawData.elements : [];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        <Link
          href="/whiteboard"
          className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span className="text-sm">Voltar</span>
        </Link>

        <div className="mx-2 h-4 w-px bg-border" />

        {/* Editable title */}
        {editingTitle ? (
          <input
            autoFocus
            className="h-7 flex-1 border-b border-[#A12B2B] bg-transparent text-sm font-semibold outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={(e) => saveTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle(title);
              if (e.key === "Escape") { setTitle(whiteboard.title); setEditingTitle(false); }
            }}
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="text-sm font-semibold hover:text-muted-foreground transition-colors"
            title="Clica para editar o título"
          >
            {title}
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
              <Check className="size-3" />
              Guardado
            </span>
          )}
        </div>
      </div>

      {/* Canvas — fills remaining height */}
      <div className="relative flex-1 overflow-hidden">
        <Excalidraw
          initialData={{
            elements: safeElements as never[],
            appState: {
              ...(rawData.appState ?? {}),
              viewBackgroundColor: "#F8F8F8",
              showWelcomeScreen: false,
              // collaborators must always be a Map — plain objects from JSON break Excalidraw
              collaborators: new Map(),
              openMenu: null,
              openPopup: null,
              openDialog: null,
              openSidebar: null,
              defaultSidebarDockedPreference: false,
            },
            files: (rawData.files as never) ?? null,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          excalidrawAPI={(api: any) => { excalidrawAPIRef.current = api; }}
          UIOptions={{ dockedSidebarBreakpoint: 0 }}
          onChange={handleChange}
          theme="light"
          langCode="pt-PT"
        />
      </div>
    </div>
  );
}
