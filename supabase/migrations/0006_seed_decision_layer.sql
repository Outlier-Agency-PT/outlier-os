-- ============================================================
-- 0006 — Seed inicial Decision Layer (Jun/2026)
-- Iniciativas, mentorias e decisões extraídas da auditoria 10/Jun/2026
-- IDEMPOTENTE: usa ON CONFLICT para poder correr múltiplas vezes
-- ============================================================

-- ============================================================
-- MENTORIAS ATIVAS DO DANIEL
-- ============================================================

insert into mentorships (id, name, mentor, platform, status, cover_emoji, description, started_at) values
  ('11111111-0000-0000-0000-000000000001', 'Core IA', 'Juliano Torriani', 'Plataforma própria', 'ativa', null,
   'Programa de IA aplicada a negócio. Daniel pode partilhar acesso ao playbook para mapeamento dos módulos.', null),
  ('11111111-0000-0000-0000-000000000002', 'Venda Todo Santo Dia', 'Leandro Ladeira', 'Hotmart', 'ativa', null,
   'Programa de vendas digitais — copywriting, posicionamento, conversão.', null),
  ('11111111-0000-0000-0000-000000000003', 'Stories 10x', 'Leandro Ladeira', 'Hotmart', 'ativa', null,
   'Programa de produção de stories de alta performance no Instagram.', null)
on conflict (id) do nothing;

-- ============================================================
-- INICIATIVAS — 12 ativas detetadas na auditoria
-- (sem owner_id real porque não sabemos quais são os UUIDs do team_members)
-- ============================================================

insert into initiatives (id, title, description, status, priority, source, next_step, blocker, focus_this_week, needs_decision, decision_context, expected_impact, expected_effort, tags) values

  ('22222222-0000-0000-0000-000000000001',
   'Outlier OS — usar diariamente',
   'A app está construída e Daniel comprometeu-se em Jun/26 a usá-la diariamente por 2 semanas antes de começar qualquer projeto novo. Esta é a iniciativa mãe.',
   'em_curso', 'critica', 'interno',
   'Aplicar migration 0005 + 0006 no Supabase Studio. Fazer login. Marcar foco semana.',
   null, true, false, null,
   'transformacional — destrava o resto', 'M', array['outlier-os', 'meta']),

  ('22222222-0000-0000-0000-000000000002',
   'Fashion School — decisão de continuidade',
   'Cliente DFY em crise documentada Maio/26. Reunião de urgência prevista. Decisão: continuar, renegociar ou cortar?',
   'em_curso', 'critica', 'crise',
   'Marcar reunião com cliente esta semana e decidir caminho',
   'Sem decisão = sangue lento', true, true,
   'Cliente em crise. 3 opções: A) cortar B) renegociar valor/escopo C) continuar 3 meses com plano de recuperação.',
   'alto — afeta MRR e moral da equipa', 'M', array['cliente', 'crise']),

  ('22222222-0000-0000-0000-000000000003',
   'Plano OTE Comercial Alcino',
   'Alcino 3.6 vendas/mês (Jan–Mai). Modelo atual partido (10% margem dividida = quase 0€). Plano OTE proposto em Second Brain/Equipa/Comercial.',
   'em_curso', 'alta', 'interno',
   'Daniel revê proposta + agenda call com Alcino para apresentar',
   null, true, true,
   'Proposta escrita. Tu validas estrutura, depois Alcino aceita ou negocia.',
   'alto — motivação comercial direta', 'S', array['comercial', 'OTE']),

  ('22222222-0000-0000-0000-000000000004',
   'Vercel + GitHub deploy outlier-os',
   'App pronta há 1 mês mas sem deploy público (token Vercel expirou + falta GitHub PAT).',
   'planeamento', 'alta', 'interno',
   'Daniel gera Vercel token + GitHub PAT (5 min), envia ao Claude que faz deploy',
   'Aguarda tokens do Daniel', true, true,
   'Sem isto, não há acesso de telemóvel à app.',
   'baixo isolado, alto se destrava uso', 'S', array['outlier-os', 'deploy']),

  ('22222222-0000-0000-0000-000000000005',
   'danielgodinho.pt — site novo',
   'Mockup v2.0 com SEO/GEO/AEO está pronto. Aguarda implementação no GHL pelo Pombal.',
   'em_curso', 'media', 'interno',
   'Pingar Pombal esta semana sobre estado do build',
   'Aguardando Pombal', false, false, null,
   'medio — site institucional renovado', 'M', array['site', 'GHL', 'pombal']),

  ('22222222-0000-0000-0000-000000000006',
   'Curso Conteúdo Low-Ticket',
   'Currículo 9 módulos / 40 aulas definido em PROJETOS/. Zero aulas gravadas.',
   'em_pausa', 'media', 'interno',
   'DECISÃO: produzir aulas ou parquear formalmente?',
   'Sem compromisso temporal', false, true,
   'Posicionamento com Incubadora não está claro (#8). Decidir #8 primeiro.',
   'medio — produto entry', 'XL', array['curso', 'incubadora']),

  ('22222222-0000-0000-0000-000000000007',
   'Roadmap Melhorias Revenue (ClickUp)',
   '5 tarefas abertas em ClickUp/Revenue/RoadMap de Melhorias.',
   'em_curso', 'alta', 'interno',
   'Rever as 5 tasks e priorizar 1-2 esta semana',
   null, false, false, null,
   'alto — receita direta', 'M', array['revenue', 'clickup']),

  ('22222222-0000-0000-0000-000000000008',
   'Processos 2.0 Incubadora',
   '26 tarefas abertas em ClickUp desde Jan/26. Definir SOPs operacionais Incubadora.',
   'em_pausa', 'media', 'interno',
   'DECISÃO: retomar agora ou parquear até Q3?',
   'Capacidade de execução', false, true,
   'Tens 26 tasks abertas. Ou retomas com intensidade ou arquivas as obsoletas.',
   'medio — escala da Incubadora', 'L', array['incubadora', 'processos']),

  ('22222222-0000-0000-0000-000000000009',
   'Tarefas Rebranding Outlier',
   '6 tasks abertas no ClickUp para rebranding Outlier Agency.',
   'em_pausa', 'baixa', 'interno',
   'DECISÃO: fazer agora ou Q3?',
   null, false, true,
   'Posicionamento Mai/26 aprovou: Outlier = agência generalista. Rebrand reflete isso.',
   'medio — alinhamento marca', 'L', array['rebranding']),

  ('22222222-0000-0000-0000-000000000010',
   'Limpeza ClickUp (101 lists paradas)',
   '101 lists com >60 dias sem update. Maioria são onboardings de ex-colaboradores. Operação de arquivo em massa.',
   'planeamento', 'media', 'interno',
   'Claude propõe lista batch, Daniel valida com OK por categoria',
   null, false, true,
   'Eu faço operação, tu só validas 5-10 categorias.',
   'medio — clareza mental', 'M', array['clickup', 'limpeza']),

  ('22222222-0000-0000-0000-000000000011',
   'Mentoria 1-1 Joana Tereso',
   'Cliente de mentoria com roadmap 12 sessões definido em EMPRESA/Mentorias/Joana Tereso. Plano lançamento meteórico documentado.',
   'em_curso', 'alta', 'cliente',
   'Continuar sessões conforme roadmap',
   null, false, false, null,
   'medio — receita 1-1', 'M', array['cliente', 'mentoria-1-1']),

  ('22222222-0000-0000-0000-000000000012',
   'Newsletter Daniel Godinho — pipeline',
   'Pipeline semanal multi-fonte (Drive+RSS+Twitter+Fireflies+Claude+GHL). Em construção.',
   'em_curso', 'media', 'interno',
   'Validar com Vasco se entrega semanal está a sair como previsto',
   null, false, false, null,
   'medio — autoridade marca pessoal', 'S', array['newsletter', 'marca-pessoal'])

on conflict (id) do nothing;

-- ============================================================
-- DECISÕES PENDENTES — as 8 detetadas + ordem proposta
-- ============================================================

insert into decisions (id, title, context, options, status, impact, urgency, initiative_id) values

  ('33333333-0000-0000-0000-000000000001',
   'Vercel token + GitHub PAT para outlier-os',
   'App pronta há 1 mês mas sem deploy público. Sem isto, sem acesso fora do localhost.',
   'A) gerar tokens agora (5 min) e Claude faz deploy · B) deixar local-only por enquanto',
   'pendente', 'alto', 'esta semana',
   '22222222-0000-0000-0000-000000000004'),

  ('33333333-0000-0000-0000-000000000002',
   'Fashion School — continuar ou cortar?',
   'Cliente DFY em crise documentada Maio/26. Reunião de urgência prevista.',
   'A) cortar e refundir parte · B) renegociar valor/escopo · C) continuar 3 meses com plano',
   'pendente', 'critico', 'esta semana',
   '22222222-0000-0000-0000-000000000002'),

  ('33333333-0000-0000-0000-000000000003',
   'OTE Alcino — aprovar plano?',
   'Modelo atual partido. Plano proposto em Second Brain/Equipa/Comercial/plano-ote-comercial-outlier.md',
   'A) aprovar como está · B) refinar antes · C) reunir Alcino para co-construir',
   'pendente', 'alto', 'esta semana',
   '22222222-0000-0000-0000-000000000003'),

  ('33333333-0000-0000-0000-000000000004',
   'Limpar ClickUp — 101 lists paradas',
   'Maioria são onboardings de ex-colaboradores (Talita, Mariane, Leandro, Diogo) e roadmaps abandonados.',
   'A) Claude propõe limpeza por categoria, Daniel valida · B) Daniel limpa manualmente · C) deixar como está',
   'pendente', 'medio', 'próxima semana',
   '22222222-0000-0000-0000-000000000010'),

  ('33333333-0000-0000-0000-000000000005',
   'Ordem das 3 mentorias (Core IA, VTSD, Stories 10x)',
   'Por qual começar a mapear módulos + ações de implementação?',
   'A) Core IA (mais aplicável ao negócio) · B) VTSD (resultado mais rápido em vendas) · C) Stories 10x (orgânico)',
   'pendente', 'medio', 'próxima semana',
   null),

  ('33333333-0000-0000-0000-000000000006',
   'Posicionamento — Curso Low-Ticket vs Incubadora',
   'Posicionamento Mai/26 define Incubadora como ecossistema 3 níveis (Starter+Scale+Alpinista). Curso é Starter ou pré-Starter?',
   'A) Curso = nível "pré-Starter" para lead magnet · B) Curso substitui Starter · C) Curso fora do ecossistema (standalone)',
   'pendente', 'alto', '2 semanas',
   null),

  ('33333333-0000-0000-0000-000000000007',
   'Curso Conteúdo Low-Ticket — produzir aulas?',
   'Currículo 9 módulos/40 aulas pronto. Zero gravadas. Decisão depende de #6.',
   'A) gravar todas (1-2 meses) · B) gravar primeiros 3 módulos como MVP · C) parquear até Q3',
   'pendente', 'medio', '2 semanas',
   '22222222-0000-0000-0000-000000000006'),

  ('33333333-0000-0000-0000-000000000008',
   'Rebranding Outlier — agora ou Q3?',
   '6 tasks abertas em ClickUp. Posicionamento Mai/26 aprovado mas execução parada.',
   'A) janela Jun-Jul · B) Q3 (Set-Out) · C) parquear até receita estabilizar',
   'pendente', 'medio', '2 semanas',
   '22222222-0000-0000-0000-000000000009')

on conflict (id) do nothing;
