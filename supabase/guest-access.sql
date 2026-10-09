-- Run this migration after schema.sql to enable read-only anonymous guest accounts.
-- Guest sessions can browse public rides but cannot change profile data or publish content.

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

drop policy if exists "Participants can start conversations" on public.conversations;
create policy "Participants can start conversations"
  on public.conversations for insert to authenticated
  with check (
    (select auth.uid()) = participant_one
    and participant_one <> participant_two
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
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
