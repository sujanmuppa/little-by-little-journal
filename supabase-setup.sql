-- Run this once in Supabase Dashboard → SQL Editor.
create table if not exists public.journal_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.journal_state enable row level security;
revoke all on public.journal_state from anon, public;
grant select, insert, update on public.journal_state to authenticated;
drop policy if exists "Users can read their own journal" on public.journal_state;
drop policy if exists "Users can create their own journal" on public.journal_state;
drop policy if exists "Users can update their own journal" on public.journal_state;
create policy "Users can read their own journal" on public.journal_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own journal" on public.journal_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own journal" on public.journal_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('journal-images', 'journal-images', false, 10485760, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their own journal images" on storage.objects;
drop policy if exists "Users can upload their own journal images" on storage.objects;
drop policy if exists "Users can update their own journal images" on storage.objects;
drop policy if exists "Users can delete their own journal images" on storage.objects;
create policy "Users can read their own journal images" on storage.objects for select to authenticated using (bucket_id = 'journal-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users can upload their own journal images" on storage.objects for insert to authenticated with check (bucket_id = 'journal-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users can update their own journal images" on storage.objects for update to authenticated using (bucket_id = 'journal-images' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'journal-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users can delete their own journal images" on storage.objects for delete to authenticated using (bucket_id = 'journal-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
