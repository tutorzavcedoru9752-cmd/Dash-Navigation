alter table public.nav_shares
  add column if not exists sharer_name text not null default 'Dash user',
  add column if not exists sharer_avatar_url text;

drop function if exists public.get_nav_share(text);

create function public.get_nav_share(share_code text)
returns table (
  code text,
  category_title text,
  category_description text,
  sharer_name text,
  sharer_avatar_url text,
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
    share.sharer_name,
    share.sharer_avatar_url,
    share.links,
    share.expires_at
  from public.nav_shares as share
  where (select auth.uid()) is not null
    and share.code = upper(pg_catalog.btrim(share_code))
    and share.expires_at > now()
  limit 1;
$$;

revoke all on function public.get_nav_share(text) from public, anon;
grant execute on function public.get_nav_share(text) to authenticated;
