-- Guest preview sharing and permanent-account isolation.
-- This migration is intentionally local-only until production Auth/CAPTCHA settings are ready.

create or replace function private.is_anonymous_user()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false);
$$;

create or replace function private.is_permanent_user()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select (select auth.uid()) is not null and not private.is_anonymous_user();
$$;

revoke all on function private.is_anonymous_user() from public, anon;
revoke all on function private.is_permanent_user() from public, anon;
grant execute on function private.is_anonymous_user() to authenticated;
grant execute on function private.is_permanent_user() to authenticated;

-- Restrictive policies compose with the existing owner policies and prevent an
-- anonymous JWT (which also uses the authenticated Postgres role) from using
-- permanent account tables.
drop policy if exists "Permanent accounts only." on public.nav_categories;
create policy "Permanent accounts only." on public.nav_categories
  as restrictive for all to authenticated
  using ((select private.is_permanent_user()))
  with check ((select private.is_permanent_user()));

drop policy if exists "Permanent accounts only." on public.nav_links;
create policy "Permanent accounts only." on public.nav_links
  as restrictive for all to authenticated
  using ((select private.is_permanent_user()))
  with check ((select private.is_permanent_user()));

drop policy if exists "Permanent accounts only." on public.profiles;
create policy "Permanent accounts only." on public.profiles
  as restrictive for all to authenticated
  using ((select private.is_permanent_user()))
  with check ((select private.is_permanent_user()));

drop policy if exists "Permanent accounts only." on public.user_entitlements;
create policy "Permanent accounts only." on public.user_entitlements
  as restrictive for all to authenticated
  using ((select private.is_permanent_user()))
  with check ((select private.is_permanent_user()));

drop policy if exists "Permanent accounts only." on public.membership_redemptions;
create policy "Permanent accounts only." on public.membership_redemptions
  as restrictive for all to authenticated
  using ((select private.is_permanent_user()))
  with check ((select private.is_permanent_user()));

drop policy if exists "Permanent accounts only." on public.user_wallpaper_settings;
create policy "Permanent accounts only." on public.user_wallpaper_settings
  as restrictive for all to authenticated
  using ((select private.is_permanent_user()))
  with check ((select private.is_permanent_user()));

drop policy if exists "Permanent accounts only for wallpaper storage." on storage.objects;
create policy "Permanent accounts only for wallpaper storage." on storage.objects
  as restrictive for all to authenticated
  using (bucket_id <> 'wallpapers' or (select private.is_permanent_user()))
  with check (bucket_id <> 'wallpapers' or (select private.is_permanent_user()));

-- Direct share inserts remain a permanent-account feature. Preview shares can
-- only be created through the validated RPC below.
drop policy if exists "Users can create their own navigation shares." on public.nav_shares;
create policy "Users can create their own navigation shares."
  on public.nav_shares for insert to authenticated
  with check (
    (select private.is_permanent_user())
    and (select auth.uid()) = owner_id
    and expires_at <= now() + interval '3 days 5 minutes'
  );

create or replace function public.get_membership_summary()
returns table (plan text, category_count integer, link_count integer)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    private.current_user_plan((select auth.uid())),
    (select count(*)::integer from public.nav_categories where owner_id = (select auth.uid())),
    (select count(*)::integer from public.nav_links where owner_id = (select auth.uid()))
  where (select private.is_permanent_user());
$$;

create or replace function public.get_wallpaper_setting()
returns table (wallpaper_id text, custom_wallpaper_path text, card_opacity numeric)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    coalesce(setting.wallpaper_id, 'none'),
    setting.custom_wallpaper_path,
    coalesce(setting.card_opacity, 0.68)::numeric
  from (select (select auth.uid()) as user_id) auth_state
  left join public.user_wallpaper_settings setting on setting.user_id = auth_state.user_id
  where (select private.is_permanent_user());
$$;

create or replace function public.save_wallpaper_setting(
  p_wallpaper_id text,
  p_custom_wallpaper_path text,
  p_card_opacity numeric
)
returns table (wallpaper_id text, custom_wallpaper_path text, card_opacity numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_plan text;
  next_wallpaper_id text := coalesce(nullif(pg_catalog.btrim(p_wallpaper_id), ''), 'none');
  next_custom_path text := nullif(pg_catalog.btrim(coalesce(p_custom_wallpaper_path, '')), '');
  next_card_opacity numeric := least(0.90, greatest(0.25, coalesce(p_card_opacity, 0.68)));
begin
  if not (select private.is_permanent_user()) then
    raise exception 'PERMANENT_ACCOUNT_REQUIRED' using errcode = '42501';
  end if;
  current_plan := private.current_user_plan(current_user_id);
  if next_wallpaper_id not in ('none', 'free-ocean', 'free-forest', 'free-alpine', 'member-summit', 'custom') then
    raise exception 'INVALID_WALLPAPER' using errcode = 'P0001';
  end if;
  if next_wallpaper_id in ('member-summit', 'custom') and current_plan <> 'lifetime' then
    raise exception 'MEMBERSHIP_REQUIRED' using errcode = 'P0001';
  end if;
  if next_wallpaper_id = 'custom' then
    if next_custom_path is null then raise exception 'CUSTOM_WALLPAPER_REQUIRED' using errcode = 'P0001'; end if;
    if split_part(next_custom_path, '/', 1) <> current_user_id::text then
      raise exception 'INVALID_CUSTOM_WALLPAPER_PATH' using errcode = 'P0001';
    end if;
  else
    next_custom_path := null;
  end if;
  insert into public.user_wallpaper_settings (user_id, wallpaper_id, custom_wallpaper_path, card_opacity, updated_at)
  values (current_user_id, next_wallpaper_id, next_custom_path, next_card_opacity, now())
  on conflict (user_id) do update set
    wallpaper_id = excluded.wallpaper_id,
    custom_wallpaper_path = excluded.custom_wallpaper_path,
    card_opacity = excluded.card_opacity,
    updated_at = now();
  return query select s.wallpaper_id, s.custom_wallpaper_path, s.card_opacity
    from public.user_wallpaper_settings s where s.user_id = current_user_id;
end;
$$;

create or replace function public.redeem_membership_code(input_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_permanent_user()) then
    return jsonb_build_object('ok', false, 'status', 'permanent_account_required', 'message', '请使用正式账号兑换会员码。');
  end if;
  return private.redeem_membership_code(input_code);
end;
$$;
revoke execute on function private.redeem_membership_code(text) from authenticated;

create or replace function public.create_preview_share(
  p_category_title text,
  p_category_description text,
  p_links jsonb
)
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  generated_code text;
  next_expiry timestamptz := now() + interval '3 days';
  active_share_count integer;
  invalid_link boolean;
begin
  if current_user_id is null or not (select private.is_anonymous_user()) then
    raise exception 'ANONYMOUS_PREVIEW_REQUIRED' using errcode = '42501';
  end if;
  if length(pg_catalog.btrim(coalesce(p_category_title, ''))) not between 1 and 120
     or length(coalesce(p_category_description, '')) > 500 then
    raise exception 'INVALID_CATEGORY_FIELDS' using errcode = '22023';
  end if;
  if jsonb_typeof(p_links) <> 'array'
     or jsonb_array_length(p_links) not between 1 and 20
     or pg_column_size(p_links) > 65536 then
    raise exception 'INVALID_LINKS_PAYLOAD' using errcode = '22023';
  end if;
  select exists (
    select 1 from jsonb_array_elements(p_links) link
    where length(pg_catalog.btrim(coalesce(link->>'id', ''))) not between 1 and 120
       or length(pg_catalog.btrim(coalesce(link->>'name', ''))) not between 1 and 120
       or length(coalesce(link->>'url', '')) > 2048
       or coalesce(link->>'url', '') !~ '^https://[^[:space:]]+$'
       or length(coalesce(link->>'description', '')) > 500
       or length(coalesce(link->>'icon', '')) > 80
       or length(coalesce(link->>'faviconUrl', '')) > 4096
  ) into invalid_link;
  if invalid_link then raise exception 'INVALID_LINK_FIELDS' using errcode = '22023'; end if;

  select count(*) into active_share_count from public.nav_shares
    where owner_id = current_user_id and expires_at > now();
  if active_share_count >= 5 then
    raise exception 'PREVIEW_SHARE_LIMIT' using errcode = 'P0001';
  end if;

  for attempt in 1..8 loop
    generated_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into public.nav_shares (
        owner_id, code, category_title, category_description, sharer_name, sharer_avatar_url, links, expires_at
      ) values (
        current_user_id, generated_code, pg_catalog.btrim(p_category_title), coalesce(p_category_description, ''),
        'Dash 预览访客', null, p_links, next_expiry
      );
      return query select generated_code, next_expiry;
      return;
    exception when unique_violation then
      null;
    end;
  end loop;
  raise exception 'SHARE_CODE_GENERATION_FAILED' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_preview_share(text, text, jsonb) from public, anon;
grant execute on function public.create_preview_share(text, text, jsonb) to authenticated;

create index if not exists nav_shares_owner_active_idx
  on public.nav_shares (owner_id, expires_at desc)
  where expires_at > created_at;

create extension if not exists pg_cron;
select cron.schedule(
  'delete-stale-anonymous-users',
  '15 3 * * *',
  $$ delete from auth.users where is_anonymous is true and created_at < now() - interval '30 days'; $$
);
