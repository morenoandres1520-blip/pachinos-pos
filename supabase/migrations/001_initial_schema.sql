-- ============================================
-- PaChinos POS - Database Schema
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  role text not null default 'cajera' check (role in ('admin', 'cajera')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'cajera')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS for profiles
alter table public.profiles enable row level security;

create policy "Users can view all profiles" on public.profiles
  for select using (true);

create policy "Admins can update any profile" on public.profiles
  for update using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================
-- BUSINESS CONFIG
-- ============================================
create table public.business_config (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'PaChinos',
  nit text not null default '',
  address text not null default '',
  phone text not null default '',
  city text not null default '',
  logo_url text,
  footer_message text not null default 'Gracias por su compra',
  iva_enabled boolean not null default false,
  iva_rate numeric(5,2) not null default 19.00,
  created_at timestamptz not null default now()
);

alter table public.business_config enable row level security;

create policy "Anyone can read business config" on public.business_config
  for select using (true);

create policy "Admins can update business config" on public.business_config
  for update using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can insert business config" on public.business_config
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Insert default config
insert into public.business_config (name, footer_message)
values ('PaChinos', 'Gracias por su compra en PaChinos');

-- ============================================
-- CATEGORIES
-- ============================================
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "Anyone can read categories" on public.categories
  for select using (true);

create policy "Admins can manage categories" on public.categories
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Default categories
insert into public.categories (name) values
  ('Dama'), ('Caballero'), ('Niño'), ('Niña'), ('Unisex');

-- ============================================
-- BRANDS
-- ============================================
create table public.brands (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.brands enable row level security;

create policy "Anyone can read brands" on public.brands
  for select using (true);

create policy "Admins can manage brands" on public.brands
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- PRODUCTS
-- ============================================
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sku text not null unique,
  category_id uuid references public.categories(id),
  brand_id uuid references public.brands(id),
  color text not null default '',
  material text not null default '',
  cost_price numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "Anyone can read active products" on public.products
  for select using (true);

create policy "Admins can manage products" on public.products
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- PRODUCT VARIANTS (sizes + stock)
-- ============================================
create table public.product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete cascade not null,
  size text not null,
  stock integer not null default 0,
  created_at timestamptz not null default now(),
  unique(product_id, size)
);

alter table public.product_variants enable row level security;

create policy "Anyone can read variants" on public.product_variants
  for select using (true);

create policy "Admins can manage variants" on public.product_variants
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Allow stock updates during sales (for any authenticated user making a sale)
create policy "Authenticated users can update variant stock" on public.product_variants
  for update using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ============================================
-- INVENTORY MOVEMENTS
-- ============================================
create table public.inventory_movements (
  id uuid primary key default uuid_generate_v4(),
  product_variant_id uuid references public.product_variants(id) on delete cascade not null,
  type text not null check (type in ('entrada', 'salida', 'correccion', 'venta', 'anulacion')),
  quantity integer not null,
  reason text not null default '',
  user_id uuid references public.profiles(id) not null,
  created_at timestamptz not null default now()
);

alter table public.inventory_movements enable row level security;

create policy "Anyone can read movements" on public.inventory_movements
  for select using (true);

create policy "Authenticated users can insert movements" on public.inventory_movements
  for insert with check (auth.uid() is not null);

-- ============================================
-- SALES
-- ============================================
create table public.sales (
  id uuid primary key default uuid_generate_v4(),
  invoice_number text not null unique,
  user_id uuid references public.profiles(id) not null,
  customer_name text,
  customer_id_number text,
  customer_phone text,
  customer_email text,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  iva numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'completada' check (status in ('completada', 'anulada')),
  notes text,
  void_reason text,
  created_at timestamptz not null default now()
);

alter table public.sales enable row level security;

create policy "Admins can view all sales" on public.sales
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Cajeras can view own sales" on public.sales
  for select using (auth.uid() = user_id);

create policy "Authenticated users can insert sales" on public.sales
  for insert with check (auth.uid() is not null);

create policy "Admins can update sales" on public.sales
  for update using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- SALE PAYMENTS
-- ============================================
create table public.sale_payments (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid references public.sales(id) on delete cascade not null,
  method text not null check (method in ('efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata')),
  amount numeric(12,2) not null default 0
);

alter table public.sale_payments enable row level security;

create policy "Users can read payments for visible sales" on public.sale_payments
  for select using (
    exists (
      select 1 from public.sales
      where sales.id = sale_payments.sale_id
      and (
        sales.user_id = auth.uid()
        or exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      )
    )
  );

create policy "Authenticated users can insert payments" on public.sale_payments
  for insert with check (auth.uid() is not null);

-- ============================================
-- SALE ITEMS
-- ============================================
create table public.sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid references public.sales(id) on delete cascade not null,
  product_variant_id uuid references public.product_variants(id) not null,
  product_name text not null,
  product_sku text not null,
  size text not null,
  quantity integer not null default 1,
  unit_price numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0
);

alter table public.sale_items enable row level security;

create policy "Users can read items for visible sales" on public.sale_items
  for select using (
    exists (
      select 1 from public.sales
      where sales.id = sale_items.sale_id
      and (
        sales.user_id = auth.uid()
        or exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      )
    )
  );

create policy "Authenticated users can insert sale items" on public.sale_items
  for insert with check (auth.uid() is not null);

-- ============================================
-- INVOICE NUMBER SEQUENCE
-- ============================================
create sequence if not exists invoice_number_seq start 1;

create or replace function public.generate_invoice_number()
returns text as $$
begin
  return 'PCH-' || lpad(nextval('invoice_number_seq')::text, 6, '0');
end;
$$ language plpgsql;

-- ============================================
-- INDEXES for performance
-- ============================================
create index idx_products_category on public.products(category_id);
create index idx_products_brand on public.products(brand_id);
create index idx_products_sku on public.products(sku);
create index idx_products_active on public.products(is_active);
create index idx_product_variants_product on public.product_variants(product_id);
create index idx_inventory_movements_variant on public.inventory_movements(product_variant_id);
create index idx_inventory_movements_date on public.inventory_movements(created_at);
create index idx_sales_user on public.sales(user_id);
create index idx_sales_date on public.sales(created_at);
create index idx_sales_status on public.sales(status);
create index idx_sales_invoice on public.sales(invoice_number);
create index idx_sale_items_sale on public.sale_items(sale_id);
create index idx_sale_payments_sale on public.sale_payments(sale_id);

-- ============================================
-- Storage bucket for product images and logo
-- ============================================
-- Run in Supabase Dashboard > Storage:
-- Create bucket "images" with public access
-- Or use the SQL below:
insert into storage.buckets (id, name, public) values ('images', 'images', true)
on conflict do nothing;

-- Storage policies
create policy "Anyone can view images" on storage.objects
  for select using (bucket_id = 'images');

create policy "Authenticated users can upload images" on storage.objects
  for insert with check (bucket_id = 'images' and auth.uid() is not null);

create policy "Admins can delete images" on storage.objects
  for delete using (
    bucket_id = 'images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
