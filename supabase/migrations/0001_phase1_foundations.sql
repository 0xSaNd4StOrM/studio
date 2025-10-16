-- Phase 1 – Foundations: schema and RLS setup
-- Run these statements in the Supabase SQL editor or via supabase CLI migrations.

-- (moved below admin_users table creation to avoid 'relation does not exist' errors)

-- Admin membership table
create table if not exists public.admin_users (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);

-- Helper function: check if current auth user is an admin
-- Must be created AFTER the admin_users table exists
create or replace function public.current_user_is_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid()
  );
$$;

alter table public.admin_users enable row level security;
-- Remove self-referential policies to avoid recursion
drop policy if exists "Admins manage admin_users" on public.admin_users;
drop policy if exists "Admins read admin_users" on public.admin_users;
-- Allow authenticated users to read their own admin membership row
drop policy if exists "Self read admin membership" on public.admin_users;
create policy "Self read admin membership" on public.admin_users for select using (user_id = auth.uid());
-- Allow service role to manage admin_users (dashboard / backend)
drop policy if exists "Service role manage admin_users" on public.admin_users;
create policy "Service role manage admin_users" on public.admin_users for all using ((auth.jwt()->>'role') = 'service_role');

-- Blog posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content text,
  author text not null,
  status text not null check (status in ('Draft','Published')) default 'Draft',
  featured_image text,
  tags jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
alter table public.posts enable row level security;
drop policy if exists "Public read published posts" on public.posts;
create policy "Public read published posts" on public.posts for select using (status = 'Published');
drop policy if exists "Admins read all posts" on public.posts;
create policy "Admins read all posts" on public.posts for select using (public.current_user_is_admin());
drop policy if exists "Admins manage posts" on public.posts;
create policy "Admins manage posts" on public.posts for all using (public.current_user_is_admin());

-- Home page content (singleton)
create table if not exists public.home_page_content (
  id integer primary key default 1,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint home_page_singleton check (id = 1)
);
alter table public.home_page_content enable row level security;
drop policy if exists "Public read homepage" on public.home_page_content;
create policy "Public read homepage" on public.home_page_content for select using (true);
drop policy if exists "Admins manage homepage" on public.home_page_content;
create policy "Admins manage homepage" on public.home_page_content for all using (
  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  or ((auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true')
  or ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  or ((auth.jwt() -> 'user_metadata' ->> 'is_admin') = 'true')
  or public.current_user_is_admin()
)
with check (
  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  or ((auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true')
  or ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  or ((auth.jwt() -> 'user_metadata' ->> 'is_admin') = 'true')
  or public.current_user_is_admin()
);

-- Settings (singleton)
create table if not exists public.settings (
  id integer primary key default 1,
  data jsonb not null,
  logo_url text,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);
alter table public.settings enable row level security;
drop policy if exists "Public read settings" on public.settings;
create policy "Public read settings" on public.settings for select using (true);
drop policy if exists "Admins manage settings" on public.settings;
create policy "Admins manage settings" on public.settings for all using (
  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  or ((auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true')
  or ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  or ((auth.jwt() -> 'user_metadata' ->> 'is_admin') = 'true')
  or public.current_user_is_admin()
)
with check (
  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  or ((auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true')
  or ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  or ((auth.jwt() -> 'user_metadata' ->> 'is_admin') = 'true')
  or public.current_user_is_admin()
);

-- Customers
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  nationality text,
  created_at timestamptz not null default now()
);
alter table public.customers enable row level security;
drop policy if exists "Admins read customers" on public.customers;
create policy "Admins read customers" on public.customers for select using (public.current_user_is_admin());
drop policy if exists "Admins manage customers" on public.customers;
create policy "Admins manage customers" on public.customers for all using (public.current_user_is_admin());

-- Storage bucket examples (run in Storage policies area)
-- Blog images (bucket: blog)
-- Public read (optional) and admin-managed writes
-- create policy "Public read blog images" on storage.objects for select using (bucket_id = 'blog');
-- create policy "Admins manage blog images" on storage.objects for all using (bucket_id = 'blog' and public.current_user_is_admin());

-- CMS assets (bucket: cms)
drop policy if exists "Public read cms assets" on storage.objects;
create policy "Public read cms assets" on storage.objects for select using (bucket_id = 'cms');
drop policy if exists "Admins manage cms assets" on storage.objects;
create policy "Admins manage cms assets" on storage.objects for all using (
  bucket_id = 'cms' and (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    or ((auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true')
    or ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    or ((auth.jwt() -> 'user_metadata' ->> 'is_admin') = 'true')
    or public.current_user_is_admin()
  )
)
with check (
  bucket_id = 'cms' and (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    or ((auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true')
    or ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    or ((auth.jwt() -> 'user_metadata' ->> 'is_admin') = 'true')
    or public.current_user_is_admin()
  )
);