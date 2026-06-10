# Outlier OS — Auditoria Estado Real

**Data:** 10 Jun 2026
**Período auditado:** 2024-07 → 2026-06
**Fontes:** PROJETOS/ local · EMPRESA/ local · Second Brain local · Memory files · ClickUp API (10 spaces) · GHL JSON dumps · App outlier-os schema
**Bloqueado:** Google Drive (permissões MCP em modo ask — destravar com `/permissions`)

---

## TL;DR — A verdade dura em 60 segundos

1. **Tens uma app construída há 1 mês que nunca usaste.** PROJETOS/outlier-os (Next.js+Supabase, 13 módulos, schema em produção, build verde). Login funciona. Foi feita exactamente para o que pediste hoje.
2. **Tens um "cemitério" no ClickUp.** 101 lists com tasks abertas que não tocas há mais de 2 meses. 19 tasks abertas num roadmap parado desde Jan/2025.
3. **Tens 15 projetos em PROJETOS/.** Só 7 ativos. 6 parqueados. 2 mortos (1 pasta vazia).
4. **A dispersão não é falta de ferramentas — é falta de fechar ciclos.** Em todas as frentes vejo o mesmo padrão: começar, chegar a 80%, mudar de rumo, ficar a 80% para sempre.
5. **A app outlier-os, se retomada e estendida com 3 módulos (Iniciativas, Mentorias, Foco Semana), resolve 80% da dor.** Não precisas de construir nada novo. Precisas de **terminar** e **usar**.

---

## 1. Estado da app `PROJETOS/outlier-os/`

### O que está pronto (não precisa tocar)

| Módulo | Estado | Notas |
|---|---|---|
| Dashboard | ✅ | 4 KPIs + Atividade Recente via triggers Postgres |
| Clientes | ✅ | 3 vistas + 7 tabs no detalhe + URL pública partilhável |
| Tarefas | ✅ | Kanban drag-and-drop + time tracking |
| Lançamentos | ✅ | Pipeline kanban 7 col + templates auto-criam tarefas |
| Conteúdo | ✅ | Workflow 9 stages |
| Incubadora | ✅ | Kanban por nível, criar aluno auto-cria 6 sessões |
| Relatórios | ✅ | Gerador automático agregando tarefas/conteúdos/lançamentos |
| Financeiro | ✅ | P&L + gráfico mensal + pies |
| OKRs | ✅ | Trimestral/anual por departamento |
| Processos & SOPs | ✅ | 8 categorias, markdown + tags |
| Reuniões | ✅ | Calendário semanal |
| Equipa | ✅ | Permissões granulares por módulo |
| Configurações | ✅ | CRUD de status (clientes/tarefas/lançamentos/conteúdo) |

**Schema Supabase:** 29 tabelas + RLS 30/30 + triggers de activity_log. Ref `dsfzhrodcxtlayxcfjpx` em produção cloud.

### O que falta (para responder ao que pediste)

| Falta | Porquê importa | Esforço |
|---|---|---|
| Módulo **Iniciativas** | Tarefas e Lançamentos não chegam para projetos estratégicos (Curso, Rebranding, OTE, etc.) | 1 dia (1 tabela + 2 vistas) |
| Módulo **Mentorias** | Não há sítio para tracking do que aprendes (Core IA, Ladeira ×2) vs do que implementas | 1 dia (3 tabelas + 1 detalhe) |
| Dashboard 2.0: **Foco da Semana** | "Não quero números — quero saber em que avançar" | 0.5 dia (query + componente) |
| Dashboard 2.0: **Decisões Pendentes** | Coisas que precisam de ti, com contexto em 2-3 linhas | 0.5 dia (campo "needs_decision" nas iniciativas) |
| Integração com dashboards `EMPRESA/` | 5 dashboards HTML (Financeiro, Marketing, Vendas, Clientes, Executivo) com dados de Sheets | 1 dia (iframes embed + link da home) |
| Sync **ClickUp → outlier-os** | Não vais largar o ClickUp da equipa. Mas queres ver tudo num sítio. | 2 dias (Edge Function + cron 4/4h) |
| Sync **GHL → outlier-os** | Vendas, calls, opportunities num sítio só | 1 dia (já tens os JSONs, falta importer) |
| Sync **Sheets → outlier-os** | Marketing, Financeiro já lêem Sheets via JS no browser; mover para server | 1 dia |
| **Foco da Semana via Telegram** (Vasco) | Segunda 8h: "tens 3 coisas esta semana" | 0.5 dia |

**Esforço total estimado:** 8-10 dias úteis para uma versão completa que substitui a sensação de "perdido". Faseável em 3 sprints de 2-3 dias.

### O que falta para a app subir a produção pública

- Vercel deploy (token expirou)
- GitHub repo (faltou PAT)
- Domínio (`app.outlieragency.pt` proposto no PROGRESS.md)

Estas 3 são bloqueios meus que só tu desbloqueias. Posso correr local sem isto, mas se queres aceder do telemóvel/em qualquer lado precisas de Vercel.

---

## 2. Inventário de Iniciativas — Todas as fontes

### 2.1 PROJETOS/ (pasta local)

| Projeto | Estado | Recomendação |
|---|---|---|
| **outlier-os** | ATIVO, parado | **AVANÇAR** — é o sistema central que queres |
| **danielgodinho.pt** | ATIVO, à espera do Pombal no GHL | AVANÇAR — pingar o Pombal esta semana |
| **Curso Conteúdo Low-Ticket** | ATIVO (só currículo) | DECIDIR — produzir aulas ou parquear? Não pode ficar a meio. |
| **Conteudo/** (hub produção) | ATIVO | MANTER — usado para LP Incubadora, VSL, GHL scripts |
| **newsletter-godinho** | ATIVO | Verificar com Vasco se está a entregar como previsto |
| **brand-docs-sync** | ATIVO (cron) | MANTER em segundo plano |
| **gmail-triage** | ATIVO (cron) | MANTER em segundo plano |
| PLATAFORMA GESTÃO TAREFAS | PARQUEADO | **MATAR** — virou o outlier-os |
| clickup-scraper | PARQUEADO | **MATAR** — substituído por API direta |
| instagram-archiver | PARQUEADO | DECIDIR — usado? |
| instagram-generator | PARQUEADO | DECIDIR — usado? |
| task-manager | PARQUEADO (migrado cloud) | MANTER cloud, arquivar pasta local |
| whatsapp-agent | PARQUEADO (migrado cloud) | MANTER cloud, arquivar pasta local |
| criativos-10x-v2 | MORTO (vazia) | **APAGAR** |
| incubadora-landing | MORTO (substituído) | **APAGAR ou ARQUIVAR** |

### 2.2 ClickUp — Iniciativas estratégicas detetadas (≠ tarefas operacionais)

| Lista | Space | Estado | Recomendação |
|---|---|---|---|
| Plano ação último trimestre 2025 | Gestão | 6 open, parado | **DECIDIR** — relevante para Q3/Q4 2026 ou arquivar? |
| RoadMap de Melhorias Revenue | Revenue | 5 open | **AVANÇAR** — prioridade clara, Alcino + Daniel |
| Tarefas Rebranding | Clientes LT/Outlier | 6 open | DECIDIR — fazer agora ou parquear? |
| RoadmapPrioritários Liderança | Equipa | 9 open | **AVANÇAR** — afeta toda a equipa |
| Processos 2.0 Incubadora | Clientes LT/Daniel Godinho | 26 open, ativa Jan/26 | DECIDIR — completar ou parquear? |
| OKRs 2025 3ºT/4ºT | — | desatualizado | **ARQUIVAR** — substituir por OKRs Q3/Q4 2026 (módulo OKRs do outlier-os) |
| RoadMap de Implementação | Equipa | **19 open, parado desde Jan/2025** | **ARQUIVAR** — sintoma claro de "task graveyard" |
| Intake atas reuniões | Processos | 30 open, parado Jan/2025 | ARQUIVAR ou refazer no módulo Reuniões |
| DG/MJ Planner Social Media | — | 22 open cada, parados Fev/2025 | ARQUIVAR |
| Onboardings colaboradores antigos (Talita, Mariane, Leandro, Diogo) | Equipa | tasks abertas desde 2024 | **APAGAR** — colaboradores já saíram |

**Conclusão ClickUp:** 101 lists com >60 dias sem update. Operação de limpeza: **arquivar tudo o que está parado há >180 dias com responsável que já não existe**. Estimativa: 50-70% do ruído desaparece sem perder nada útil.

### 2.3 EMPRESA/ — Iniciativas de cliente/operacional

| Item | Tipo | Estado | Recomendação |
|---|---|---|---|
| Mentorias Joana Tereso 1-1 | Cliente (mentoria que dás) | Roadmap 12 sessões definido, ativa | AVANÇAR — está documentada |
| Fashion School recuperação | Cliente DFY em crise | ANALISE_REUNIAO_URGENCIA_MAIO2026.md existe | **DECISÃO TUA** — reúne-te com Renato (FLEXFIT?) ou continua? |
| Manuela Vilas-Boas (Dogga 6 meses) | Cliente, proposta | Proposta enviada | Seguir up |
| Paula Duarte & Márcio Lima | Mentoria 1-1, ativa | Email enviado | Acompanhar |
| 40+ ratings de calls Alcino | Operacional, contínuo | A produzir | MANTER — automatizado |
| Plano OTE Alcino | Estratégico, em Second Brain | Proposta escrita | **DECISÃO TUA** — aprovar mudança modelo comissões |

### 2.4 Memory files (project_*.md) — estado por área

| Área | Última nota | Sinal |
|---|---|---|
| Financeiro | Mai/26 — prejuízo 2025, receita -34% YoY, prestação 4.4k/m | 🔴 CRÍTICO — preside todas as outras decisões |
| Posicionamento marcas | Mai/26 — Outlier = agência generalista; Incubadora = ecossistema 3 níveis | 🟡 Estratégia nova, em implementação |
| Comercial Alcino | Mai/26 — modelo OTE proposto | 🟡 Aguarda decisão tua |
| Newsletter Godinho | construção | 🟡 Em curso |
| Vasco Persona Unificada | Mai/26 — Telegram + Claude Code consolidados | 🟢 Estável |
| Task Manager / WhatsApp Agent | Mai/26 — cloud Supabase | 🟢 Estável |
| Mentorias ativas (Core IA, Ladeira ×2) | Jun/26 — registadas hoje | 🆕 Precisa sistema |
| outlier-os app | Jun/26 — registada hoje | 🆕 Precisa retomar |

---

## 3. Mentorias / Cursos — Roadmap de implementação

### 3.1 As 3 mentorias que estás a frequentar

| Programa | Mentor | Plataforma | Fonte de extração |
|---|---|---|---|
| Core IA | Juliano Torriani | Plataforma própria | Daniel partilha playbook (1 vez) |
| Venda Todo Santo Dia | Leandro Ladeira | Hotmart | Manual — Hotmart sem API aberta |
| Stories 10x | Leandro Ladeira | Hotmart | Manual — idem |

### 3.2 O que vou construir no módulo Mentorias

**Schema novo (3 tabelas):**

```sql
-- Programa/curso (Core IA, VTSD, Stories 10x...)
create table mentorships (
  id uuid primary key,
  name text not null,           -- "Core IA"
  mentor text,                  -- "Juliano Torriani"
  platform text,                -- "Hotmart", "Plataforma própria"
  url text,                     -- link de acesso
  started_at date,
  status text default 'active', -- active|paused|completed
  notes text
);

-- Aulas/módulos dentro de cada programa
create table mentorship_modules (
  id uuid primary key,
  mentorship_id uuid references mentorships(id),
  title text not null,
  order_index int,
  consumed_at date,             -- quando viste
  key_insights text             -- 2-3 takeaways do módulo
);

-- Ações a implementar (saídas de cada módulo)
create table implementation_actions (
  id uuid primary key,
  mentorship_id uuid references mentorships(id),
  module_id uuid references mentorship_modules(id),
  action text not null,
  priority task_priority,
  status text default 'todo',   -- todo|doing|done|parked
  due_date date,
  task_id uuid references tasks(id), -- liga à task de execução
  created_at timestamptz default now(),
  done_at timestamptz
);
```

**UI:**
- `/mentorias` — lista de programas com % implementação
- `/mentorias/[id]` — módulos consumidos + ações pendentes + integrações
- "Implementar" num insight → cria task no módulo Tarefas (com link de volta)

### 3.3 As mentorias que DÁS (cliente)

Tu também és mentor. Não confundir. Estas vão para o módulo **Incubadora** (já existe) e **Clientes** (Mentorias 1-1 como Joana Tereso, Paula+Márcio).

---

## 4. Decisões pendentes — à tua espera para destravar

Por ordem de impacto:

| # | Decisão | Contexto | Bloqueador |
|---|---|---|---|
| 1 | **Fashion School: continuar ou cortar?** | Cliente DFY em crise documentada Maio/26 | Sem decisão = sangue lento |
| 2 | **Plano OTE Alcino — aprovar?** | Comercial 3.6 vendas/mês, modelo atual partido | Sem decisão = ele desmotiva |
| 3 | **Rebranding Outlier Agency: fazer agora ou Q3?** | 6 tasks abertas no ClickUp + decisão Mai/26 | Sem decisão = parado em ambíguo |
| 4 | **Vercel + GitHub PAT para outlier-os** | App pronta, deploy falhou em Mai | 5 min teus |
| 5 | **Curso Conteúdo Low-Ticket: produzir aulas?** | Currículo de 9 mód/40 aulas em pasta, nada gravado | Compromisso temporal |
| 6 | **Limpar ClickUp (101 lists paradas)** | Maioria são onboardings de ex-colaboradores | Vendo só com o teu OK |
| 7 | **Mentorias: começar pela Core IA, VTSD ou Stories 10x?** | Para roadmap de implementação | Sequência de execução |
| 8 | **Curso Low-Ticket vs Incubadora: posicionamento** | Posicionamento Mai/26 (Starter+Scale+Alpinista). Curso é Starter ou pré-Starter? | Estratégico |

---

## 5. Recomendações finais — o caminho prático

### Fase A — Esta semana (3-5h tuas, 8h minhas)

1. **Eu** apago/arquivo PROJETOS mortos (criativos-10x-v2, incubadora-landing).
2. **Eu** crio migration 0005 (tabelas iniciativas + mentorias) no outlier-os.
3. **Eu** crio rotas `/iniciativas` e `/mentorias` (CRUD básico).
4. **Eu** preencho com seed: as 12 iniciativas ativas que detetei + as 3 mentorias.
5. **Tu** geras Vercel token e GitHub PAT (5 min) → eu faço deploy.
6. **Tu** abres o app online e marcas as 8 decisões pendentes (campo `needs_decision`).

### Fase B — Próxima semana (Foco da Semana + integração)

1. **Eu** adiciono Dashboard 2.0 com Foco da Semana + Decisões Pendentes.
2. **Eu** embedo os 5 dashboards HTML EMPRESA dentro do app (drill-down).
3. **Eu** configuro Vasco da Gama para enviar Foco da Semana às segundas 8h Telegram.

### Fase C — Daqui a 2 semanas (sync externo)

1. Sync ClickUp → outlier-os (Edge Function 4/4h)
2. Sync GHL → outlier-os (vendas + calls)
3. Limpeza guiada do ClickUp (101 lists paradas)

### Compromisso de fechamento

**Antes de tudo isto começar, preciso que aceites uma regra:**
Esta auditoria mostra um padrão claro — começar projetos e não fechar. Para esta fase funcionar, comprometemo-nos a **não começar nada novo até a app outlier-os estar a ser usada por ti diariamente durante 2 semanas seguidas**. Sem essa regra, virei mais um item da lista de PROJETOS parqueados.

Se aceitas, respondes "ok regra aceite" e eu arranco a Fase A imediatamente.

---

## 6. O que NÃO está nesta auditoria (limitações)

- **Google Drive**: bloqueado por permissões MCP — destravar com `/permissions`
- **Hotmart (Ladeira)**: sem API aberta — precisas partilhar comigo notas/transcrições manuais
- **GHL detalhado**: tens JSONs (`ghl_vendas.json`, `ghl_calls.json`) mas não fui ler dentro — usar conforme necessário
- **Second Brain**: estrutura mapeada (15 pastas), mas conteúdo não lido em profundidade — fica para drill-down quando necessário
- **Conteúdo Ladeira/Juliano**: aguardo tu partilhares acesso/notas

---

## Anexos técnicos

- `clickup_dump.json` — árvore completa workspace (644 KB)
- `clickup_summary.json` — resumo executivo (10 KB)
- `projetos_dump.md` — auditoria PROJETOS detalhada por projeto
- `audit.mjs` — script reutilizável ClickUp (correr de novo quando precisares)
