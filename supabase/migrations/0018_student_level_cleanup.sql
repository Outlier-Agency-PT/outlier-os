-- ============================================================
-- Incubadora: remove nível Autoridade, renomeia Aguardar → Suspenso
-- Decisão reunião 2026-07-10 (Daniel)
-- ============================================================

-- 1. Migra dados existentes
update students set level = 'referencia' where level = 'autoridade';
update students set level = 'suspenso'   where level = 'aguardar';

-- 2. Cria novo enum com os 4 valores correctos
create type student_level_new as enum ('aprendiz', 'fazedor', 'referencia', 'suspenso');

-- 3. Altera a coluna para usar o novo enum
alter table students
  alter column level type student_level_new
    using level::text::student_level_new;

-- 4. Remove o enum antigo e renomeia o novo
drop type student_level;
alter type student_level_new rename to student_level;
