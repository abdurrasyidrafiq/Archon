-- Archon POS — schema sesuai ERD (Archon.png), diadaptasi untuk Supabase Auth.
-- Jalankan file ini di Supabase Dashboard > SQL Editor (Run).
-- Aman dijalankan berkali-kali (idempotent) berkat "if not exists" / "or replace" / drop-before-create.

create extension if not exists pgcrypto;

-- =========================================================
-- ENUM TYPES
-- =========================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('owner', 'employee');
  end if;
end $$;

-- =========================================================
-- TABLES
-- =========================================================

-- users: profile table, extends auth.users (password ditangani oleh Supabase Auth)
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'employee',
  username text not null unique,
  email text not null unique,
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

-- company: bisnis milik seorang owner
create table if not exists public.company (
  business_id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  industry text,
  address text,
  phone text,
  created_at timestamptz not null default now()
);

-- company_worker: employee yang bekerja pada sebuah company
create table if not exists public.company_worker (
  worker_id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.users (id) on delete cascade,
  work_at uuid not null references public.company (business_id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (employee_id, work_at)
);

-- products: produk yang dijual oleh sebuah company
create table if not exists public.products (
  product_id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.company (business_id) on delete cascade,
  name text not null,
  sell_price numeric(12, 2) not null default 0,
  production_cost numeric(12, 2) not null default 0
);

-- expenses: pencatatan pembelian bahan baku oleh seorang user
-- deviasi kecil dari ERD: kolom business_id ditambahkan supaya stok bisa
-- dibagi/dilihat oleh semua anggota company (bukan hanya milik satu user).
create table if not exists public.expenses (
  expense_id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.company (business_id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  cost_price numeric(12, 2) not null default 0,
  amount integer not null default 0,
  purchase_date timestamptz not null default now()
);

-- inventory: stok bahan baku, berasal dari sebuah expense (pembelian)
-- deviasi kecil dari ERD: kolom name ditambahkan karena ERD tidak punya
-- kolom apapun (di inventory maupun expenses) untuk menyebut nama bahan baku.
create table if not exists public.inventory (
  inventory_id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (expense_id) on delete cascade,
  name text not null,
  current_stock integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ingredients: resep/BOM produk -> bahan baku (inventory) + kuantitas dipakai
create table if not exists public.ingredients (
  product_id uuid not null references public.products (product_id) on delete cascade,
  inventory_id uuid not null references public.inventory (inventory_id) on delete cascade,
  quantity integer not null default 0,
  primary key (product_id, inventory_id)
);

-- transactions: transaksi penjualan
create table if not exists public.transactions (
  sales_id uuid primary key default gen_random_uuid(),
  sale_date timestamptz not null default now(),
  payment_method text not null,
  payment_status boolean not null default true,
  subtotal numeric(12, 2) not null default 0,
  tax numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  business_id uuid not null references public.company (business_id) on delete cascade,
  cashier_id uuid not null references public.users (id)
);

-- receipt_details: baris item pada sebuah transaksi
-- deviasi kecil dari ERD: id surrogate ditambahkan sebagai primary key
-- supaya satu transaksi bisa memiliki >1 baris untuk produk yang sama.
create table if not exists public.receipt_details (
  id uuid primary key default gen_random_uuid(),
  sales_id uuid not null references public.transactions (sales_id) on delete cascade,
  product_id uuid not null references public.products (product_id),
  name text not null,
  quantity integer not null default 0,
  price numeric(12, 2) not null default 0,
  subtotal numeric(12, 2) not null default 0
);

-- =========================================================
-- INDEXES
-- =========================================================
create index if not exists idx_company_owner_id on public.company (owner_id);
create index if not exists idx_company_worker_employee_id on public.company_worker (employee_id);
create index if not exists idx_company_worker_work_at on public.company_worker (work_at);
create index if not exists idx_products_business_id on public.products (business_id);
create index if not exists idx_expenses_business_id on public.expenses (business_id);
create index if not exists idx_expenses_user_id on public.expenses (user_id);
create index if not exists idx_inventory_expense_id on public.inventory (expense_id);
create index if not exists idx_ingredients_inventory_id on public.ingredients (inventory_id);
create index if not exists idx_transactions_business_id on public.transactions (business_id);
create index if not exists idx_transactions_cashier_id on public.transactions (cashier_id);
create index if not exists idx_receipt_details_sales_id on public.receipt_details (sales_id);
create index if not exists idx_receipt_details_product_id on public.receipt_details (product_id);

-- =========================================================
-- TRIGGERS
-- =========================================================

-- Auto-buat baris public.users setiap kali ada sign up baru di Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, role, username, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'employee')::public.user_role,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at pada inventory setiap kali di-update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_inventory_updated_at on public.inventory;
create trigger trg_inventory_updated_at
  before update on public.inventory
  for each row execute function public.set_updated_at();

-- =========================================================
-- HELPER FUNCTIONS (dipakai oleh RLS policies)
-- =========================================================

create or replace function public.is_company_owner(p_business_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.company c
    where c.business_id = p_business_id and c.owner_id = auth.uid()
  );
$$;

create or replace function public.is_company_member(p_business_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_company_owner(p_business_id)
    or exists (
      select 1 from public.company_worker cw
      where cw.work_at = p_business_id and cw.employee_id = auth.uid()
    );
$$;

-- Dipakai Owner untuk mencari user (calon karyawan) berdasarkan email,
-- tanpa perlu membuka akses SELECT publik ke seluruh tabel users.
create or replace function public.find_user_by_email(p_email text)
returns table (id uuid, username text, email text, role public.user_role)
language sql
security definer
stable
set search_path = public
as $$
  select u.id, u.username, u.email, u.role
  from public.users u
  where u.email = p_email and u.role = 'employee';
$$;

grant execute on function public.find_user_by_email(text) to authenticated;

-- =========================================================
-- RPC: checkout_transaction — buat transaksi + receipt_details + kurangi
-- stok inventory sesuai resep (ingredients) secara atomic.
-- p_items: jsonb array, contoh: [{"product_id":"...","quantity":2}]
-- =========================================================
create or replace function public.checkout_transaction(
  p_business_id uuid,
  p_payment_method text,
  p_tax numeric,
  p_items jsonb
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_sales_id uuid := gen_random_uuid();
  v_item jsonb;
  v_product record;
  v_qty integer;
  v_line_subtotal numeric;
  v_ingredient record;
  v_needed integer;
  v_result public.transactions;
begin
  if not public.is_company_member(p_business_id) then
    raise exception 'Tidak memiliki akses ke bisnis ini';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang kosong';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select p.product_id, p.name, p.sell_price into v_product
      from public.products p
      where p.product_id = (v_item->>'product_id')::uuid
        and p.business_id = p_business_id;

    if not found then
      raise exception 'Produk tidak ditemukan pada bisnis ini';
    end if;

    v_qty := (v_item->>'quantity')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Kuantitas item tidak valid';
    end if;

    v_subtotal := v_subtotal + (v_product.sell_price * v_qty);
  end loop;

  v_total := v_subtotal + coalesce(p_tax, 0);

  insert into public.transactions
    (sales_id, sale_date, payment_method, payment_status, subtotal, tax, total, business_id, cashier_id)
  values
    (v_sales_id, now(), p_payment_method, true, v_subtotal, coalesce(p_tax, 0), v_total, p_business_id, auth.uid());

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select p.product_id, p.name, p.sell_price into v_product
      from public.products p
      where p.product_id = (v_item->>'product_id')::uuid
        and p.business_id = p_business_id;

    v_qty := (v_item->>'quantity')::integer;
    v_line_subtotal := v_product.sell_price * v_qty;

    insert into public.receipt_details (sales_id, product_id, name, quantity, price, subtotal)
    values (v_sales_id, v_product.product_id, v_product.name, v_qty, v_product.sell_price, v_line_subtotal);

    for v_ingredient in
      select ig.inventory_id, ig.quantity, inv.current_stock
      from public.ingredients ig
      join public.inventory inv on inv.inventory_id = ig.inventory_id
      where ig.product_id = v_product.product_id
      for update of inv
    loop
      v_needed := v_ingredient.quantity * v_qty;
      if v_ingredient.current_stock < v_needed then
        raise exception 'Stok tidak cukup untuk produk %', v_product.name;
      end if;

      update public.inventory
        set current_stock = current_stock - v_needed
        where inventory_id = v_ingredient.inventory_id;
    end loop;
  end loop;

  select * into v_result from public.transactions where sales_id = v_sales_id;
  return v_result;
end;
$$;

grant execute on function public.checkout_transaction(uuid, text, numeric, jsonb) to authenticated;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.users enable row level security;
alter table public.company enable row level security;
alter table public.company_worker enable row level security;
alter table public.products enable row level security;
alter table public.expenses enable row level security;
alter table public.inventory enable row level security;
alter table public.ingredients enable row level security;
alter table public.transactions enable row level security;
alter table public.receipt_details enable row level security;

-- users
drop policy if exists "users can view own or employer/employee profile" on public.users;
create policy "users can view own or employer/employee profile" on public.users
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.company_worker cw
      where cw.employee_id = users.id and public.is_company_owner(cw.work_at)
    )
  );

drop policy if exists "users can update own profile" on public.users;
create policy "users can update own profile" on public.users
  for update using (id = auth.uid());

-- company
drop policy if exists "members can view their company" on public.company;
create policy "members can view their company" on public.company
  for select using (public.is_company_member(business_id));

drop policy if exists "owner can create own company" on public.company;
create policy "owner can create own company" on public.company
  for insert with check (
    owner_id = auth.uid()
    and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'owner')
  );

drop policy if exists "owner can update own company" on public.company;
create policy "owner can update own company" on public.company
  for update using (owner_id = auth.uid());

drop policy if exists "owner can delete own company" on public.company;
create policy "owner can delete own company" on public.company
  for delete using (owner_id = auth.uid());

-- company_worker
drop policy if exists "members can view coworkers" on public.company_worker;
create policy "members can view coworkers" on public.company_worker
  for select using (public.is_company_member(work_at));

drop policy if exists "owner can add employees" on public.company_worker;
create policy "owner can add employees" on public.company_worker
  for insert with check (public.is_company_owner(work_at));

drop policy if exists "owner can remove employees" on public.company_worker;
create policy "owner can remove employees" on public.company_worker
  for delete using (public.is_company_owner(work_at));

-- products
drop policy if exists "members can view products" on public.products;
create policy "members can view products" on public.products
  for select using (public.is_company_member(business_id));

drop policy if exists "owner can manage products" on public.products;
create policy "owner can manage products" on public.products
  for all using (public.is_company_owner(business_id))
  with check (public.is_company_owner(business_id));

-- expenses
drop policy if exists "members can view expenses" on public.expenses;
create policy "members can view expenses" on public.expenses
  for select using (public.is_company_member(business_id));

drop policy if exists "members can record expenses" on public.expenses;
create policy "members can record expenses" on public.expenses
  for insert with check (public.is_company_member(business_id) and user_id = auth.uid());

drop policy if exists "members can update own expenses" on public.expenses;
create policy "members can update own expenses" on public.expenses
  for update using (public.is_company_member(business_id));

-- inventory (scoped melalui expenses.business_id)
drop policy if exists "members can view inventory" on public.inventory;
create policy "members can view inventory" on public.inventory
  for select using (
    exists (
      select 1 from public.expenses e
      where e.expense_id = inventory.expense_id and public.is_company_member(e.business_id)
    )
  );

drop policy if exists "members can manage inventory" on public.inventory;
create policy "members can manage inventory" on public.inventory
  for all using (
    exists (
      select 1 from public.expenses e
      where e.expense_id = inventory.expense_id and public.is_company_member(e.business_id)
    )
  )
  with check (
    exists (
      select 1 from public.expenses e
      where e.expense_id = inventory.expense_id and public.is_company_member(e.business_id)
    )
  );

-- ingredients (scoped melalui products.business_id)
drop policy if exists "members can view ingredients" on public.ingredients;
create policy "members can view ingredients" on public.ingredients
  for select using (
    exists (
      select 1 from public.products p
      where p.product_id = ingredients.product_id and public.is_company_member(p.business_id)
    )
  );

drop policy if exists "owner can manage ingredients" on public.ingredients;
create policy "owner can manage ingredients" on public.ingredients
  for all using (
    exists (
      select 1 from public.products p
      where p.product_id = ingredients.product_id and public.is_company_owner(p.business_id)
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.product_id = ingredients.product_id and public.is_company_owner(p.business_id)
    )
  );

-- transactions (read-only dari client; penulisan hanya lewat RPC checkout_transaction)
drop policy if exists "members can view transactions" on public.transactions;
create policy "members can view transactions" on public.transactions
  for select using (public.is_company_member(business_id));

-- receipt_details (read-only dari client; penulisan hanya lewat RPC checkout_transaction)
drop policy if exists "members can view receipt details" on public.receipt_details;
create policy "members can view receipt details" on public.receipt_details
  for select using (
    exists (
      select 1 from public.transactions t
      where t.sales_id = receipt_details.sales_id and public.is_company_member(t.business_id)
    )
  );
