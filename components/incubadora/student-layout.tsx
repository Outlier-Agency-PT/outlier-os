"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

interface StudentLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
}

const sections = [
  { id: "metodo", label: "Método" },
  { id: "ferramentas", label: "Ferramentas" },
  { id: "assistentes", label: "Assistentes" },
];

export function StudentLayout({ children, userName, userEmail }: StudentLayoutProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const activeSection = searchParams.get("section") || "metodo";

  const handleSectionChange = (sectionId: string) => {
    router.push(`/incubadora?section=${sectionId}`);
  };

  const handleLogout = async () => {
    const supabase = await createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const logoSrc = theme === "dark"
    ? "/outtemaescuro.png"
    : "/outtemaclaro.png";

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: "#F8F8F8" }}>
      {/* Header */}
      <header className="border-b border-border bg-white sticky top-0 z-50">
        <div className="flex items-center justify-between h-16 px-6">
          {/* Logo + Título */}
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8">
              <Image
                src={logoSrc}
                alt="Outlier"
                fill
                className="object-contain"
              />
            </div>
            <h1 className="text-lg font-semibold" style={{ fontFamily: "var(--font-sans)" }}>
              Incubadora
            </h1>
          </div>

          {/* Navegação */}
          <nav className="flex items-center gap-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => handleSectionChange(section.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? "border-b-2 border-brand text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>

          {/* Avatar + Logout */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              {userName && <p className="text-sm font-medium">{userName}</p>}
              {userEmail && <p className="text-xs text-muted-foreground">{userEmail}</p>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
