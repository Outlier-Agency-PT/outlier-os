create extension if not exists vector with schema extensions;

alter table processes
  add column if not exists embedding vector(1536);

create index if not exists idx_processes_embedding
  on processes
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 10);

create or replace function search_processes_semantic(
  query_embedding vector(1536),
  similarity_threshold float default 0.3,
  match_count int default 10
)
returns table (
  id uuid,
  title text,
  subcategory text,
  doc_type text,
  published boolean,
  category_id uuid,
  similarity float
)
language sql stable
as $$
  select
    id,
    title,
    subcategory,
    doc_type,
    published,
    category_id,
    1 - (embedding <=> query_embedding) as similarity
  from processes
  where published = true
    and embedding is not null
    and 1 - (embedding <=> query_embedding) > similarity_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
