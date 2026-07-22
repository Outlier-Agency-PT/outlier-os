# Documentação Técnica — Outlier OS

**Data:** 2026-07-20  
**Versão do schema:** migration 0037

---

## Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Schema da Base de Dados](#2-schema-da-base-de-dados)
3. [Módulos e Funcionalidades](#3-módulos-e-funcionalidades)
4. [Autenticação e Permissões (RBAC)](#4-autenticação-e-permissões-rbac)
5. [Bugs e Decisões Técnicas](#5-bugs-e-decisões-técnicas)
6. [Variáveis de Ambiente](#6-variáveis-de-ambiente)
7. [O Que Falta / Próximos Passos](#7-o-que-falta--próximos-passos)

---

## 1. Visão Geral da Arquitetura

### Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router) | ^15.1.4 |
| Runtime | React | ^19.0.0 |
| Linguagem | TypeScript | ^5.7.3 |
| Base de dados | Supabase (PostgreSQL) | — |
| Auth | Supabase Auth | @supabase/ssr ^0.5.2 |
| ORM / queries | Supabase JS client (query builder) | ^2.47.10 |
| UI primitivos | Radix UI | vários |
| Estilos | Tailwind CSS | ^3.4.17 |
| Formulários | React Hook Form + Zod | ^7.54.2 / ^3.24.1 |
| Estado cliente | Zustand | ^5.0.2 |
| Tabelas | TanStack Table | ^8.20.6 |
| Drag & Drop | dnd-kit | ^6.3.1 |
| Editor rich text | TipTap | ^2.11.2 |
| Whiteboard | Excalidraw | ^0.18.1 |
| Calendário | react-day-picker | ^9.5.0 |
| Gráficos | Recharts | ^2.15.0 |
| Datas | date-fns | ^4.1.0 |
| PDF export | jsPDF + jsPDF-autoTable | ^4.2.1 |
| Notificações toast | Sonner | ^1.7.1 |
| Comando palette | cmdk | ^1.0.4 |
| Deploy | Vercel | ^53.3.2 |

### Estrutura de Pastas

```
outlier-os/
├── app/                          # Next.js App Router
│   ├── (auth)/login/             # Rota pública de autenticação
│   ├── (app)/                    # Grupo de rotas protegidas (requer auth)
│   │   ├── layout.tsx            # Layout principal: verifica auth, monta AppShell ou view de aluno
│   │   ├── dashboard/            # Dashboard (admin vs. colaborador)
│   │   ├── tarefas/              # Módulo de tarefas (board, calendário, templates, detalhe)
│   │   ├── clientes/             # CRM de clientes
│   │   ├── lancamentos/          # Gestão de lançamentos de marketing
│   │   ├── conteudo/             # Planeamento de conteúdo
│   │   ├── incubadora/           # Programa de incubação (coach + aluno)
│   │   │   └── suporte/          # Dashboard de tickets de suporte (staff only)
│   │   ├── whiteboard/           # Whiteboards (Excalidraw)
│   │   ├── relatorios/           # Relatórios de clientes
│   │   ├── financeiro/           # Controlo financeiro
│   │   ├── okrs/                 # OKRs trimestrais
│   │   ├── processos/            # SOPs / processos internos
│   │   ├── reunioes/             # Gestão de reuniões
│   │   ├── equipa/               # Gestão da equipa
│   │   ├── iniciativas/          # Iniciativas estratégicas
│   │   ├── decisoes/             # Queue de decisões do CEO
│   │   ├── mentorias/            # Programas de mentoria externos
│   │   ├── mentoria/             # Vista do aluno (área pessoal de mentoria)
│   │   ├── configuracoes/        # Configurações do sistema
│   │   └── escolher/             # Onboarding / seleção de caminho
│   ├── api/                      # API Routes (REST)
│   │   ├── share/feedback/       # Endpoint público para feedback de clientes
│   │   ├── incubadora/lessons/   # Endpoint para listar lições por módulo
│   │   ├── checkpoints/status/   # Estado dos checkpoints semanais (admin only)
│   │   └── cron/                 # Cron jobs (Vercel Cron / n8n)
│   │       ├── checkpoint-reminder/  # Notifica quem não preencheu checkpoint
│   │       └── checkpoint-summary/   # Envia resumo semanal
│   ├── share/[token]/            # Dashboard público partilhado com clientes (sem auth)
│   ├── layout.tsx                # Root layout (providers, fonts)
│   └── globals.css               # Estilos globais
│
├── components/                   # Componentes React
│   ├── layout/                   # AppShell, Sidebar, PageHeader
│   ├── dashboard/                # Widgets do dashboard (admin + colaborador)
│   ├── tasks/                    # Board, calendário, Gantt, formulários de tarefas
│   ├── students/                 # Vista de detalhe de aluno, briefing, lançamentos, etc.
│   ├── incubadora/               # Vista do aluno, produtos, audiências, suporte
│   ├── whiteboard/               # Lista e editor de whiteboards
│   ├── ui/                       # Componentes base (Button, Card, Badge, etc.)
│   └── ...outros módulos         # (financeiro, okrs, processos, etc.)
│
├── lib/
│   ├── supabase/                 # Clientes Supabase
│   │   ├── client.ts             # Browser client (anon key)
│   │   ├── server.ts             # Server client (anon key, com cookies)
│   │   ├── admin.ts              # Admin client (service_role — bypassa RLS)
│   │   ├── middleware.ts         # updateSession — mantém sessão e faz redirects de role
│   │   └── roles.ts              # getUserRoles(), getHomeRoute()
│   ├── actions/                  # Server Actions (Next.js "use server")
│   ├── queries/                  # Funções de leitura (server-side)
│   ├── modules.ts                # Definição de módulos e navegação lateral
│   ├── export-tasks.ts           # Exportação de tarefas para PDF/CSV
│   └── utils.ts                  # Utilitários gerais
│
├── types/
│   └── database.ts               # Tipos gerados (placeholder — ver secção 5)
│
├── supabase/
│   └── migrations/               # 37 migrations SQL numeradas (0001–0037)
│
└── sql/
    └── rbac.sql                  # Script manual de RBAC (user_roles, has_role)
```

### Fluxo de Dados

```
Página (Server Component)
  └─▶ Query function (lib/queries/*.ts)
        └─▶ createClient() [server]
              └─▶ Supabase PostgreSQL (respeitando RLS)
                    └─▶ Dados retornam para o componente

Interação do utilizador (Client Component)
  └─▶ Server Action ("use server" em lib/actions/*.ts)
        ├─▶ Validação Zod
        ├─▶ createClient() [server] OU createAdminClient() [service_role]
        ├─▶ Mutação na BD
        ├─▶ revalidatePath() — invalida cache Next.js
        └─▶ Retorna { data } ou { error }
```

---

## 2. Schema da Base de Dados

### Tabelas por domínio

---

#### IDENTIDADE E EQUIPA

**`team_members`** — Estende `auth.users` com perfil e permissões.

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | FK → auth.users(id) |
| full_name | text | Obrigatório |
| email | text unique | Obrigatório |
| role | member_role | `admin` \| `membro` |
| department | text | Departamento (livre) |
| job_title | text | — |
| avatar_url | text | — |
| permissions_modules | text[] | Módulos permitidos; admin ignora este campo |
| active | boolean | Soft delete |
| created_at / updated_at | timestamptz | — |

**`user_roles`** — Tabela RBAC separada (criada em `sql/rbac.sql`).

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | — |
| user_id | uuid | FK → auth.users(id) |
| role | app_role | `admin` \| `funcionario` \| `aluno_incubadora` \| `aluno_mentoria` |

> **Nota:** Na prática, o código usa os valores `"admin"`, `"funcionario"` e `"aluno"` (string simples) ao consultar esta tabela, não o enum `app_role`. O enum foi definido mas o casting é permissivo.

---

#### TABELAS DE STATUS (configuráveis pelo admin)

Todas têm a mesma estrutura: `id`, `key` (slug único), `label`, `color` (hex), `sort_order`, `active`, `created_at`.

| Tabela | Utilização |
|--------|-----------|
| `client_statuses` | Estados de clientes (ex: ativo, pausado, churned) |
| `task_statuses` | Estados de tarefas (ex: a fazer, em curso, concluido) |
| `launch_statuses` | Estados de lançamentos |
| `content_statuses` | Estados de conteúdos (ex: rascunho, publicado) |
| `process_categories` | Categorias de processos/SOPs |
| `financial_categories` | Categorias de transações (receita / despesa) |
| `student_session_types` | Tipos de sessão de incubadora (sessão inicial, hotseat, etc.) |

---

#### CLIENTES

**`clients`**

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | — |
| name | text | — |
| client_type | client_type | `one_shot` \| `long_term` \| `interno` |
| status_id | uuid | FK → client_statuses |
| responsible_id | uuid | FK → team_members |
| contact_name, email, phone, website, sector | text | Contacto |
| monthly_value | numeric(10,2) | Valor mensal recorrente |
| start_date / end_date | date | Período do contrato |
| notes | text | Notas livres |
| public_share_token | text unique | Token para dashboard público (hex 16 bytes) |
| public_share_enabled | boolean | Activa/desactiva partilha pública |
| created_by | uuid | FK → team_members |

---

#### LANÇAMENTOS (templates e instâncias)

**`launch_templates`** — Templates reutilizáveis de lançamentos.

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | — |
| name | text | — |
| tier | text | `master` \| `premium` \| `traffic` \| null |
| duration_days | int | — |
| description | text | — |

**`launch_template_tasks`** — Tarefas de um template.

| Coluna | Tipo | Notas |
|--------|------|-------|
| template_id | uuid | FK → launch_templates (cascade) |
| title | text | — |
| day_offset | int | Dias a partir do início do lançamento |
| default_priority | task_priority | — |
| sort_order | int | — |

**`launches`** — Instâncias de lançamentos.

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | — |
| name | text | — |
| client_id | uuid | FK → clients (cascade) |
| status_id | uuid | FK → launch_statuses |
| tier | text | — |
| template_id | uuid | FK → launch_templates |
| start_date / end_date | date | — |
| description | text | — |
| created_by | uuid | FK → team_members |

**`launch_comments`** — Comentários por lançamento.

---

#### TAREFAS

**`tasks`** — Tabela central de tarefas. Evoluiu com várias migrations.

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | — |
| title | text | — |
| description | text | — |
| status_id | uuid | FK → task_statuses |
| priority | task_priority | `sem_prioridade` \| `baixa` \| `media` \| `alta` \| `urgente` |
| client_id | uuid | FK → clients (set null) |
| launch_id | uuid | FK → launches (set null) |
| assignee_id | uuid | FK → team_members (assignee único legado) |
| assignees | uuid[] | Array de assignees (migration 0006) |
| due_date | date | — |
| start_date | date | Para Gantt (migration implícita) |
| completed_at | timestamptz | — |
| list_id | uuid | FK → task_lists (migration 0006) |
| parent_task_id | uuid | FK → tasks (subtarefas, migration 0006) |
| position | int | Ordem dentro da lista |
| estimate_points | numeric | Estimativa em pontos (migration 0016) |
| delivery_url | text | URL de entrega (para alunos, migration 0019) |
| created_by | uuid | FK → team_members |

**`task_spaces`** — Espaços de trabalho (tipo ClickUp Spaces).

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | — |
| name | text | — |
| color | text | Hex |
| owner_id | uuid | FK → auth.users |
| position | int | — |

**`task_lists`** — Listas dentro de espaços.

| Coluna | Tipo | Notas |
|--------|------|-------|
| space_id | uuid | FK → task_spaces (cascade) |
| name | text | — |
| color | text | Hex |
| position | int | — |

**`task_dependencies`** — Dependências entre tarefas.

| Coluna | Tipo | Notas |
|--------|------|-------|
| task_id | uuid | FK → tasks (cascade) |
| depends_on_id | uuid | FK → tasks (cascade) |
| type | text | `blocks` \| `blocked_by` \| `related` |

**`task_time_logs`** — Registo de tempo por tarefa.

| Coluna | Tipo | Notas |
|--------|------|-------|
| task_id | uuid | FK → tasks (cascade) |
| member_id | uuid | FK → team_members (cascade) |
| start_at / end_at | timestamptz | — |
| duration_minutes | int | Calculado ou manual |
| is_manual | boolean | — |
| description | text | — |

**`task_comments`** — Comentários por tarefa.

**`task_templates`** — Templates de tarefas standalone (migration 0012).

| Coluna | Tipo | Notas |
|--------|------|-------|
| name | text | — |
| space_id | uuid | FK → task_spaces (set null) |
| created_by | uuid | FK → team_members |

**`task_template_items`** — Itens (com suporte a hierarquia parent_item_id) de um template.

---

#### CONTEÚDO

**`contents`** — Planeamento de conteúdo por cliente.

| Coluna | Tipo | Notas |
|--------|------|-------|
| name | text | — |
| client_id | uuid | FK → clients (cascade) |
| launch_id | uuid | FK → launches (set null) |
| status_id | uuid | FK → content_statuses |
| format | text | reel, carrossel, post, story, video, etc. |
| platforms | text[] | instagram, youtube, tiktok, linkedin |
| objective | text | — |
| copy_post / copy_design | text | Textos de copy |
| publish_date | timestamptz | — |
| responsible_id | uuid | FK → team_members |

**`content_files`** — Ficheiros associados a conteúdos (Supabase Storage path).

**`content_feedback`** — Feedback do cliente (suporta threads via parent_id).

| Coluna | Tipo | Notas |
|--------|------|-------|
| author_name | text | Nome livre (cliente externo) |
| author_member_id | uuid | FK → team_members (feedback interno) |
| is_from_client | boolean | — |
| parent_id | uuid | FK → content_feedback (threads) |
| resolved | boolean | — |
| read_by_team | boolean | — |

---

#### RELATÓRIOS

**`reports`**

| Coluna | Tipo | Notas |
|--------|------|-------|
| client_id | uuid | FK → clients (cascade) |
| type | report_type | `semanal` \| `mensal` |
| status | report_status | `rascunho` \| `publicado` |
| period_start / period_end | date | — |
| kpis | jsonb | Snapshot de KPIs no momento da geração |
| content_md | text | Conteúdo em markdown |
| generated_by | uuid | FK → team_members |
| published_at | timestamptz | — |

---

#### FINANCEIRO

**`financial_categories`** — Categorias de transações (tipo `receita` ou `despesa`).

**`transactions`** — Transações avulsas.

| Coluna | Tipo | Notas |
|--------|------|-------|
| type | transaction_type | `receita` \| `despesa` |
| amount | numeric(10,2) | — |
| description | text | — |
| category_id | uuid | FK → financial_categories |
| client_id | uuid | FK → clients (set null) |
| transaction_date | date | — |
| recurring_id | uuid | FK → recurring_transactions (set null) |

**`recurring_transactions`** — Transações recorrentes (geram instâncias em `transactions`).

| Coluna | Tipo | Notas |
|--------|------|-------|
| frequency | recurring_frequency | `mensal` \| `trimestral` \| `semestral` \| `anual` |
| day_of_month | int | Dia do mês em que é gerada |
| start_date / end_date | date | — |
| last_generated_date | date | Controlo de geração |

---

#### OKRs

**`objectives`**

| Coluna | Tipo | Notas |
|--------|------|-------|
| title | text | — |
| quarter | quarter_label | `Q1` \| `Q2` \| `Q3` \| `Q4` |
| year | int | — |
| department | text | — |
| confidence | confidence_level | `baixa` \| `media` \| `alta` |
| status | text | `em_progresso`, `concluido`, etc. |
| responsible_ids | uuid[] | Array de team_members |

**`key_results`**

| Coluna | Tipo | Notas |
|--------|------|-------|
| objective_id | uuid | FK → objectives (cascade) |
| initial_value / current_value / target_value | numeric | — |
| deadline | date | — |
| responsible_ids | uuid[] | — |
| sort_order | int | — |

**`key_result_history`** — Histórico automático via trigger (`trg_record_kr_progress`). Regista cada alteração de `current_value`.

---

#### PROCESSOS / SOPs

**`processes`**

| Coluna | Tipo | Notas |
|--------|------|-------|
| category_id | uuid | FK → process_categories |
| content_json | jsonb | Conteúdo TipTap (editor rich text) |
| content_md | text | Versão markdown para pesquisa/exportação |
| miro_link | text | Link Miro opcional |
| external_links | jsonb | Array de `{label, url}` |
| tags | text[] | Com índice GIN para pesquisa rápida |
| published | boolean | — |

---

#### REUNIÕES

**`meetings`**

| Coluna | Tipo | Notas |
|--------|------|-------|
| client_id | uuid | FK → clients (set null) |
| scheduled_at | timestamptz | — |
| duration_minutes | int | Default 60 |
| location | text | online, escritório, URL Zoom, etc. |
| agenda_md / notes_md | text | Ordem de trabalhos e notas |
| attendee_ids | uuid[] | Array de team_members |

---

#### ESTRATÉGIA (migration 0005)

**`mentorships`** — Programas de mentoria externos (uso privado do CEO).

| Coluna | Tipo | Notas |
|--------|------|-------|
| mentor | text | — |
| platform | text | — |
| status | mentorship_status | `ativa` \| `em_pausa` \| `concluida` \| `arquivada` |
| total_modules | int | — |
| cover_emoji | text | — |

**`mentorship_modules`** — Aulas/módulos dentro de cada mentoria.

**`implementation_actions`** — Ações a implementar derivadas de módulos de mentoria.

| Coluna | Tipo | Notas |
|--------|------|-------|
| mentorship_id | uuid | FK → mentorships (cascade) |
| module_id | uuid | FK → mentorship_modules (set null) |
| status | implementation_status | `pendente` \| `a_implementar` \| `em_curso` \| `implementado` \| `parqueada` |
| task_id | uuid | FK → tasks (set null — liga à tarefa de execução) |
| initiative_id | uuid | FK → initiatives (set null) |

**`initiatives`** — Projetos estratégicos de médio/longo prazo.

| Coluna | Tipo | Notas |
|--------|------|-------|
| status | initiative_status | `ideia` \| `planeamento` \| `em_curso` \| `em_pausa` \| `concluida` \| `cancelada` |
| priority | initiative_priority | `baixa` \| `media` \| `alta` \| `critica` |
| source | initiative_source | `interno` \| `cliente` \| `mentoria` \| `oportunidade` \| `crise` |
| health | initiative_health | `verde` \| `amarelo` \| `vermelho` |
| focus_this_week | boolean | Aparece na secção "Foco da Semana" do Dashboard |
| needs_decision | boolean | Sinaliza que precisa de decisão |
| parent_initiative_id | uuid | FK → initiatives (sub-iniciativas) |
| client_id | uuid | FK → clients (set null) |
| mentorship_id | uuid | FK → mentorships (set null) |

**`initiative_updates`** — Timeline de atualizações por iniciativa.

**`decisions`** — Queue de decisões pendentes do CEO.

| Coluna | Tipo | Notas |
|--------|------|-------|
| status | decision_status | `pendente` \| `decidida` \| `adiada` \| `arquivada` |
| impact | decision_impact | `baixo` \| `medio` \| `alto` \| `critico` |
| decided_at | timestamptz | — |
| decision | text | Texto da decisão tomada |
| decided_by | uuid | FK → team_members |

---

#### SISTEMA

**`favorites`** — Favoritos por membro (item_type + item_id genérico).

**`activity_log`** — Log de atividade automático (ação, entidade, metadata jsonb).

**`notifications`** — Notificações in-app.

| Coluna | Tipo | Notas |
|--------|------|-------|
| user_id | uuid | FK → auth.users (cascade) |
| type | text | `task_assigned`, `task_comment`, `checkpoint_reminder`, `briefing_review_requested`, `briefing_reviewed`, etc. |
| title / body | text | — |
| link | text | URL de navegação ao clicar |
| read | boolean | — |

> Notificações são sempre criadas via `createAdminClient()` (service_role) porque quem cria/edita não é o destinatário.

**`daily_standups`** — Standup diário por membro (yesterday, today, blockers). Unique por (user_id, date).

**`whiteboards`** — Whiteboards Excalidraw. Campo `data` jsonb guarda o estado completo do canvas.

---

#### INCUBADORA — Método (migration 0007)

**`modules`** — Módulos do método Incubadora.  
**`lessons`** — Lições por módulo (com content_url para vídeo/recurso).  
**`student_progress`** — Progresso por aluno × módulo (completed_at).  
**`lesson_completions`** — Conclusões por aluno × lição.  
**`emergency_calls`** — Pedidos de chamada de emergência dos alunos.

Nota: as migrations 0036 e 0037 removeram dois desafios (`challenges` table existe mas não foi criada no código visto — parece ter sido criada num seed ou migration não localizado nos ficheiros disponíveis).

---

#### INCUBADORA — Alunos (CRM)

**`students`** — Perfil CRM de cada aluno. Evoluiu extensivamente.

| Coluna | Tipo | Notas |
|--------|------|-------|
| name, email, phone, instagram | text | — |
| nicho / subnicho | text | Nicho de mercado |
| coach_id | uuid | FK → team_members |
| level | student_level | `aprendiz` \| `fazedor` \| `referencia` \| `suspenso` |
| turma | text | Identificador da turma |
| status | text | `ativo`, etc. (campo livre) |
| user_id | uuid | FK → auth.users (migration 0019 — permite login do aluno) |
| mindmap_url | text | (migration 0020) |
| renewal_status | text | `pendente` \| `renovado` \| `nao_renovado` \| `bonus` (migration 0014) |
| renewal_date / renewal_notes | date / text | (migration 0014) |
| revenue_generated | numeric | ROI acumulado (sincronizado por trigger) |
| sales_page_url / sales_page_published_at | text / timestamptz | (migration 0027) |
| product_ticket | text | Ticket do produto (lido em getStudentProfile com parse numérico) |
| investment_budget | numeric | Orçamento de investimento |

**`student_sessions`** — Sessões agendadas por tipo.  
**`student_session_types`** — Tipos de sessão configuráveis.  
**`student_briefings`** — Briefing estruturado em 5 secções (negocio, produto, audiencia, objecoes, estrategia) em jsonb. Inclui `review_status` e `review_notes` (migration 0032).  
**`student_revenue_history`** — Histórico de receita gerada (trigger automático em students.revenue_generated, migration 0021).  
**`student_launches`** — Lançamentos planeados/realizados pelo aluno (migration 0022, expandido em 0031).  
**`student_launch_debriefs`** — Debriefing detalhado pós-lançamento 1:1 com student_launches (migration 0031).  
**`student_products`** — Catálogo de produtos do aluno, com escada de valor (migration 0031, expandido em 0034).  
**`student_audience_profiles`** — Perfis de audiência por aluno (migration 0033).  
**`student_launch_audiences`** — M:M entre lançamentos e perfis de audiência (migration 0035).  
**`student_launch_name_ideas`** — Sugestões de nome/promessa para lançamentos (migration 0035).

**`support_tickets`** — Tickets de suporte criados pelos alunos (migration 0024).  
**`support_ticket_replies`** — Respostas a tickets.

---

#### Triggers importantes

| Trigger | Tabela | O que faz |
|---------|--------|----------|
| `set_updated_at` | múltiplas | Atualiza `updated_at` em cada UPDATE |
| `on_auth_user_created` | auth.users | Cria `team_members` automaticamente no signup |
| `kr_progress_history` | key_results | Grava histórico em `key_result_history` a cada mudança de `current_value` |
| `student_launch_debriefs_revenue_sync` | student_launch_debriefs | Sincroniza `revenue_generated` em `students` quando debrief é preenchido |
| `student_launches_status_revenue_sync` | student_launches | Sincroniza receita quando status muda para `concluido` |
| `students_revenue_history` | students | Grava histórico em `student_revenue_history` quando `revenue_generated` muda |

---

## 3. Módulos e Funcionalidades

### 3.1 Dashboard

**Rota:** `/dashboard`  
**O que faz:** Vista principal diferente para admin e colaborador.

**Vista Admin:**
- KPIs globais: clientes ativos, tarefas abertas, lançamentos ativos, progresso OKRs (%)
- Camada estratégica: "Foco da Semana" (iniciativas `focus_this_week=true`) + decisões pendentes
- Métricas por departamento (vendas, marketing, operações/design, desenvolvimento)
- Alertas de renovação de alunos (60 dias antes de `end_date`)
- Feed de atividade recente (últimas 10 entradas de `activity_log`)
- Checkpoints da equipa da semana corrente

**Vista Colaborador:**
- As minhas tarefas abertas
- Standup diário (yesterday / today / blockers)
- Minutos trabalhados nesta semana (soma de `task_time_logs`)
- Timer de tempo a correr
- Checkpoint semanal pessoal

**Componentes principais:**
- `components/dashboard/focus-week.tsx`
- `components/dashboard/pending-decisions.tsx`
- `components/dashboard/colaborador/colaborador-dashboard.tsx`
- `components/dashboard/department-metrics.tsx`
- `components/dashboard/admin-checkpoints.tsx`

**Queries usadas:** `getRecentActivity`, `getInitiatives`, `getDecisions`, `getMyOpenTasks`, `getTodayStandup`, `getWeekTimeMinutes`, `getThisWeekCheckpoint`, `getCheckpointStatus`, `getDepartmentTaskCounts`, `getStudentsWithRenewalAlerts`

**Estado:** Funcional.

---

### 3.2 Tarefas

**Rota:** `/tarefas`  
**O que faz:** Gestão completa de tarefas com hierarquia Space → List → Task → Subtask.

**Funcionalidades:**
- Board Kanban com drag & drop entre status (`tasks-board.tsx`)
- Vista calendário (`tasks-calendar.tsx`)
- Vista Gantt (`tasks-gantt.tsx`)
- Vista de carga de trabalho por membro (`workload-view.tsx`)
- Painel lateral de detalhe de tarefa (`task-detail-panel.tsx`)
- Time tracking: timer start/stop + registo manual
- Subtarefas aninhadas
- Dependências entre tarefas (blocks / blocked_by / related)
- Templates de tarefas standalone (`templates-manager.tsx`)
- Notificações automáticas a novos assignees
- Exportação para PDF/CSV

**URL param:** `?list=<uuid>` — seleciona a lista. Default: Backlog (UUID fixo `00000000-0000-0000-0000-000000000011`).

**Server Actions:** `createTaskAction`, `updateTaskAction`, `deleteTaskAction`, `moveTaskStatusAction`, `postTaskCommentAction`, `startTimerAction`, `stopTimerAction`, `logTimeManualAction`, `createTaskSpaceAction`, `createTaskListAction`, `createSubtaskAction`, `addTaskDependencyAction`, `removeTaskDependencyAction`, `markTaskCompleteAction`, `updateTaskDeliveryAction`, `updateTaskDatesAction`, `getTasksForGanttAction`, `getWorkloadAction`

**Queries:** `getTasks`, `getTaskSpaces`, `getTasksByList`, `getTaskTemplates`, `getTaskTimeLogs`, `getTaskDependencies`, `getWorkloadByMember`, `getTasksForGantt`, `getTasksForStudent`

**Estado:** Funcional. `tasks-gantt.tsx` e `workload-view.tsx` são componentes novos — verificar integração completa.

---

### 3.3 Clientes

**Rota:** `/clientes`, `/clientes/[id]`  
**O que faz:** CRM de clientes com ficha detalhada.

**Funcionalidades:**
- Lista de clientes com filtros por status e tipo
- Ficha: dados de contacto, valor mensal, responsável, datas de contrato
- Lançamentos do cliente
- Conteúdos do cliente
- Dashboard público partilhado (`/share/[token]`)

**Dashboard público (`/share/[token]`):**
- Acesso sem autenticação via `public_share_token`
- Mostra: tarefas ativas, conteúdos publicados, relatórios publicados, valor mensal
- Formulário de feedback do cliente (cria entradas em `content_feedback`)
- Usa `createAdminClient()` para bypassar RLS (acesso via token validado)

**Estado:** Funcional.

---

### 3.4 Lançamentos

**Rota:** `/lancamentos`, `/lancamentos/[id]`  
**O que faz:** Gestão de lançamentos de marketing para clientes, com templates.

**Funcionalidades:**
- Criação a partir de templates (com tarefas pré-configuradas)
- Gestão de status, tier, datas
- Comentários por lançamento
- Aplicação de templates de tarefas (`apply-template-dialog.tsx`)

**Estado:** Funcional.

---

### 3.5 Conteúdo

**Rota:** `/conteudo`  
**O que faz:** Planeamento e tracking de conteúdo por cliente.

**Funcionalidades:**
- Criação de conteúdos por formato e plataforma
- Copy post e copy design
- Ficheiros associados
- Feedback do cliente (sistema de threads)

**Estado:** Funcional.

---

### 3.6 Incubadora (Vista Staff)

**Rota:** `/incubadora`, `/incubadora/[id]`  
**O que faz:** Gestão completa do programa de incubação — vista para coaches e admins.

**Funcionalidades:**

*Listagem (`/incubadora`):*
- Dashboard com estatísticas gerais (`incubadora-dashboard.tsx`)
- Painel de módulos do método com contagem de lições
- Tabela de alunos com: nível, coach, progresso no método, ROI, alertas de notas e renovação
- Dashboard ROI dos alunos (`students-roi-dashboard.tsx`)

*Detalhe de aluno (`/incubadora/[id]`):*
Renderizado por `StudentDetailClient` que expõe tabs:

| Tab | Componente | O que faz |
|-----|-----------|----------|
| Perfil | (inline) | Dados base: nível, nicho, turma, sessões agendadas, notas do coach |
| Briefing | `briefing-dialog.tsx` | 5 secções jsonb + fluxo de revisão coach/aluno |
| Tarefas | `student-coach-tasks.tsx` | Tarefas atribuídas ao aluno |
| Lançamentos | `student-launches.tsx` + `launch-wizard.tsx` | Lista de lançamentos + criação guiada |
| Produtos | `student-products-coach.tsx` | Escada de valor do aluno |
| Audiência | `student-audience-coach.tsx` | Perfis de audiência |
| ROI | `student-roi.tsx` | Receita gerada + histórico |
| Página de Vendas | (inline) | URL da página de vendas + data de publicação |
| Renovação | (inline) | Status e data de renovação |

**Fluxo de revisão coach/aluno:**
- Estado: `nao_iniciado` → `em_preenchimento` → `pronto_revisao` → `alteracoes_pedidas` / `aprovado`
- Aplica-se a: briefings, produtos, audiências, lançamentos
- Notificações automáticas em cada transição relevante

**Suporte (`/incubadora/suporte`):**
- Dashboard de tickets de suporte dos alunos
- Resposta a tickets, mudança de status/prioridade
- Apenas staff (admin + funcionário)

**Server Actions:** `createStudentAction`, `updateStudentAction`, `deleteStudentAction`, `updateSessionAction`, `createStudentNoteAction`, `getStudentBriefingAction`, `saveStudentBriefingAction`, `submitBriefingForReviewAction`, `updateBriefingReviewStatusAction`, `updateRenewalAction`, `getIncubadoraStatsAction`, `updateStudentSalesPageAction`, `getStudentRevenueHistoryAction`, `getStudentsROISummaryAction` — e mais em `student-launches.ts`, `products.ts`, `audience.ts`, `support.ts`, `student-launch-config.ts`, `milestones.ts`

**Estado:** Funcional, em expansão ativa. Módulo mais complexo do sistema.

---

### 3.7 Incubadora (Vista Aluno)

**Rota:** `/incubadora` (mesma rota, conteúdo diferente baseado no role)  
**O que faz:** Área pessoal do aluno no programa.

**Funcionalidades:**
- `StudentView` com sub-secções: `metodo` (default), `ferramentas`, `assistentes`
- Vista do método: lista de módulos com progresso de lições
- Vista `ferramentas`: `LaunchGoalsCalculator` (calculadora de metas de lançamento)
- Vista `assistentes`: placeholder "Newton — em breve"
- Dashboard da secção aluno inclui: progresso, tarefas atribuídas, suporte, gamificação, ROI, página de vendas

**Acesso às rotas do método via `/incubadora?section=ferramentas`**

**Estado:** Funcional para método e ferramentas. Assistentes: placeholder.

---

### 3.8 Whiteboard

**Rota:** `/whiteboard`, `/whiteboard/[id]`  
**O que faz:** Whiteboards colaborativos com Excalidraw.

**Funcionalidades:**
- Lista de boards (mais recentes primeiro)
- Editor Excalidraw com auto-save do estado em jsonb
- Criação e eliminação (só admins podem eliminar)
- Apenas staff (admin + funcionário)

**Componentes:** `whiteboard-list.tsx`, `whiteboard-editor.tsx`  
**Actions:** `lib/actions/whiteboards.ts`  
**Estado:** Funcional.

---

### 3.9 Relatórios

**Rota:** `/relatorios`, `/relatorios/[id]`  
**O que faz:** Geração e publicação de relatórios semanais/mensais por cliente.

**Funcionalidades:**
- Criação de relatório com período e KPIs (snapshot jsonb)
- Edição de conteúdo em markdown
- Publicação (aparece no dashboard público do cliente)

**Estado:** Funcional.

---

### 3.10 Financeiro

**Rota:** `/financeiro`  
**O que faz:** Controlo de receitas e despesas com categorias e recorrência.

**Funcionalidades:**
- Transações avulsas e recorrentes
- Categorias configuráveis por tipo (receita / despesa)
- Associação a cliente

**Estado:** Funcional.

---

### 3.11 OKRs

**Rota:** `/okrs`  
**O que faz:** Gestão de OKRs trimestrais com histórico automático de progresso.

**Funcionalidades:**
- Objetivos por trimestre/ano/departamento
- Key Results com valores inicial, atual e alvo
- Histórico automático via trigger a cada mudança de `current_value`
- Progresso calculado em % e exibido no Dashboard KPI

**Estado:** Funcional.

---

### 3.12 Processos / SOPs

**Rota:** `/processos`, `/processos/[id]`  
**O que faz:** Base de conhecimento interna com processos operacionais.

**Funcionalidades:**
- Editor TipTap (rich text com export para markdown)
- Categorização, tags (com pesquisa via índice GIN)
- Links externos e link Miro
- Publicação/despublicação

**Estado:** Funcional.

---

### 3.13 Reuniões

**Rota:** `/reunioes`  
**O que faz:** Agendamento e registo de reuniões.

**Funcionalidades:**
- Reuniões com cliente associado
- Agenda e notas em markdown
- Participantes (array de team_member IDs)

**Estado:** Funcional.

---

### 3.14 Estratégia (Iniciativas, Decisões, Mentorias)

**Rotas:** `/iniciativas`, `/iniciativas/[id]`, `/decisoes`, `/mentorias`, `/mentorias/[id]`

**Iniciativas** — Projetos estratégicos acima de tarefas e lançamentos:
- Status, prioridade, saúde, fonte, owner
- Timeline de updates
- Flag `focus_this_week` → aparece no Dashboard do CEO
- Sub-iniciativas (parent_initiative_id)
- Ligação opcional a clientes, mentorias

**Decisões** — Queue de decisões pendentes:
- Status, impacto, urgência
- Contexto, opções, decisão tomada
- Aparece no Dashboard (secção "Decisões Pendentes")

**Mentorias** — Programas externos consumidos pelo CEO:
- Módulos com insights e notas
- Ações de implementação geradas por módulo
- Acesso restrito a admins (uso pessoal)

**Estado:** Funcional.

---

### 3.15 Equipa e Configurações

**`/equipa`** — Gestão de membros da equipa: criação, edição, permissões de módulos, ativação/desativação.

**`/configuracoes`** — Configuração de status tables (client_statuses, task_statuses, etc.) e student_session_types.

**Estado:** Funcional.

---

### 3.16 Dashboard Público (sem auth)

**Rota:** `/share/[token]`  
**O que faz:** Dashboard de cliente partilhável publicamente via URL com token único.

**Mostra:**
- Tarefas ativas do cliente (excluindo concluídas)
- Conteúdos publicados
- Relatórios publicados (primeiros 500 chars)
- Valor mensal
- Formulário de feedback

**Segurança:** Usa `createAdminClient()` mas filtra por `public_share_token` E `public_share_enabled = true`. Sem auth requerida.

---

### 3.17 API Routes

| Rota | Método | O que faz |
|------|--------|----------|
| `/api/share/feedback` | POST | Cria feedback de cliente (sem auth, validado por client_id) |
| `/api/incubadora/lessons` | GET | Lista lições por `module_id` |
| `/api/checkpoints/status` | GET | Estado dos checkpoints (admin only) |
| `/api/cron/checkpoint-reminder` | POST | Notifica quem não preencheu checkpoint (CRON_SECRET) |
| `/api/cron/checkpoint-summary` | POST | Envia resumo semanal (CRON_SECRET) |

---

## 4. Autenticação e Permissões (RBAC)

### Sistema de Auth

Usa **Supabase Auth** com sessão gerida via cookies (`@supabase/ssr`).

Três clientes Supabase:
1. `lib/supabase/client.ts` — browser, anon key, para componentes client-side
2. `lib/supabase/server.ts` — server-side, anon key + cookies, respeita RLS
3. `lib/supabase/admin.ts` — service_role, **bypassa RLS**, usado apenas em Server Actions específicas e API routes validadas

### Middleware (`middleware.ts` → `lib/supabase/middleware.ts`)

Corre em **todas as rotas** (exceto _next/static, imagens, etc.):

1. Atualiza a sessão Supabase (refresh token se necessário)
2. Se sem sessão → redirect para `/login`
3. Se com sessão → lê `user_roles` e determina role
4. Se `aluno` (e não admin/funcionário) → só pode aceder a `/incubadora`. Qualquer outra rota → redirect para `/incubadora`
5. Se em `/login` com sessão → redirect para rota correta (`/dashboard` ou `/incubadora`)

### Roles do Sistema

Dois sistemas de roles em paralelo:

**Sistema 1 — `team_members.role`** (enum `member_role`):
| Role | Descrição |
|------|----------|
| `admin` | Acesso total a todos os módulos e configurações |
| `membro` | Acesso baseado em `permissions_modules[]` |

**Sistema 2 — `user_roles.role`** (enum `app_role`):
| Role | Rota padrão | Acesso |
|------|------------|--------|
| `admin` | `/dashboard` | Total |
| `funcionario` | `/dashboard` | Total (sem restrições de módulo) |
| `aluno` (ou `aluno_incubadora`) | `/incubadora` | Apenas `/incubadora` + dados próprios |

> **Nota importante:** Os dois sistemas coexistem. O middleware usa `user_roles`. O `AppLayout` verifica ambos (`team_members.role` e `user_roles`). A RLS usa funções como `is_admin()` e `has_module()` que leem de `team_members`, não de `user_roles`.

### RLS (Row Level Security)

**Ativa em todas as tabelas.** Funções helper no Supabase:

```sql
is_admin(uid)       -- Verifica role = 'admin' em team_members
is_team_member(uid) -- Verifica que o user está ativo em team_members
has_module(uid, m)  -- Admin sempre tem acesso; membro precisa do módulo em permissions_modules
has_role(uid, role) -- Verifica role em user_roles (RBAC separado)
```

**Padrões de política:**

| Cenário | Política |
|---------|---------|
| Status tables (client_statuses, etc.) | SELECT: qualquer team member; ALL: só admin |
| Módulos operacionais (tasks, clients, etc.) | ALL: `has_module(uid, 'modulo')` |
| OKRs | SELECT: qualquer team member; UPDATE: admin ou responsável |
| Mentorias, decisões | Só admins |
| Dados de aluno (briefings, launches, etc.) | Aluno vê/edita os seus; equipa vê/edita todos |
| Notificações | SELECT/UPDATE: só o próprio (user_id = auth.uid()) |
| Whiteboards | SELECT/INSERT/UPDATE: team members; DELETE: só admins |
| Favoritos | ALL: só o próprio (member_id = auth.uid()) |

**Permissões granulares por módulo:**

Admins definem `permissions_modules[]` em cada `team_member`. Módulos válidos: `dashboard`, `clientes`, `tarefas`, `lancamentos`, `conteudo`, `incubadora`, `relatorios`, `financeiro`, `okrs`, `processos`, `reunioes`, `equipa`, `configuracoes`, `iniciativas`, `decisoes`, `mentorias`.

### Criação de Aluno

Quando um aluno é criado (`createStudentAction`):
1. Se tem email → cria `auth.user` via `admin.auth.admin.createUser()` com password gerada aleatoriamente
2. Insere role `aluno` em `user_roles`
3. Cria registo em `students` com `user_id` ligado ao auth.user
4. Password gerada é retornada uma única vez para o coach comunicar ao aluno

---

## 5. Bugs e Decisões Técnicas

### Decisões de Arquitetura Documentadas

**Server Actions em vez de API Routes para mutações:**  
A aplicação usa exclusivamente Server Actions (`"use server"`) para todas as mutações, em vez de API Routes REST. Isto simplifica o código (sem fetch manual, sem endpoints de URL), mas a autenticação é verificada dentro de cada action. Actions com o `createAdminClient()` (service_role) contornam RLS — são usadas apenas quando necessário (ex: criação de notificações para terceiros, criação de auth users).

**Dois sistemas de roles em paralelo:**  
`team_members.role` (enum `admin`/`membro`) e `user_roles` (tabela RBAC separada com `admin`/`funcionario`/`aluno`). Criados em momentos diferentes do desenvolvimento. O middleware e o AppLayout lêem ambos. As políticas RLS usam apenas `team_members`. Isto cria alguma fricção — um aluno que seja membro de `team_members` passaria pelas políticas RLS como team member. Na prática, alunos não têm registo em `team_members` (são criados em `students`), por isso funciona, mas é um invariante implícito, não enforced pela BD.

**`types/database.ts` é um placeholder:**  
O ficheiro de tipos não foi gerado via `supabase gen types typescript`. Usa tipos relaxados (`Record<string, any>`). Não existe type-safety nas queries Supabase — os tipos vêm de castings manuais e interfaces definidas nas queries. Consequência: erros de tipo em runtime são possíveis.

**Snapshot de produto em lançamentos:**  
Decidido explicitamente (documentado na migration 0034): o snapshot do produto principal vai em `student_launches`, não em `student_products`. Razão: um produto pode ser reutilizado em múltiplos lançamentos; um snapshot em `student_products` seria ambíguo.

**Revenue sync com `revenue_synced` flag:**  
Para evitar duplicação de receita quando o aluno re-guarda ou o trigger corre múltiplas vezes, a flag `revenue_synced` em `student_launches` e `student_launch_debriefs` impede que o mesmo lançamento some receita mais do que uma vez em `students.revenue_generated`.

**Gamificação removida:**  
Migrations 0029 e 0030 removeram badges e pontos. Os níveis (`students.level`) passaram a ser geridos manualmente pelo coach. Tabelas removidas: `student_badges`, `student_points_log`, `student_points_total` (view).

**Desafios parcialmente removidos:**  
Migrations 0036 e 0037 removeram desafios específicos. A tabela `challenges` continua a existir na BD (referenciada em queries de `incubadora.ts`) mas a sua criação não é visível nos ficheiros de migration disponíveis — terá sido criada num seed ou migration não localizado. Verificar se a tabela existe no ambiente de produção.

### Padrões e Notas Técnicas

**console.log de debug em produção:**  
`lib/actions/tasks.ts` tem vários `console.log` com prefixo `[notifyNewAssignees]`, `[createTaskAction]`, `[updateTaskAction]`. São de debug e devem ser removidos antes de produção.

**`getStudentProfile` faz parse de string para numeric:**  
Em `lib/queries/incubadora.ts`, o campo `product_ticket` é lido como string e depois parseado com `parseFloat` e `replace`. Indica que o campo foi armazenado como texto nalguma altura — a migration que o criou como `text` não está visível mas a query sugere isso.

**`updateStudentLaunchAction` atualiza `students` em vez de `student_launches`:**  
Em `lib/actions/students.ts`, `updateStudentLaunchAction` faz `update` na tabela `students` com campos como `launch_product`, `launch_objective`, etc. Estes campos não existem no schema visível de `students`. Provavelmente são campos legados removidos ou um mismatch entre código e schema atual.

**`upsertStudentChecklistAction` referencia `student_checklist`:**  
A action em `lib/actions/students.ts` faz `upsert` em `student_checklist`. Esta tabela não aparece em nenhuma migration disponível — pode existir num seed não visto ou pode estar em falta.

**Campo `team_members.user_id` referenciado em código:**  
Em `lib/actions/students.ts`, a query `admin.from("team_members").select("user_id")` pressupõe que `team_members` tem uma coluna `user_id`. A migration 0001 mostra que a PK de `team_members` é `id` (que é o `auth.users.id`), não `user_id`. Isto vai causar erro em runtime ou retornar null — verificar.

**`student_track_steps` e `student_challenges` referenciadas mas migrations não visíveis:**  
As queries em `incubadora.ts` leem de `student_track_steps` e `student_challenges`. Não há migration visível que crie estas tabelas. Podem existir num seed ou migration separada. Verificar no Supabase Dashboard.

---

## 6. Variáveis de Ambiente

Todas necessárias para o projeto funcionar:

| Variável | Onde é usada | Para que serve |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/client.ts`, `server.ts`, `middleware.ts`, `admin.ts` | URL do projeto Supabase (público, vai para o browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/client.ts`, `server.ts`, `middleware.ts` | Chave anon do Supabase (pública, respeita RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts` | Chave service_role (secreta, bypassa RLS — NUNCA expor ao browser) |
| `CRON_SECRET` | `app/api/cron/checkpoint-reminder/route.ts`, `app/api/cron/checkpoint-summary/route.ts` | Token para autenticar chamadas dos cron jobs (Vercel Cron / n8n) |

**Ficheiro `.env.local` (não incluído no repositório):**
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
CRON_SECRET=<segredo-aleatorio>
```

---

## 7. O Que Falta / Próximos Passos

### Tabelas referenciadas no código mas não visíveis nas migrations

| Tabela | Onde é usada | Estado |
|--------|-------------|--------|
| `challenges` | `lib/queries/incubadora.ts` — `getChallenges()` | Provavelmente criada em seed; migrations 0036/0037 fazem DELETE de rows mas não DROP TABLE |
| `student_challenges` | `lib/queries/incubadora.ts` | Idem |
| `student_track_steps` | `lib/queries/incubadora.ts` — `getSuccessTracks()` | Idem — verificar se existe na BD |
| `student_checklist` | `lib/actions/students.ts` — `upsertStudentChecklistAction` | Não visível em qualquer migration |
| `student_notes` | `lib/actions/students.ts` — `createStudentNoteAction`, `updateStudentNoteAction`, `deleteStudentNoteAction` | Não visível em qualquer migration |

### Funcionalidades placeholder ou incompletas

- **Assistentes (Newton):** `app/(app)/incubadora?section=assistentes` retorna um `<h2>Assistentes</h2>` com texto "Newton o teu assistente de IA estará disponível em breve." — não implementado.

- **`app/(app)/escolher/`:** Rota de onboarding/seleção de caminho — código não lido; verificar estado.

- **`app/(app)/mentoria/`:** Rota separada (não confundir com `/mentorias`) — verificar se está em uso ou é um esboço.

### Débito técnico conhecido

- **`types/database.ts` é um placeholder** — todos os tipos das tabelas são `Record<string, any>`. Para ter type-safety real, correr `npm run db:types` contra o projeto Supabase de produção/staging.

- **`console.log` de debug em `lib/actions/tasks.ts`** — linhas de debug com `[notifyNewAssignees]`, `[createTaskAction]`, `[updateTaskAction]`. Remover antes de produção.

- **`updateStudentLaunchAction` em `students.ts`** — atualiza campos em `students` que podem não existir no schema atual (`launch_product`, `launch_objective`). Verificar se esta action ainda é usada ou se foi substituída pelas actions de `student-launches.ts`.

- **`admin.from("team_members").select("user_id")`** — `team_members` usa `id` como PK (que é o auth.users.id). Não tem coluna `user_id`. Esta query em `submitBriefingForReviewAction` vai retornar colunas nulas — verificar no Supabase e corrigir para `.select("id")` se é isso que se pretende (enviar notificação ao user_id do team member, que é o próprio `id`).

- **Dois sistemas de roles em paralelo** — considerar unificação futura. Atualmente funciona porque alunos não têm registo em `team_members`, mas é um invariante implícito frágil.

### Features em progresso (baseado em ficheiros novos ainda sem uso pleno)

- `components/tasks/tasks-gantt.tsx` — Gantt chart (componente criado, integração a verificar)
- `components/tasks/workload-view.tsx` — Vista de carga de trabalho (componente criado)
- `components/students/launch-wizard.tsx` — Assistente de criação de lançamentos (componente criado, integração a verificar)
- `components/incubadora/student-launch-summary.tsx` — Resumo de lançamento (componente criado)
- `lib/actions/milestones.ts` — Actions de milestones (verificar se a tabela `milestones` existe)

### Próximos passos sugeridos (baseado no estado atual)

1. **Gerar tipos TypeScript reais:** `npm run db:types` — elimina todos os `any` e previne erros silenciosos
2. **Verificar tabelas em falta:** `challenges`, `student_challenges`, `student_track_steps`, `student_checklist`, `student_notes`, `milestones` — confirmar existência no Supabase Dashboard e criar migrations se em falta
3. **Remover `console.log` de debug** em `lib/actions/tasks.ts`
4. **Corrigir query `user_id` em `team_members`** em `submitBriefingForReviewAction`
5. **Implementar Newton (assistentes)** — a rota existe mas é um placeholder
6. **Verificar e limpar `updateStudentLaunchAction`** — pode estar a fazer update em campos inexistentes

---

*Documentação gerada com base na leitura direta do código — migrations 0001–0037, server actions, queries e componentes principais. Verificar sempre contra o estado atual da base de dados em produção.*
