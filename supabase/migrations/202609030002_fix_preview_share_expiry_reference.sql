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
    select 1
    from jsonb_array_elements(p_links) link
    where length(pg_catalog.btrim(coalesce(link->>'id', ''))) not between 1 and 120
       or length(pg_catalog.btrim(coalesce(link->>'name', ''))) not between 1 and 120
       or length(coalesce(link->>'url', '')) > 2048
       or coalesce(link->>'url', '') !~ '^https://[^[:space:]]+$'
       or length(coalesce(link->>'description', '')) > 500
       or length(coalesce(link->>'icon', '')) > 80
       or length(coalesce(link->>'faviconUrl', '')) > 4096
  ) into invalid_link;

  if invalid_link then
    raise exception 'INVALID_LINK_FIELDS' using errcode = '22023';
  end if;

  select count(*)
  into active_share_count
  from public.nav_shares share
  where share.owner_id = current_user_id
    and share.expires_at > now();

  if active_share_count >= 5 then
    raise exception 'PREVIEW_SHARE_LIMIT' using errcode = 'P0001';
  end if;

  for attempt in 1..8 loop
    generated_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into public.nav_shares (
        owner_id,
        code,
        category_title,
        category_description,
        sharer_name,
        sharer_avatar_url,
        links,
        expires_at
      ) values (
        current_user_id,
        generated_code,
        pg_catalog.btrim(p_category_title),
        coalesce(p_category_description, ''),
        'Dash 预览访客',
        null,
        p_links,
        next_expiry
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
