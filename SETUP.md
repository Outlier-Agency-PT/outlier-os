# Setup do Outlier OS

Guia passo-a-passo para arrancar o projeto a primeira vez.

## Pré-requisitos

- ✅ Node 18+ (tens 24)
- ✅ npm 10+ (tens 11)
- ✅ Conta Supabase
- ✅ Conta Vercel (para deploy)

## Passo 1 — Criar projeto Supabase novo

> Recomendado: **projeto novo** (não usar o do Task Manager). Mantém limpo.

1. Vai a https://supabase.com/dashboard
2. **New Project**
   - Nome: `outlier-os`
   - Region: `West EU (Ireland)` ou mais perto
   - Database password: **guarda numa password manager** (não vai voltar a aparecer)
3. Espera ~2 min até estar pronto

## Passo 2 — Variáveis de ambiente

```bash
cp .env.example .env.local
```

Edita `.env.local` com:

- **NEXT_PUBLIC_SUPABASE_URL**: Settings → API → Project URL
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Settings → API → Project API keys → `anon` `public`
- **SUPABASE_SERVICE_ROLE_KEY**: Settings → API → Project API keys → `service_role` `secret`

> ⚠️ **service_role** dá bypass de RLS — nunca exponhas ao browser nem commites.

## Passo 3 — Aplicar migrations no Supabase

### Opção A: Via SQL Editor (mais simples)
1. Supabase Dashboard → SQL Editor → New query
2. Cola o conteúdo de `supabase/migrations/0001_initial_schema.sql` → Run
3. Cola `0002_rls_policies.sql` → Run
4. Cola `0003_seed_defaults.sql` → Run

### Opção B: Via Supabase CLI (recomendado para futuro)
```bash
npx supabase login
npx supabase link --project-ref <PROJECT-REF>   # encontras em Settings → General
npx supabase db push
```

## Passo 4 — Criar primeiro utilizador

1. Supabase Dashboard → Authentication → Users → **Add user**
2. Email: `daniel@danielgodinho.pt`
3. Password: define uma forte
4. Auto-confirm user: ✅ ON
5. **Create user**

> O trigger `on_auth_user_created` cria automaticamente um `team_members` com `role='admin'` (porque é o primeiro user).

## Passo 5 — Arrancar o app

```bash
npm install      # já corre automaticamente, ~3 min
npm run dev      # arranca em http://localhost:3000
```

1. Abre http://localhost:3000 → redirect para `/login`
2. Login com email + password do passo 4
3. Vais para `/dashboard` — deves ver KPIs a 0

## Passo 6 — Validar

Testa que:
- ✅ Login funciona
- ✅ Sidebar tem 13 módulos
- ✅ Dashboard carrega sem erros
- ✅ Modo escuro alterna
- ✅ Cada módulo abre (com placeholder "Sprint X" no caso dos não implementados)
- ✅ Logout funciona

## Próximos passos (Sprint 1)

A entregar nas próximas iterações:
1. **Clientes** — CRUD, lista, detalhe, dashboard partilhado
2. **Tarefas** — kanban, tabela, time tracking, comentários
3. **Equipa** — gestão de membros, permissões granulares
4. **Configurações** — gestão de stages

## Troubleshooting

### "permission denied for table X" no SQL Editor
Estás a correr o SQL com user errado. No SQL Editor garante que usas o role `postgres` (default). Migrations correm com privileges de superuser.

### Login funciona mas sidebar não carrega
Verifica:
1. O trigger `on_auth_user_created` correu? Vai a Supabase → Database → Tables → `team_members` e confirma que tens a tua linha.
2. Se não tiveres, insere manualmente:
   ```sql
   insert into team_members (id, full_name, email, role)
   values ('<auth-user-id>', 'Daniel Godinho', 'daniel@danielgodinho.pt', 'admin');
   ```

### "Module not found" em runtime
Falta `npm install` ou faltou regenerar tipos:
```bash
rm -rf node_modules .next
npm install
```

### Build falha com erros de tipo
Os tipos da BD estão como placeholder em `types/database.ts`. Para tipos exatos:
```bash
npx supabase gen types typescript --project-id <PROJECT-REF> > types/database.ts
```

## Deploy Vercel (quando estiver pronto)

```bash
# 1. Push para GitHub (privado)
git init
git add .
git commit -m "Initial: Outlier OS Sprint 1 foundation"
gh repo create outlier-os --private --source=. --push

# 2. Importar para Vercel
# - https://vercel.com/new
# - Import outlier-os
# - Adicionar env vars (mesmas do .env.local)
# - Deploy
```
