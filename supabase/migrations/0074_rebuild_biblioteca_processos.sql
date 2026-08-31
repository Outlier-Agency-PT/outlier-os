-- ============================================================
-- Rebuild Biblioteca de Processos
-- Wipes all processes + categories and inserts the new taxonomy.
-- process_steps and checklist_progress cascade automatically.
-- ============================================================

delete from public.processes;
delete from public.process_categories;

insert into public.process_categories (key, label, color, sort_order) values
  ('processos-para-clientes', 'Processos para clientes', '#0F6E56',  1),
  ('trafego',                 'Tráfego',                 '#854F0B',  2),
  ('design',                  'Design',                  '#993556',  3),
  ('copy',                    'Copy',                    '#534AB7',  4),
  ('plataformas-internas',    'Plataformas Internas',    '#3B6D11',  5),
  ('administrativo',          'Administrativo',          '#5F5E5A',  6),
  ('financeiro',              'Financeiro',              '#0F6E56',  7),
  ('gestao-de-projetos',      'Gestão de Projetos',      '#185FA5',  8),
  ('prospeccao',              'Prospeção',               '#993C1D',  9),
  ('glossario',               'Glossário',               '#5F5E5A', 10);
