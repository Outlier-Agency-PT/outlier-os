# Outlier OS

Sistema operacional interno da Outlier Agency. Substitui ClickUp + Task Manager amador + plataforma do prestador externo.

## Stack

- **Next.js 15** (App Router, RSC, TypeScript)
- **Supabase** (Postgres + Auth + Realtime + Storage + Edge Functions)
- **shadcn/ui** + Tailwind CSS
- **TanStack Query** (server state) + Zustand (UI state)
- **react-hook-form** + zod (forms)
- **TipTap** (editor rich-text para Processos)
- **Recharts** (gráficos P&L)
- **dnd-kit** (drag-and-drop kanbans)
- **TanStack Table** (tabelas)

## Setup local

```bash
# 1. Instalar dependências
npm install

# 2. Variáveis de ambiente
cp .env.example .env.local
# preencher com chaves do Supabase

# 3. Setup Supabase (precisa de Docker para local, ou usar projeto cloud)
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase db push    # aplica migrations

# 4. Gerar tipos TypeScript da BD
npm run db:types

# 5. Arrancar dev server
npm run dev
```

Abre http://localhost:3000

## Estrutura

```
outlier-os/
├── app/
│   ├── (auth)/login         # Login
│   ├── (app)/               # Área autenticada
│   │   ├── dashboard
│   │   ├── clientes
│   │   ├── tarefas
│   │   ├── lancamentos
│   │   ├── conteudo
│   │   ├── incubadora
│   │   ├── relatorios
│   │   ├── financeiro
│   │   ├── okrs
│   │   ├── processos
│   │   ├── reunioes
│   │   ├── equipa
│   │   └── configuracoes
│   └── (public)/share/[token]   # Dashboard cliente partilhado
├── components/              # UI reutilizável
├── lib/                     # Utilities + Supabase clients
├── supabase/migrations/     # SQL migrations (24 tabelas)
└── types/database.ts        # Tipos gerados do schema
```

## Sprints

- **Sprint 1** — Foundation + Clientes + Tarefas + Equipa (substitui Task Manager)
- **Sprint 2** — Lançamentos + Conteúdo + Dashboard partilhado
- **Sprint 3** — Financeiro + OKRs + Relatórios
- **Sprint 4** — Incubadora + Processos + Reuniões + Polish

Ver [SPEC_TECNICA.md](../PLATAFORMA%20GESTÃO%20TAREFAS%20OUTLIER/SPEC_TECNICA.md) para detalhes.
