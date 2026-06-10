# Auditoria de Projetos — 2026-06-10

Auditoria automática da pasta `PROJETOS/` + folders paralelos relevantes em `Claude Code Projects/`.

Critérios de estado:
- **ATIVO** — atividade nos últimos 30 dias (após 2026-05-11) OU PROGRESS atualizado
- **PARQUEADO** — atividade entre 30 e 90 dias (2026-03-12 → 2026-05-10)
- **MORTO** — sem atividade há mais de 90 dias (antes de 2026-03-12)

---

## PROJETOS/

### outlier-os
- **Path:** `c:\Users\utilizadoroutlier\Claude Code Projects\PROJETOS\outlier-os\`
- **Stack:** Next.js 15 + React 19 + Supabase (SSR auth) + shadcn/ui + Tailwind + TanStack Query + Zustand + dnd-kit + Recharts + TipTap. Repo git local.
- **Última atividade:** 2026-06-10 (auditoria automática); último commit 2026-05-14 23:29 — `feat: features importantes 🟡`
- **README/PROGRESS:** Sistema operacional interno da Outlier Agency, substitui ClickUp + Task Manager + plataforma do prestador externo. PROGRESS.md (2026-05-10) declara 4 sprints concluídos: 13 módulos (Dashboard, Clientes, Tarefas, Lançamentos, Conteúdo, Incubadora, Relatórios, Financeiro, OKRs, Processos, Reuniões, Equipa, Configurações), 30 tabelas Supabase com RLS, dashboard partilhado público `/share/[token]`, activity log via triggers. Lacunas: deploy Vercel (token expirado) e GitHub PAT (não pediu).
- **Estado aparente:** **ATIVO**

### PLATAFORMA GESTÃO TAREFAS OUTLIER
- **Path:** `c:\Users\utilizadoroutlier\Claude Code Projects\PROJETOS\PLATAFORMA GESTÃO TAREFAS OUTLIER\`
- **Stack:** Spec técnica + 62 screenshots de auditoria (PNG). Sem código.
- **Última atividade:** 2026-05-09 (`SPEC_TECNICA.md`)
- **README/PROGRESS:** `SPEC_TECNICA.md` (~10k linhas) é a spec original que originou o outlier-os. Documenta 24 tabelas, 13 módulos, 4 sprints, fluxos críticos. Já consumida pelo rebuild.
- **Estado aparente:** **PARQUEADO** (input source — função cumprida, materializou-se em `outlier-os`)

### danielgodinho.pt
- **Path:** `c:\Users\utilizadoroutlier\Claude Code Projects\PROJETOS\danielgodinho.pt\`
- **Stack:** HTML/CSS estático single-page (mockup) + llms.txt + robots.txt + schema.org JSON-LD. Alvo: GoHighLevel.
- **Última atividade:** 2026-05-18 (`index.html`)
- **README/PROGRESS:** Hub marca pessoal Daniel Godinho (3 projetos + newsletter + canais gratuitos + pillar page). Mockup v2.0 pronto com repositioning Outlier (agência de publicidade online) + Incubadora (ecossistema Starter+Scale+Alpinista). SEO/GEO/AEO completo (14 crawlers de IA permitidos). Aguarda validação final + build no GHL pelo Pombal.
- **Estado aparente:** **ATIVO**

### Curso Conteúdo Low-Ticket
- **Path:** `c:\Users\utilizadoroutlier\Claude Code Projects\PROJETOS\Curso Conteúdo Low-Ticket\`
- **Stack:** Markdown (currículo). Sem código.
- **Última atividade:** 2026-05-22 (`01-CURRICULO-DETALHADO.md`)
- **README/PROGRESS:** Currículo do curso low-ticket "30 dias para crescer no Instagram e fazer a tua primeira venda online" (€27-47, lead funnel para Incubadora). 9 módulos / 40 aulas / ~5h. Posicionamento + estrutura globais definidos. Sem aulas produzidas ainda.
- **Estado aparente:** **ATIVO** (planeamento)

### criativos-10x-v2
- **Path:** `c:\Users\utilizadoroutlier\Claude Code Projects\PROJETOS\criativos-10x-v2\`
- **Stack:** N/D — pasta vazia.
- **Última atividade:** 2026-05-22 (criação da pasta, sem ficheiros)
- **README/PROGRESS:** Sem ficheiros.
- **Estado aparente:** **MORTO** (placeholder vazio)

### incubadora-landing
- **Path:** `c:\Users\utilizadoroutlier\Claude Code Projects\PROJETOS\incubadora-landing\`
- **Stack:** HTML estático único.
- **Última atividade:** 2026-03-19 (`index.html`)
- **README/PROGRESS:** Sem README. Apenas `index.html` (26 KB). Provavelmente substituída pela LP v2.0 em `Conteudo/mockup_lp_incubadora.html` (2026-05-27).
- **Estado aparente:** **MORTO** (substituída)

---

## Folders paralelos (Claude Code Projects/)

### Conteudo
- **Path:** `c:\Users\utilizadoroutlier\Claude Code Projects\Conteudo\`
- **Stack:** Node.js (Playwright + stealth) + Python (transcribe_vtsd, publicar_semana_auto). Sem git.
- **Última atividade:** 2026-05-27 (`mockup_lp_incubadora.html`)
- **README/PROGRESS:** Sem README. Hub de produção de conteúdo: scripts GHL (scheduler, publicar semana, cookies), análises e auditorias de LP/VSL Incubadora (Antonio Vieira, v2 completa), script VSL, transcrição VTSD, geração de carrosséis semanais (vários `Carrossel_2026-04-*`), mockup LP Incubadora v2.
- **Estado aparente:** **ATIVO**

### clickup-scraper
- **Path:** `c:\Users\utilizadoroutlier\Claude Code Projects\clickup-scraper\`
- **Stack:** Node.js + Playwright + marked + md-to-pdf. Sem git.
- **Última atividade:** 2026-06-10 (`.env` tocado hoje) — código em si: 2026-03-26 (debug-api.js, extract-all-subpages.js, etc.)
- **README/PROGRESS:** Sem README. Vários scripts de extração de docs/subpages do ClickUp + screenshots de debug. Bloqueado por password ClickUp (per memory: `project_clickup_docs_pending.md`).
- **Estado aparente:** **PARQUEADO** (env tocado recentemente mas código não)

### brand-docs-sync
- **Path:** `c:\Users\utilizadoroutlier\Claude Code Projects\brand-docs-sync\`
- **Stack:** Python (google-api-python-client, anthropic, PyPDF2, python-docx, python-pptx) + .bat scheduler.
- **Última atividade:** 2026-06-08 (`logs/run_2026-06-08.log`) — código: 2026-04-04 (`upload_assets_drive.py`); sync_and_process.py de 2026-04-03
- **README/PROGRESS:** Sem README. Pipeline a correr via scheduler semanal (logs cada Mon: 04-06, 04-13, ..., 06-01, 06-08). Sync docs marca → processamento local → upload Drive.
- **Estado aparente:** **ATIVO** (cron a correr embora código estável)

### gmail-triage
- **Path:** `c:\Users\utilizadoroutlier\Claude Code Projects\gmail-triage\`
- **Stack:** Python (Gmail API + classificador) + .bat scheduler.
- **Última atividade:** 2026-06-09 (`token.pickle` refresh) — código: 2026-03-31 (`triage.py`), 2026-03-30 (`labeler.py`), 2026-04-01 (`extract_newsletters.py`)
- **README/PROGRESS:** Sem README. Scripts: cleanup, labeler, triage, extract_newsletters. Token Gmail a renovar diariamente → corre via tarefa agendada.
- **Estado aparente:** **ATIVO** (cron a correr)

### instagram-archiver
- **Path:** `c:\Users\utilizadoroutlier\Claude Code Projects\instagram-archiver\`
- **Stack:** Node.js + Playwright. Sem git.
- **Última atividade:** 2026-04-04 (`archive.js`)
- **README/PROGRESS:** Sem README. Apenas `archive.js` (6 KB).
- **Estado aparente:** **PARQUEADO**

### instagram-generator
- **Path:** `c:\Users\utilizadoroutlier\Claude Code Projects\instagram-generator\`
- **Stack:** Client React 18 + Vite + Tailwind + html2canvas + jszip + react-beautiful-dnd; Server Express + Anthropic SDK + Puppeteer + archiver.
- **Última atividade:** 2026-05-13 (`_iniciar.bat`); código src: 2026-04-04 a 2026-04-06; pastas client/server tocadas 2026-05-19 (instalação?)
- **README/PROGRESS:** Sem README. Cliente + servidor para gerar posts Instagram para a marca Daniel Godinho.
- **Estado aparente:** **PARQUEADO** (mexido em Mai mas código sem evolução desde Abr)

### newsletter-godinho
- **Path:** `c:\Users\utilizadoroutlier\Claude Code Projects\newsletter-godinho\`
- **Stack:** Node.js + Supabase (Edge Functions + migrations) + Claude SDK + Google APIs + GHL API + Gmail API + Fireflies + RSS parser. GitHub Actions presente (`.github/`).
- **Última atividade:** 2026-05-20 (`scripts/print_github_secrets.js`, `SETUP_GITHUB.md`)
- **README/PROGRESS:** Pipeline automatizado: SEX→QUA ingestores → QUA 09h composer gera draft no GHL → Daniel valida → QUI 09h envio. Fontes: WhatsApp Dicas (Fireflies), Incubadora 2.0 metadata, Instagram (Meta Graph), RSS+Google News+Twitter, Conteúdo antigo. Schema Supabase + Edge Functions + pg_cron.
- **Estado aparente:** **ATIVO** (per memory: `project_newsletter_godinho.md` indica trabalho em curso)

### task-manager
- **Path:** `c:\Users\utilizadoroutlier\Claude Code Projects\task-manager\`
- **Stack:** Server Node.js + Express + (originalmente SQLite, migrado para Supabase pg); Client React + TypeScript + Vite. Repo git local.
- **Última atividade:** 2026-04-16 (`supabase/migrations/005_enable_rls.sql`); último commit 2026-03-20 — `fix: auto-schedule nunca agenda no passado`
- **README/PROGRESS:** Aplicação pessoal de gestão de tarefas + roadmap + notificações Windows e WhatsApp via Evolution API. SUPABASE_SETUP.md detalha migração de SQLite para Supabase. Per memory: migrado 100% para Supabase Edge Functions + Vercel (cloud-only).
- **Estado aparente:** **PARQUEADO** (cloud-only agora; local sem evolução desde Abr)

### whatsapp-agent
- **Path:** `c:\Users\utilizadoroutlier\Claude Code Projects\whatsapp-agent\`
- **Stack:** Docker compose (Evolution API self-hosted) + Bot Node.js (Claude SDK + RAG via ChromaDB) + Ingestion Python (Whisper opcional + Drive sync + Second Brain). Sem git.
- **Última atividade:** 2026-04-03 (todos os ficheiros). Bot/ tocado 2026-03-18; ingestion/ 2026-04-03
- **README/PROGRESS:** Suporte automático WhatsApp via Claude + Second Brain (RAG). Anti-ban, escalação para humano, delay humano. Per memory: migrado para Supabase mas webhook Evolution ainda não configurado.
- **Estado aparente:** **PARQUEADO** (sem evolução de código local desde Abr; trabalho terá migrado para a versão cloud)
