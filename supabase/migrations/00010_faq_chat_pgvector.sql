-- FAQ chat: pgvector for RAG chunks + chat_log for conversation tracking.
-- Run after 00009. Requires Supabase project with pgvector support.

create extension if not exists vector;

-- Chunks from ingested PDF (embeddings for similarity search).
create table if not exists public.faq_chunks (
  id uuid primary key default uuid_generate_v4(),
  content text not null,
  embedding vector(1536) not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists faq_chunks_embedding_idx on public.faq_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.faq_chunks enable row level security;

-- Only service role (backend) can read/insert/update faq_chunks; no anon/authenticated access.
create policy "faq_chunks_service_only"
  on public.faq_chunks for all
  using (false)
  with check (false);

-- Conversation log: every user message and assistant reply for later analysis.
create table if not exists public.chat_log (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  role text not null check (role in ('user', 'assistant')),
  content text not null
);

create index if not exists chat_log_created_at_idx on public.chat_log(created_at desc);
create index if not exists chat_log_user_id_idx on public.chat_log(user_id);
create index if not exists chat_log_session_id_idx on public.chat_log(session_id);

alter table public.chat_log enable row level security;

-- Only admins can read chat_log (for analysis/export). Inserts done via service role in API.
create policy "chat_log_admin_read"
  on public.chat_log for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "chat_log_no_anon_insert"
  on public.chat_log for insert
  with check (false);

create policy "chat_log_no_anon_update_delete"
  on public.chat_log for all
  using (false)
  with check (false);

comment on table public.faq_chunks is 'RAG chunks from FAQ PDF; populated by ingest script; read only by backend.';
comment on table public.chat_log is 'FAQ chat messages (user + assistant) for analysis; readable by admins only.';

-- RPC for similarity search (called by API with service role).
create or replace function public.match_faq_chunks(query_embedding vector(1536), match_count int default 5)
returns setof public.faq_chunks
language sql
stable
as $$
  select * from public.faq_chunks
  order by embedding <=> query_embedding
  limit match_count;
$$;
