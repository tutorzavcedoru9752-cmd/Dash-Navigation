create table if not exists public.user_wallpaper_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wallpaper_id text not null default 'none',
  custom_wallpaper_path text,
  card_opacity numeric(4,2) not null default 0.68,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_wallpaper_settings_card_opacity_check check (card_opacity between 0.45 and 0.90),
  constraint user_wallpaper_settings_wallpaper_id_check check (
    wallpaper_id in ('none', 'free-ocean', 'free-forest', 'free-alpine', 'member-summit', 'custom')
  )
);

alter table public.user_wallpaper_settings enable row level security;

revoke all on table public.user_wallpaper_settings from anon, authenticated;
grant select on table public.user_wallpaper_settings to authenticated;

drop policy if exists "Users can view their own wallpaper settings." on public.user_wallpaper_settings;

create policy "Users can view their own wallpaper settings."
  on public.user_wallpaper_settings for select
  to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wallpapers',
  'wallpapers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view own wallpaper objects." on storage.objects;

create policy "Users can view own wallpaper objects."
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'wallpapers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Lifetime users can upload own wallpapers." on storage.objects;

create policy "Lifetime users can upload own wallpapers."
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'wallpapers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.current_user_plan((select auth.uid())) = 'lifetime'
  );

drop policy if exists "Lifetime users can delete own wallpapers." on storage.objects;

create policy "Lifetime users can delete own wallpapers."
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'wallpapers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.current_user_plan((select auth.uid())) = 'lifetime'
  );

create or replace function public.get_wallpaper_setting()
returns table (
  wallpaper_id text,
  custom_wallpaper_path text,
  card_opacity numeric
)
language sql
security invoker
set search_path = ''
stable
as $function$
  select
    coalesce(setting.wallpaper_id, 'none') as wallpaper_id,
    setting.custom_wallpaper_path,
    coalesce(setting.card_opacity, 0.68)::numeric as card_opacity
  from (select (select auth.uid()) as user_id) auth_state
  left join public.user_wallpaper_settings setting
    on setting.user_id = auth_state.user_id
  where auth_state.user_id is not null;
$function$;

create or replace function public.save_wallpaper_setting(
  p_wallpaper_id text,
  p_custom_wallpaper_path text,
  p_card_opacity numeric
)
returns table (
  wallpaper_id text,
  custom_wallpaper_path text,
  card_opacity numeric
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
  current_plan text;
  next_wallpaper_id text := coalesce(nullif(trim(p_wallpaper_id), ''), 'none');
  next_custom_path text := nullif(trim(coalesce(p_custom_wallpaper_path, '')), '');
  next_opacity numeric := least(0.90, greatest(0.45, coalesce(p_card_opacity, 0.68)));
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if next_wallpaper_id not in ('none', 'free-ocean', 'free-forest', 'free-alpine', 'member-summit', 'custom') then
    raise exception 'INVALID_WALLPAPER' using errcode = 'P0001';
  end if;

  current_plan := private.current_user_plan(current_user_id);

  if next_wallpaper_id in ('member-summit', 'custom') and current_plan <> 'lifetime' then
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

  insert into public.user_wallpaper_settings (
    user_id,
    wallpaper_id,
    custom_wallpaper_path,
    card_opacity,
    updated_at
  )
  values (
    current_user_id,
    next_wallpaper_id,
    next_custom_path,
    next_opacity,
    now()
  )
  on conflict (user_id) do update
  set
    wallpaper_id = excluded.wallpaper_id,
    custom_wallpaper_path = excluded.custom_wallpaper_path,
    card_opacity = excluded.card_opacity,
    updated_at = now();

  return query
  select
    setting.wallpaper_id,
    setting.custom_wallpaper_path,
    setting.card_opacity
  from public.user_wallpaper_settings setting
  where setting.user_id = current_user_id;
end;
$function$;

revoke execute on function public.get_wallpaper_setting() from public, anon;
revoke execute on function public.save_wallpaper_setting(text, text, numeric) from public, anon;

grant execute on function public.get_wallpaper_setting() to authenticated;
grant execute on function public.save_wallpaper_setting(text, text, numeric) to authenticated;
