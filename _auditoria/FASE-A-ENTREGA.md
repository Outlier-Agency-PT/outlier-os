# Fase A — Entrega (10 Jun 2026)

## O que foi feito (autónomo, sem input teu)

### Limpeza
- ✅ `PROJETOS/criativos-10x-v2/` — apagada (pasta vazia)
- ✅ `PROJETOS/incubadora-landing/` → renomeada `_arquivo_incubadora-landing/`

### App outlier-os extendida
- ✅ Migration **`0005_initiatives_mentorships_decisions.sql`** — 6 tabelas novas + RLS + activity_log
- ✅ Migration **`0006_seed_decision_layer.sql`** — seed das 12 iniciativas + 3 mentorias + 8 decisões reais detetadas na auditoria
- ✅ Sidebar com nova secção **ESTRATÉGIA** (Iniciativas · Decisões · Mentorias)
- ✅ 3 rotas novas: `/iniciativas`, `/iniciativas/[id]`, `/mentorias`, `/mentorias/[id]`, `/decisoes`
- ✅ Tipos TypeScript + query functions + server actions completas
- ✅ Botão "Nova Iniciativa" funcional com formulário Dialog
- ✅ Build TypeScript verde, zero erros

## O que precisas de fazer (3 passos · ~5 minutos)

### Passo 1 — Aplicar migrations no Supabase (2 min)

1. Abre https://supabase.com/dashboard/project/dsfzhrodcxtlayxcfjpx/sql/new
2. Copia **TODO** o conteúdo de `supabase/migrations/0005_initiatives_mentorships_decisions.sql`
3. Cola no SQL Editor
4. Clica **Run** (canto inferior direito)
5. Repete com `supabase/migrations/0006_seed_decision_layer.sql`

Resultado esperado: "Success. No rows returned" duas vezes.

### Passo 2 — Validar localmente (1 min)

```bash
cd "PROJETOS/outlier-os"
npm run dev
```

Abre http://localhost:3000, login com daniel@danielgodinho.pt, vai a:
- `/iniciativas` → deves ver 12 iniciativas, agrupadas por status
- `/decisoes` → deves ver as 8 decisões pendentes
- `/mentorias` → deves ver Core IA, VTSD, Stories 10x

### Passo 3 — Tokens para deploy público (2 min)

Quando estiveres pronto para usar fora do localhost:

1. **Vercel token**: https://vercel.com/account/tokens → Create (qualquer nome) → copia
2. **GitHub PAT**: https://github.com/settings/tokens/new → scope `repo` → Generate
3. Cola ambos no `.env.local` da pasta:
   ```
   VERCEL_TOKEN=...
   GH_TOKEN=ghp_...
   ```
4. Diz-me "tokens prontos" e eu faço deploy + crio repo

## Os primeiros passos a fazer DENTRO da app (regra dos 2 semanas)

Para começares a usar diariamente:

1. **Marca o foco da semana** — em `/iniciativas`, abre as 3 mais críticas (Fashion School, OTE Alcino, Vercel Deploy) e marca `focus_this_week = true` (manualmente via Supabase Studio ou usar o form de edição quando estiver pronto)
2. **Resolve 1 decisão pendente por dia** — abre `/decisoes` e marca uma como "decidida" com o texto da decisão tomada
3. **Cria 1 nova iniciativa quando aparecer um novo projeto/ideia** — em vez de abrir ClickUp ou guardar em PROJETOS/

## Estado da auditoria — fontes externas

| Fonte | Estado |
|---|---|
| Local (`EMPRESA/`, `Second Brain/`, memory files) | ✅ auditado |
| ClickUp API (10 spaces, 116 lists, 1.399 tasks) | ✅ auditado, dump em `clickup_dump.json` |
| Google Drive | ❌ bloqueado por permissões MCP (`/permissions` allow para destravar) |
| GHL (vendas + calls) | ✅ JSONs já existentes em `EMPRESA/VENDAS/` |

## Próximas Fases (após 2 semanas de uso diário)

**Fase B — Dashboard 2.0 + Embed EMPRESA** (3-4 dias)
- Dashboard com "Foco da Semana" e "Decisões Pendentes" inline
- Embed dos 5 dashboards HTML em `/dashboards` (Marketing, Vendas, Financeiro, Clientes, Executivo)

**Fase C — Sincronizações + Integração Vasco** (1 semana)
- Sync ClickUp → Supabase (Edge Function 4/4h)
- Sync GHL → Supabase (vendas/calls/opportunities)
- Sync Sheets → Supabase (marketing/financeiro)
- Vasco da Gama envia Foco da Semana via Telegram às segundas 8h

---

## Lembrete: regra aceite em 10/Jun/26

> Não começamos NADA novo até a app outlier-os estar a ser usada por ti diariamente durante 2 semanas seguidas.

Se aparecerem novas ideias entretanto, **regista como iniciativa com status `ideia`** dentro da app. Não começar a executar.
