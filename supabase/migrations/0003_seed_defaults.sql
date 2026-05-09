-- ============================================================
-- Outlier OS — Seed default data
-- Stages, categorias e tipos de sessão padrão
-- ============================================================

-- Client statuses
insert into client_statuses (key, label, color, sort_order) values
  ('ativo', 'Ativo', '#10B981', 1),
  ('pausado', 'Pausado', '#F59E0B', 2),
  ('concluido', 'Concluído', '#6B7280', 3),
  ('cancelado', 'Cancelado', '#EF4444', 4)
on conflict (key) do nothing;

-- Task statuses
insert into task_statuses (key, label, color, sort_order) values
  ('backlog', 'Backlog', '#6B7280', 1),
  ('a_fazer', 'A Fazer', '#F59E0B', 2),
  ('em_progresso', 'Em Progresso', '#3B82F6', 3),
  ('review', 'Review', '#8B5CF6', 4),
  ('aprovacao', 'Aprovação', '#F97316', 5),
  ('concluido', 'Concluído', '#10B981', 6)
on conflict (key) do nothing;

-- Launch statuses
insert into launch_statuses (key, label, color, sort_order) values
  ('planeamento', 'Planeamento', '#6B7280', 1),
  ('administrativo', 'Administrativo', '#0EA5E9', 2),
  ('onboarding', 'Onboarding', '#F59E0B', 3),
  ('operacoes', 'Operações', '#8B5CF6', 4),
  ('novas_tarefas', 'Novas Tarefas', '#F97316', 5),
  ('concluido', 'Concluído', '#10B981', 6),
  ('cancelado', 'Cancelado', '#EF4444', 7)
on conflict (key) do nothing;

-- Content statuses (workflow editorial 9 stages)
insert into content_statuses (key, label, color, sort_order) values
  ('ideia', 'Ideia', '#6B7280', 1),
  ('aprovacao_ideia', 'Aprovação Ideia', '#F59E0B', 2),
  ('aprovado', 'Aprovado', '#10B981', 3),
  ('design', 'Design', '#8B5CF6', 4),
  ('copy', 'Copy', '#3B82F6', 5),
  ('aprovacao_final', 'Aprovação Final', '#F97316', 6),
  ('agendado', 'Agendado', '#0EA5E9', 7),
  ('publicado', 'Publicado', '#10B981', 8),
  ('rejeitado', 'Rejeitado', '#EF4444', 9)
on conflict (key) do nothing;

-- Process categories
insert into process_categories (key, label, color, sort_order) values
  ('trafego', 'Tráfego', '#3B82F6', 1),
  ('conteudo', 'Conteúdo', '#8B5CF6', 2),
  ('onboarding', 'Onboarding', '#10B981', 3),
  ('vendas', 'Vendas', '#F97316', 4),
  ('administrativo', 'Administrativo', '#6B7280', 5),
  ('estrategia', 'Estratégia', '#F59E0B', 6),
  ('design', 'Design', '#EC4899', 7),
  ('incubadora', 'Incubadora', '#0EA5E9', 8)
on conflict (key) do nothing;

-- Financial categories — Receita
insert into financial_categories (type, name, color, is_default, sort_order) values
  ('receita', 'Avenças', '#10B981', true, 1),
  ('receita', 'Consultoria', '#34D399', true, 2),
  ('receita', 'Incubadora', '#10B981', true, 3),
  ('receita', 'Lançamentos Master', '#10B981', true, 4),
  ('receita', 'Lançamentos Premium', '#10B981', true, 5),
  ('receita', 'Lançamentos Traffic', '#10B981', true, 6),
  ('receita', 'Outros (Receita)', '#A7F3D0', true, 7)
on conflict (type, name) do nothing;

-- Financial categories — Despesa
insert into financial_categories (type, name, color, is_default, sort_order) values
  ('despesa', 'Equipa/Salários', '#EF4444', true, 1),
  ('despesa', 'Escritório', '#EF4444', true, 2),
  ('despesa', 'Ferramentas/Software', '#EF4444', true, 3),
  ('despesa', 'Impostos', '#FCA5A5', true, 4),
  ('despesa', 'Outros (Despesa)', '#FECACA', true, 5),
  ('despesa', 'Publicidade/Ads', '#EF4444', true, 6),
  ('despesa', 'Subcontratados', '#7F1D1D', true, 7)
on conflict (type, name) do nothing;

-- Tipos de sessão da Incubadora
insert into student_session_types (key, label, sort_order) values
  ('sessao_inicial', 'Sessão Inicial', 1),
  ('hotseat_1', 'Hotseat #1', 2),
  ('sessao_estrategica_1', 'Sessão Estratégica 1', 3),
  ('hotseat_2', 'Hotseat #2', 4),
  ('sessao_estrategica_2', 'Sessão Estratégica 2', 5),
  ('hotseat_3', 'Hotseat #3', 6)
on conflict (key) do nothing;
