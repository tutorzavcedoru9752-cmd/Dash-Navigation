alter table public.profiles
  add column if not exists default_seed_version integer not null default 0;

create table if not exists public.nav_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique check (code = upper(code) and length(code) between 6 and 16),
  category_title text not null check (btrim(category_title) <> ''),
  category_description text not null default '',
  links jsonb not null check (jsonb_typeof(links) = 'array'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists nav_shares_code_expires_idx
  on public.nav_shares (code, expires_at);

create index if not exists nav_shares_owner_created_idx
  on public.nav_shares (owner_id, created_at desc);

alter table public.nav_shares enable row level security;

revoke all on table public.nav_shares from anon, authenticated;
grant select, insert, delete on table public.nav_shares to authenticated;

drop policy if exists "Users can view their own navigation shares." on public.nav_shares;
drop policy if exists "Users can create their own navigation shares." on public.nav_shares;
drop policy if exists "Users can delete their own navigation shares." on public.nav_shares;

create policy "Users can view their own navigation shares."
  on public.nav_shares for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can create their own navigation shares."
  on public.nav_shares for insert
  to authenticated
  with check (
    (select auth.uid()) = owner_id
    and expires_at <= now() + interval '3 days 5 minutes'
  );

create policy "Users can delete their own navigation shares."
  on public.nav_shares for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create or replace function public.get_nav_share(share_code text)
returns table (
  code text,
  category_title text,
  category_description text,
  links jsonb,
  expires_at timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    share.code,
    share.category_title,
    share.category_description,
    share.links,
    share.expires_at
  from public.nav_shares as share
  where (select auth.uid()) is not null
    and share.code = upper(btrim(share_code))
    and share.expires_at > now()
  limit 1;
$$;

revoke all on function public.get_nav_share(text) from public;
grant execute on function public.get_nav_share(text) to authenticated;
