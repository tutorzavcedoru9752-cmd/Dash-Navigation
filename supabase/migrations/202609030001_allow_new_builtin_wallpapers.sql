alter table public.user_wallpaper_settings
  drop constraint if exists user_wallpaper_settings_wallpaper_id_check;

alter table public.user_wallpaper_settings
  add constraint user_wallpaper_settings_wallpaper_id_check check (
    wallpaper_id in (
      'none',
      'free-rose-clouds',
      'free-ocean',
      'free-forest',
      'free-alpine',
      'member-summit',
      'member-green-apples',
      'member-motion-garden',
      'member-cosmos-field',
      'custom'
    )
  );

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

  if next_wallpaper_id not in (
    'none',
    'free-rose-clouds',
    'free-ocean',
    'free-forest',
    'free-alpine',
    'member-summit',
    'member-green-apples',
    'member-motion-garden',
    'member-cosmos-field',
    'custom'
  ) then
    raise exception 'INVALID_WALLPAPER' using errcode = 'P0001';
  end if;

  if next_wallpaper_id in (
    'member-summit',
    'member-green-apples',
    'member-motion-garden',
    'member-cosmos-field',
    'custom'
  ) and current_plan <> 'lifetime' then
    raise exception 'MEMBERSHIP_REQUIRED' using errcode = 'P0001';
  end if;

  if next_wallpaper_id = 'custom' then
    if next_custom_path is null then
      raise exception 'CUSTOM_WALLPAPER_REQUIRED' using errcode = 'P0001';
    end if;
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

  return query
  select setting.wallpaper_id, setting.custom_wallpaper_path, setting.card_opacity
  from public.user_wallpaper_settings setting
  where setting.user_id = current_user_id;
end;
$$;
