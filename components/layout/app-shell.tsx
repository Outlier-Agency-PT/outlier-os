"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";

export function AppShell({
  children,
  userEmail,
  userName,
}: {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-x-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar userEmail={userEmail} userName={userName} />
      </div>

      {/* Mobile top header */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center border-b border-border bg-background px-4 md:hidden">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          className="flex items-center justify-center rounded-md p-1 text-foreground transition-colors hover:bg-accent"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <Sidebar userEmail={userEmail} userName={userName} />
          </div>
        </>
      )}

      {/* pt-14 compensa o header fixo no mobile; em desktop é 0 */}
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-background pt-14 md:pt-0">{children}</main>
    </div>
  );
}
