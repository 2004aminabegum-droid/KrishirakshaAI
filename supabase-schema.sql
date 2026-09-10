create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('farmer', 'officer')) default 'farmer',
  created_at timestamptz not null default now()
);

create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  crop text not null,
  area_acres numeric not null check (area_acres > 0),
  village text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.validation_requests (
  id text primary key,
  scan_id text not null,
  image text not null,
  crop text not null,
  type text not null check (type in ('disease', 'pest')),
  original_diagnosis text not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  status text not null check (status in ('pending', 'resolved')) default 'pending',
  expert_verdict text,
  expert_notes text,
  farmer_name text not null,
  farmer_location text not null,
  farmer_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), coalesce(new.raw_user_meta_data->>'role', 'farmer'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.farms enable row level security;

create or replace function public.is_officer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'officer'); $$;

drop policy if exists "Users can read their profile" on public.profiles;
drop policy if exists "Officers can read all profiles" on public.profiles;
drop policy if exists "Users can create their profile" on public.profiles;
drop policy if exists "Users can update their profile" on public.profiles;
drop policy if exists "Farmers manage their own farms" on public.farms;
drop policy if exists "Officers can read all farms" on public.farms;
create policy "Users can read their profile" on public.profiles for select using (auth.uid() = id);
create policy "Officers can read all profiles" on public.profiles for select using (public.is_officer());
create policy "Users can create their profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their profile" on public.profiles for update using (auth.uid() = id);

create policy "Farmers manage their own farms" on public.farms for all using (auth.uid() = farmer_id) with check (auth.uid() = farmer_id);
create policy "Officers can read all farms" on public.farms for select using (public.is_officer());

alter table public.validation_requests add column if not exists farmer_id uuid references public.profiles(id) on delete set null;
alter table public.validation_requests enable row level security;
drop policy if exists "Farmers can create their own validation requests" on public.validation_requests;
drop policy if exists "Farmers can read their own validation requests" on public.validation_requests;
drop policy if exists "Officers can manage validation requests" on public.validation_requests;
create policy "Farmers can create their own validation requests" on public.validation_requests for insert with check (auth.uid() = farmer_id);
create policy "Farmers can read their own validation requests" on public.validation_requests for select using (auth.uid() = farmer_id);
create policy "Officers can manage validation requests" on public.validation_requests for all using (public.is_officer());

-- FIRST CREATE admin@gmail.com WITH PASSWORD admin IN SUPABASE AUTHENTICATION > USERS.
-- THEN RUN THIS QUERY:
INSERT INTO PUBLIC.PROFILES (ID, FULL_NAME, ROLE)
SELECT ID, 'AGRICULTURE ADMINISTRATOR', 'OFFICER'
FROM AUTH.USERS
WHERE EMAIL = 'admin@gmail.com'
ON CONFLICT (ID) DO UPDATE SET ROLE = 'OFFICER';

-- ==============================================================================
-- 🚀 SUPABASE PGVECTOR EXTENSION FOR SEMANTIC RAG KNOWLEDGE BASE
-- ==============================================================================
create extension if not exists vector;

-- KisanVaani Agricultural Knowledge Base with Vector Embeddings (384-dimensional)
create table if not exists public.kisanvaani_kb (
  id text primary key,
  question text not null,
  answer text not null,
  category text not null,
  keywords text[] default '{}',
  embedding vector(384), -- 384-dim for MiniLM / BGE-small / Hugging Face embeddings
  source text default 'KisanVaani Agriculture Dataset (Hugging Face)',
  created_at timestamptz not null default now()
);

-- HNSW / IVFFlat vector index for sub-10ms semantic similarity queries
create index if not exists kisanvaani_kb_embedding_hnsw_idx 
  on public.kisanvaani_kb using hnsw (embedding vector_cosine_ops);

-- Enable RLS and allow public / authenticated farmers to query the knowledge base
alter table public.kisanvaani_kb enable row level security;
drop policy if exists "Anyone can read KisanVaani Knowledge Base" on public.kisanvaani_kb;
create policy "Anyone can read KisanVaani Knowledge Base" on public.kisanvaani_kb for select using (true);

-- RPC Function for vector similarity search using pgvector cosine distance (<=>)
create or replace function public.match_kisanvaani_rag (
  query_embedding vector(384),
  match_threshold float default 0.25,
  match_count int default 5
)
returns table (
  id text,
  question text,
  answer text,
  category text,
  similarity float
)
language plpgsql
stable
as $$
begin
  return query
  select
    kb.id,
    kb.question,
    kb.answer,
    kb.category,
    (1 - (kb.embedding <=> query_embedding))::float as similarity
  from public.kisanvaani_kb kb
  where kb.embedding is not null
    and (1 - (kb.embedding <=> query_embedding)) > match_threshold
  order by kb.embedding <=> query_embedding
  limit match_count;
end;
$$;

