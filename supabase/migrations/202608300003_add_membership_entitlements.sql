create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'lifetime')),
  source text,
  activated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.membership_codes (
  id uuid primary key default extensions.gen_random_uuid(),
  code_hash text not null unique,
  status text not null default 'unused' check (status in ('unused', 'redeemed', 'disabled')),
  source text not null default 'xianyu_lifetime_5_99',
  batch_name text,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.membership_redemptions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  membership_code_id uuid references public.membership_codes(id) on delete set null,
  result text not null check (result in ('success', 'invalid', 'already_redeemed', 'disabled', 'already_member', 'rate_limited')),
  created_at timestamptz not null default now()
);

create index if not exists user_entitlements_plan_idx
  on public.user_entitlements (plan);

create index if not exists membership_codes_status_idx
  on public.membership_codes (status);

create index if not exists membership_redemptions_user_created_idx
  on public.membership_redemptions (user_id, created_at desc);

alter table public.user_entitlements enable row level security;
alter table public.membership_codes enable row level security;
alter table public.membership_redemptions enable row level security;

revoke all on table public.user_entitlements from anon, authenticated;
revoke all on table public.membership_codes from anon, authenticated;
revoke all on table public.membership_redemptions from anon, authenticated;

grant select on table public.user_entitlements to authenticated;
grant select on table public.membership_redemptions to authenticated;

drop policy if exists "Users can view their own entitlement." on public.user_entitlements;
drop policy if exists "Users can view their own redemption history." on public.membership_redemptions;

create policy "Users can view their own entitlement."
  on public.user_entitlements for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view their own redemption history."
  on public.membership_redemptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function private.normalize_membership_code(input_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(input_code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

create or replace function private.membership_code_hash(input_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(private.normalize_membership_code(input_code), 'sha256'), 'hex');
$$;

create or replace function private.current_user_plan(p_user_id uuid)
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (
      select ent.plan
      from public.user_entitlements ent
      where ent.user_id = p_user_id
        and ent.plan = 'lifetime'
        and (ent.expires_at is null or ent.expires_at > now())
      limit 1
    ),
    'free'
  );
$$;

create or replace function private.assert_can_create_category(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  category_count integer;
begin
  if private.current_user_plan(p_user_id) = 'lifetime' then
    return;
  end if;

  select count(*) into category_count
  from public.nav_categories
  where owner_id = p_user_id;

  if category_count >= 5 then
    raise exception 'QUOTA_CATEGORY_LIMIT'
      using errcode = 'P0001';
  end if;
end;
$$;

create or replace function private.assert_can_create_links(p_user_id uuid, p_link_count integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_count integer;
begin
  if private.current_user_plan(p_user_id) = 'lifetime' then
    return;
  end if;

  select count(*) into existing_count
  from public.nav_links
  where owner_id = p_user_id;

  if existing_count + greatest(p_link_count, 0) > 30 then
    raise exception 'QUOTA_LINK_LIMIT'
      using errcode = 'P0001';
  end if;
end;
$$;

create or replace function private.enforce_nav_category_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_can_create_category(new.owner_id);
  return new;
end;
$$;

create or replace function private.enforce_nav_link_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_can_create_links(new.owner_id, 1);
  return new;
end;
$$;

drop trigger if exists enforce_nav_category_quota_on_insert on public.nav_categories;
create trigger enforce_nav_category_quota_on_insert
  before insert on public.nav_categories
  for each row
  execute function private.enforce_nav_category_quota();

drop trigger if exists enforce_nav_link_quota_on_insert on public.nav_links;
create trigger enforce_nav_link_quota_on_insert
  before insert on public.nav_links
  for each row
  execute function private.enforce_nav_link_quota();

create or replace function public.get_membership_summary()
returns table (
  plan text,
  category_count integer,
  link_count integer
)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    private.current_user_plan((select auth.uid())) as plan,
    (
      select count(*)::integer
      from public.nav_categories
      where owner_id = (select auth.uid())
    ) as category_count,
    (
      select count(*)::integer
      from public.nav_links
      where owner_id = (select auth.uid())
    ) as link_count
  where (select auth.uid()) is not null;
$$;

create or replace function private.redeem_membership_code(input_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_code text := private.normalize_membership_code(input_code);
  hashed_code text;
  matching_code public.membership_codes%rowtype;
  recent_failed_attempts integer;
begin
  if current_user_id is null then
    return jsonb_build_object('ok', false, 'status', 'not_authenticated', 'message', '请先登录后再核验会员码。');
  end if;

  if private.current_user_plan(current_user_id) = 'lifetime' then
    insert into public.membership_redemptions (user_id, membership_code_id, result)
    values (current_user_id, null, 'already_member');

    return jsonb_build_object('ok', true, 'status', 'already_member', 'plan', 'lifetime', 'message', '当前账号已是会员，无需重复兑换。');
  end if;

  select count(*) into recent_failed_attempts
  from public.membership_redemptions
  where user_id = current_user_id
    and result in ('invalid', 'already_redeemed', 'disabled')
    and created_at > now() - interval '15 minutes';

  if recent_failed_attempts >= 10 then
    insert into public.membership_redemptions (user_id, membership_code_id, result)
    values (current_user_id, null, 'rate_limited');

    return jsonb_build_object('ok', false, 'status', 'rate_limited', 'message', '尝试次数过多，请稍后再试。');
  end if;

  if length(normalized_code) < 10 then
    insert into public.membership_redemptions (user_id, membership_code_id, result)
    values (current_user_id, null, 'invalid');

    return jsonb_build_object('ok', false, 'status', 'invalid', 'message', '会员码无效或已使用。');
  end if;

  hashed_code := private.membership_code_hash(normalized_code);

  select *
  into matching_code
  from public.membership_codes
  where code_hash = hashed_code
  for update;

  if not found then
    insert into public.membership_redemptions (user_id, membership_code_id, result)
    values (current_user_id, null, 'invalid');

    return jsonb_build_object('ok', false, 'status', 'invalid', 'message', '会员码无效或已使用。');
  end if;

  if matching_code.status = 'disabled' then
    insert into public.membership_redemptions (user_id, membership_code_id, result)
    values (current_user_id, matching_code.id, 'disabled');

    return jsonb_build_object('ok', false, 'status', 'disabled', 'message', '会员码无效或已使用。');
  end if;

  if matching_code.status <> 'unused' then
    insert into public.membership_redemptions (user_id, membership_code_id, result)
    values (current_user_id, matching_code.id, 'already_redeemed');

    return jsonb_build_object('ok', false, 'status', 'already_redeemed', 'message', '会员码无效或已使用。');
  end if;

  update public.membership_codes
  set status = 'redeemed',
      redeemed_by = current_user_id,
      redeemed_at = now(),
      updated_at = now()
  where id = matching_code.id;

  insert into public.user_entitlements (user_id, plan, source, activated_at, expires_at, updated_at)
  values (current_user_id, 'lifetime', 'xianyu_code', now(), null, now())
  on conflict (user_id)
  do update set
    plan = 'lifetime',
    source = excluded.source,
    activated_at = coalesce(public.user_entitlements.activated_at, excluded.activated_at),
    expires_at = null,
    updated_at = now();

  insert into public.membership_redemptions (user_id, membership_code_id, result)
  values (current_user_id, matching_code.id, 'success');

  return jsonb_build_object('ok', true, 'status', 'success', 'plan', 'lifetime', 'message', '已升级为终身会员。');
end;
$$;

create or replace function public.redeem_membership_code(input_code text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.redeem_membership_code(input_code);
$$;

create or replace function public.upsert_nav_category(
  p_category_id text,
  p_category_title text,
  p_category_description text,
  p_category_order integer
)
returns public.nav_categories
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  existing_category public.nav_categories%rowtype;
  saved_category public.nav_categories%rowtype;
begin
  if current_user_id is null then
    raise exception 'NOT_AUTHENTICATED'
      using errcode = 'P0001';
  end if;

  select *
  into existing_category
  from public.nav_categories
  where owner_id = current_user_id
    and id = p_category_id;

  if not found then
    perform private.assert_can_create_category(current_user_id);

    insert into public.nav_categories (owner_id, id, title, description, order_index, updated_at)
    values (current_user_id, p_category_id, p_category_title, coalesce(p_category_description, ''), coalesce(p_category_order, 999), now())
    returning * into saved_category;
  else
    update public.nav_categories
    set title = p_category_title,
        description = coalesce(p_category_description, ''),
        order_index = coalesce(p_category_order, existing_category.order_index, 999),
        updated_at = now()
    where owner_id = current_user_id
      and id = p_category_id
    returning * into saved_category;
  end if;

  return saved_category;
end;
$$;

create or replace function public.create_nav_link(
  p_link_id text,
  p_category_id text,
  p_link_name text,
  p_link_url text,
  p_link_description text,
  p_link_icon text,
  p_link_favicon_url text,
  p_link_order integer
)
returns public.nav_links
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  saved_link public.nav_links%rowtype;
begin
  if current_user_id is null then
    raise exception 'NOT_AUTHENTICATED'
      using errcode = 'P0001';
  end if;

  perform private.assert_can_create_links(current_user_id, 1);

  insert into public.nav_links (owner_id, id, category_id, name, url, description, icon, favicon_url, order_index, updated_at)
  values (
    current_user_id,
    p_link_id,
    p_category_id,
    p_link_name,
    p_link_url,
    coalesce(p_link_description, ''),
    coalesce(p_link_icon, 'link'),
    nullif(p_link_favicon_url, ''),
    coalesce(p_link_order, 999),
    now()
  )
  returning * into saved_link;

  return saved_link;
end;
$$;

create or replace function public.create_nav_links_batch(p_links jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  link_count integer;
begin
  if current_user_id is null then
    raise exception 'NOT_AUTHENTICATED'
      using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_links) <> 'array' then
    raise exception 'INVALID_LINKS_PAYLOAD'
      using errcode = 'P0001';
  end if;

  select jsonb_array_length(p_links) into link_count;
  perform private.assert_can_create_links(current_user_id, link_count);

  insert into public.nav_links (owner_id, id, category_id, name, url, description, icon, favicon_url, order_index, updated_at)
  select
    current_user_id,
    item->>'id',
    item->>'category_id',
    item->>'name',
    item->>'url',
    coalesce(item->>'description', ''),
    coalesce(item->>'icon', 'link'),
    nullif(item->>'favicon_url', ''),
    coalesce((item->>'order_index')::integer, 999),
    now()
  from jsonb_array_elements(p_links) as item;

  return link_count;
end;
$$;

revoke execute on function private.normalize_membership_code(text) from public;
revoke execute on function private.membership_code_hash(text) from public;
revoke execute on function private.current_user_plan(uuid) from public;
revoke execute on function private.assert_can_create_category(uuid) from public;
revoke execute on function private.assert_can_create_links(uuid, integer) from public;
revoke execute on function private.enforce_nav_category_quota() from public;
revoke execute on function private.enforce_nav_link_quota() from public;
revoke execute on function private.redeem_membership_code(text) from public;

revoke execute on function public.get_membership_summary() from public, anon;
revoke execute on function public.redeem_membership_code(text) from public, anon;
revoke execute on function public.upsert_nav_category(text, text, text, integer) from public, anon;
revoke execute on function public.create_nav_link(text, text, text, text, text, text, text, integer) from public, anon;
revoke execute on function public.create_nav_links_batch(jsonb) from public, anon;

grant usage on schema private to authenticated;
grant execute on function private.current_user_plan(uuid) to authenticated;
grant execute on function private.assert_can_create_category(uuid) to authenticated;
grant execute on function private.assert_can_create_links(uuid, integer) to authenticated;
grant execute on function private.redeem_membership_code(text) to authenticated;

grant execute on function public.get_membership_summary() to authenticated;
grant execute on function public.redeem_membership_code(text) to authenticated;
grant execute on function public.upsert_nav_category(text, text, text, integer) to authenticated;
grant execute on function public.create_nav_link(text, text, text, text, text, text, text, integer) to authenticated;
grant execute on function public.create_nav_links_batch(jsonb) to authenticated;
