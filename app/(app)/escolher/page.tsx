import Link from "next/link";

export default function EscolherPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bem-vindo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tens acesso a duas áreas. Escolhe onde queres entrar.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/incubadora"
          className="inline-flex items-center justify-center rounded-md border border-border bg-card px-8 py-4 text-sm font-medium transition-colors hover:bg-accent"
        >
          Incubadora
        </Link>
        <Link
          href="/mentoria"
          className="inline-flex items-center justify-center rounded-md border border-border bg-card px-8 py-4 text-sm font-medium transition-colors hover:bg-accent"
        >
          Mentoria
        </Link>
      </div>
    </div>
  );
}
