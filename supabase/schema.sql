create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  date_of_birth date,
  gender text,
  address text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.traveler_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  full_name text not null,
  phone text,
  date_of_birth date,
  gender text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null,
  origin text not null check (char_length(trim(origin)) between 2 and 160),
  destination text not null check (char_length(trim(destination)) between 2 and 160),
  departure_at timestamptz not null,
  seats_needed smallint not null check (seats_needed between 1 and 6),
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_one uuid not null references public.profiles (id) on delete cascade,
  participant_two uuid not null references public.profiles (id) on delete cascade,
  participant_one_name text not null,
  participant_two_name text not null,
  ride_id uuid references public.rides (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint conversations_distinct_participants check (participant_one <> participant_two)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists rides_departure_at_idx on public.rides (departure_at);
create index if not exists conversations_participant_one_idx on public.conversations (participant_one);
create index if not exists conversations_participant_two_idx on public.conversations (participant_two);
create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at);

create or replace view public.public_profiles
with (security_invoker = false) as
  select id, full_name, avatar_url from public.profiles;

grant usage on schema public to anon, authenticated;
grant select on public.rides to anon, authenticated;
grant insert, update, delete on public.rides to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.traveler_profiles to authenticated;
grant select, insert on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant select on public.public_profiles to authenticated;

create unique index if not exists conversations_pair_ride_unique_idx
  on public.conversations (
    least(participant_one, participant_two),
    greatest(participant_one, participant_two),
    ride_id
  )
  where ride_id is not null;

create unique index if not exists conversations_pair_without_ride_unique_idx
  on public.conversations (
    least(participant_one, participant_two),
    greatest(participant_one, participant_two)
  )
  where ride_id is null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, date_of_birth, gender)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date,
    nullif(new.raw_user_meta_data ->> 'gender', '')
  )
  on conflict (id) do nothing;

  insert into public.traveler_profiles (owner_id, full_name, phone, date_of_birth, gender)
  select
    new.id,
    traveler.value ->> 'full_name',
    nullif(traveler.value ->> 'phone', ''),
    nullif(traveler.value ->> 'date_of_birth', '')::date,
    nullif(traveler.value ->> 'gender', '')
  from jsonb_array_elements(
    coalesce(new.raw_user_meta_data -> 'traveler_profiles', '[]'::jsonb)
  ) with ordinality as traveler(value, position)
  where traveler.position > 1
    and nullif(traveler.value ->> 'full_name', '') is not null;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.traveler_profiles enable row level security;
alter table public.rides enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update to authenticated
  using (
    id = (select auth.uid())
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  )
  with check (
    id = (select auth.uid())
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );

drop policy if exists "Users can read their traveler profiles" on public.traveler_profiles;
create policy "Users can read their traveler profiles"
  on public.traveler_profiles for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Users can manage their traveler profiles" on public.traveler_profiles;
create policy "Users can manage their traveler profiles"
  on public.traveler_profiles for all to authenticated
  using (
    owner_id = (select auth.uid())
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  )
  with check (
    owner_id = (select auth.uid())
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );

drop policy if exists "Avatar images are publicly readable" on storage.objects;
drop policy if exists "Users can read their own avatar" on storage.objects;
create policy "Users can read their own avatar"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );

drop policy if exists "Anyone can read rides" on public.rides;
create policy "Anyone can read rides"
  on public.rides for select to anon, authenticated
  using (true);

drop policy if exists "Users can create rides as themselves" on public.rides;
create policy "Users can create rides as themselves"
  on public.rides for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );

drop policy if exists "Owners can update their rides" on public.rides;
create policy "Owners can update their rides"
  on public.rides for update to authenticated
  using (
    user_id = (select auth.uid())
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  )
  with check (
    user_id = (select auth.uid())
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );

drop policy if exists "Owners can delete their rides" on public.rides;
create policy "Owners can delete their rides"
  on public.rides for delete to authenticated
  using (
    user_id = (select auth.uid())
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );

drop policy if exists "Participants can read conversations" on public.conversations;
create policy "Participants can read conversations"
  on public.conversations for select to authenticated
  using (
    (select auth.uid()) = participant_one
    or (select auth.uid()) = participant_two
  );

drop policy if exists "Participants can start conversations" on public.conversations;
create policy "Participants can start conversations"
  on public.conversations for insert to authenticated
  with check (
    (select auth.uid()) = participant_one
    and participant_one <> participant_two
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );

drop policy if exists "Participants can read messages" on public.messages;
create policy "Participants can read messages"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and ((select auth.uid()) = c.participant_one or (select auth.uid()) = c.participant_two)
    )
  );

drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and ((select auth.uid()) = c.participant_one or (select auth.uid()) = c.participant_two)
    )
  );
