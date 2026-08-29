create table if not exists public.nav_categories (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null check (btrim(title) <> ''),
  description text not null default '',
  order_index integer not null default 999,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create table if not exists public.nav_links (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  category_id text not null,
  name text not null check (btrim(name) <> ''),
  url text not null check (btrim(url) <> ''),
  description text not null default '',
  icon text not null default 'link',
  favicon_url text,
  order_index integer not null default 999,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id),
  foreign key (owner_id, category_id)
    references public.nav_categories(owner_id, id)
    on delete cascade
);

create index if not exists nav_links_owner_category_order_idx
  on public.nav_links (owner_id, category_id, order_index);

alter table public.nav_categories enable row level security;
alter table public.nav_links enable row level security;

revoke all on table public.nav_categories from anon, authenticated;
revoke all on table public.nav_links from anon, authenticated;
grant select, insert, update, delete on table public.nav_categories to authenticated;
grant select, insert, update, delete on table public.nav_links to authenticated;

create policy "Users can view their own navigation categories."
  on public.nav_categories for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can create their own navigation categories."
  on public.nav_categories for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Users can update their own navigation categories."
  on public.nav_categories for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own navigation categories."
  on public.nav_categories for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can view their own navigation links."
  on public.nav_links for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can create their own navigation links."
  on public.nav_links for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Users can update their own navigation links."
  on public.nav_links for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own navigation links."
  on public.nav_links for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

