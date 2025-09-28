-- Enable required extensions (Postgres on Supabase usually has these)
create extension if not exists pgcrypto;

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price integer not null check (price >= 0), -- in cents
  image_url text,
  created_at timestamptz not null default now()
);

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  external_id text unique, -- Midtrans order_id
  status text not null check (status in ('pending','paid','failed')) default 'pending',
  total integer not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order Items
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  price integer not null check (price >= 0) -- snapshot price in cents
);

-- RLS
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Policies
-- Products: allow read for anon (public menu)
drop policy if exists "products read" on public.products;
create policy "products read" on public.products
for select using (true);

-- Orders: only server should write; disallow anon read/write by default
drop policy if exists "orders block" on public.orders;
create policy "orders block" on public.orders
for all to anon using (false) with check (false);

-- Order items: same as orders
drop policy if exists "order_items block" on public.order_items;
create policy "order_items block" on public.order_items
for all to anon using (false) with check (false);

-- Storage bucket (manual or via UI/API). Ensure a public bucket named 'products' exists.
-- If using SQL:
-- select storage.create_bucket('products', public => true, file_size_limit => 10485760);
-- And make sure public read policy is enabled for that bucket.
