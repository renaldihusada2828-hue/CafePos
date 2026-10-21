-- ============================================================
-- MelekCafe POS — Complete Database Schema
-- Version: 1.0.0
-- Run once in Supabase SQL Editor → New query → Run All
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('admin', 'cashier');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method_type as enum ('cash', 'qris', 'transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status_type as enum ('paid', 'pending', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sale_status_type as enum ('completed', 'voided');
exception when duplicate_object then null; end $$;

do $$ begin
  create type stock_movement_type as enum (
    'sale', 'restock', 'adjustment', 'void_return', 'initial'
  );
exception when duplicate_object then null; end $$;

-- ────────────────────────────────────────────────────────────
-- 1. profiles
-- ────────────────────────────────────────────────────────────
create table if not exists profiles (
  id                   uuid        primary key references auth.users(id) on delete cascade,
  login_id             text        not null unique check (login_id ~ '^[a-z0-9_]{3,40}$'),
  auth_email           text        not null unique,
  role                 user_role   not null default 'cashier',
  display_name         text        not null default '' check (char_length(display_name) <= 80),
  is_active            boolean     not null default true,
  must_change_password boolean     not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table profiles enable row level security;

-- Users can read their own profile
create policy "profiles_select_own"
  on profiles for select
  using (auth.uid() = id);

-- Admin can read all profiles
create policy "profiles_select_admin"
  on profiles for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
    )
  );

-- Admin can update any profile (except escalating own role — enforced in app layer)
create policy "profiles_update_admin"
  on profiles for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
    )
  );

-- Users can update their own profile (limited fields — enforced in app layer)
create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id);

-- ────────────────────────────────────────────────────────────
-- 2. products
-- ────────────────────────────────────────────────────────────
create table if not exists products (
  id          uuid           primary key default gen_random_uuid(),
  name        text           not null check (char_length(name) between 1 and 100),
  category    text           not null default '',
  price       numeric(12, 2) not null check (price >= 0),
  description text           not null default '',
  is_active   boolean        not null default true,
  created_at  timestamptz    not null default now(),
  updated_at  timestamptz    not null default now()
);

create index if not exists idx_products_category on products (category);
create index if not exists idx_products_active on products (is_active);

alter table products enable row level security;

-- All authenticated users can read all products (including inactive — UI filters)
create policy "products_select_authenticated"
  on products for select
  using (auth.uid() is not null);

create policy "products_insert_admin"
  on products for insert
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
    )
  );

create policy "products_update_admin"
  on products for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
    )
  );

-- No hard delete — use is_active = false

-- ────────────────────────────────────────────────────────────
-- 3. raw_materials
-- ────────────────────────────────────────────────────────────
create table if not exists raw_materials (
  id             uuid            primary key default gen_random_uuid(),
  name           text            not null unique check (char_length(name) between 1 and 100),
  base_unit      text            not null check (char_length(base_unit) between 1 and 20),
  stock_quantity numeric(14, 4)  not null default 0,
  minimum_stock  numeric(14, 4)  not null default 0,
  cost_per_unit  numeric(12, 2)  not null default 0 check (cost_per_unit >= 0),
  is_active      boolean         not null default true,
  created_at     timestamptz     not null default now(),
  updated_at     timestamptz     not null default now()
);

create index if not exists idx_raw_materials_name on raw_materials (name);

alter table raw_materials enable row level security;

create policy "raw_materials_select_authenticated"
  on raw_materials for select
  using (auth.uid() is not null);

create policy "raw_materials_insert_admin"
  on raw_materials for insert
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
    )
  );

create policy "raw_materials_update_admin"
  on raw_materials for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
    )
  );

create policy "raw_materials_delete_admin"
  on raw_materials for delete
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
    )
  );

-- ────────────────────────────────────────────────────────────
-- 4. recipes
-- ────────────────────────────────────────────────────────────
create table if not exists recipes (
  id          uuid        primary key default gen_random_uuid(),
  product_id  uuid        not null unique references products(id) on delete cascade,
  notes       text        not null default '',
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table recipes enable row level security;

create policy "recipes_select_authenticated"
  on recipes for select
  using (auth.uid() is not null);

create policy "recipes_insert_admin"
  on recipes for insert
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
    )
  );

create policy "recipes_update_admin"
  on recipes for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
    )
  );

create policy "recipes_delete_admin"
  on recipes for delete
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
    )
  );

-- ────────────────────────────────────────────────────────────
-- 5. recipe_items
-- ────────────────────────────────────────────────────────────
create table if not exists recipe_items (
  id              uuid           primary key default gen_random_uuid(),
  recipe_id       uuid           not null references recipes(id) on delete cascade,
  raw_material_id uuid           not null references raw_materials(id) on delete restrict,
  quantity        numeric(14, 4) not null check (quantity > 0),
  unit            text           not null default '',
  created_at      timestamptz    not null default now(),
  unique (recipe_id, raw_material_id)
);

create index if not exists idx_recipe_items_recipe on recipe_items (recipe_id);

alter table recipe_items enable row level security;

create policy "recipe_items_select_authenticated"
  on recipe_items for select
  using (auth.uid() is not null);

create policy "recipe_items_insert_admin"
  on recipe_items for insert
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
    )
  );

create policy "recipe_items_update_admin"
  on recipe_items for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
    )
  );

create policy "recipe_items_delete_admin"
  on recipe_items for delete
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
    )
  );

-- ────────────────────────────────────────────────────────────
-- 6. sales
-- ────────────────────────────────────────────────────────────
create table if not exists sales (
  id              uuid                 primary key default gen_random_uuid(),
  receipt_number  text                 not null unique,
  cashier_id      uuid                 not null references auth.users(id),
  total_amount    numeric(14, 2)       not null default 0 check (total_amount >= 0),
  payment_method  payment_method_type  not null,
  payment_status  payment_status_type  not null default 'pending',
  amount_received numeric(14, 2),
  status          sale_status_type     not null default 'completed',
  voided_by       uuid                 references auth.users(id),
  voided_at       timestamptz,
  void_reason     text,
  created_at      timestamptz          not null default now()
);

create index if not exists idx_sales_cashier on sales (cashier_id);
create index if not exists idx_sales_created on sales (created_at desc);
create index if not exists idx_sales_status on sales (status);
create index if not exists idx_sales_payment_status on sales (payment_status);

alter table sales enable row level security;

-- Cashier can read their own sales
create policy "sales_select_own_cashier"
  on sales for select
  using (cashier_id = auth.uid());

-- Admin can read all sales
create policy "sales_select_admin"
  on sales for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
    )
  );

-- Insert handled by checkout_sale RPC (SECURITY DEFINER) only

-- Admin can update sale status (void workflow via RPC)
create policy "sales_update_admin"
  on sales for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
    )
  );

-- ────────────────────────────────────────────────────────────
-- 7. sale_items
-- ────────────────────────────────────────────────────────────
create table if not exists sale_items (
  id                    uuid           primary key default gen_random_uuid(),
  sale_id               uuid           not null references sales(id) on delete cascade,
  product_id            uuid           references products(id) on delete set null,
  product_name_snapshot text           not null,
  quantity              integer        not null check (quantity > 0),
  unit_price            numeric(12, 2) not null check (unit_price >= 0),
  line_total            numeric(14, 2) not null check (line_total >= 0),
  created_at            timestamptz    not null default now()
);

create index if not exists idx_sale_items_sale on sale_items (sale_id);

alter table sale_items enable row level security;

create policy "sale_items_select_own_cashier"
  on sale_items for select
  using (
    exists (
      select 1 from sales s
      where s.id = sale_id and s.cashier_id = auth.uid()
    )
  );

create policy "sale_items_select_admin"
  on sale_items for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
    )
  );

-- ────────────────────────────────────────────────────────────
-- 8. stock_movements
-- ────────────────────────────────────────────────────────────
create table if not exists stock_movements (
  id              bigserial             primary key,
  raw_material_id uuid                  not null references raw_materials(id) on delete restrict,
  movement_type   stock_movement_type   not null,
  quantity_change numeric(14, 4)        not null,
  quantity_before numeric(14, 4)        not null,
  quantity_after  numeric(14, 4)        not null,
  reference_id    text,       -- sale_id or adjustment reference
  note            text,
  actor_id        uuid        references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_stock_movements_material on stock_movements (raw_material_id);
create index if not exists idx_stock_movements_created on stock_movements (created_at desc);

alter table stock_movements enable row level security;

create policy "stock_movements_select_admin"
  on stock_movements for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
    )
  );

-- Inserts only via server RPCs

-- ────────────────────────────────────────────────────────────
-- 9. audit_log
-- ────────────────────────────────────────────────────────────
create table if not exists audit_log (
  id          bigserial   primary key,
  actor_id    uuid        references auth.users(id) on delete set null,
  actor_email text,
  action      text        not null,
  entity      text        not null,
  entity_id   text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_log_created on audit_log (created_at desc);
create index if not exists idx_audit_log_entity on audit_log (entity, entity_id);

alter table audit_log enable row level security;

create policy "audit_log_select_admin"
  on audit_log for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
    )
  );

-- ────────────────────────────────────────────────────────────
-- TRIGGERS: updated_at
-- ────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['profiles','products','raw_materials','recipes']
  loop
    execute format(
      'create or replace trigger trg_%I_updated_at
         before update on %I
         for each row execute function set_updated_at()',
      tbl, tbl
    );
  end loop;
end $$;

-- ────────────────────────────────────────────────────────────
-- HELPER FUNCTION: write to audit log (used by RPCs)
-- ────────────────────────────────────────────────────────────
create or replace function log_audit(
  p_actor_id  uuid,
  p_action    text,
  p_entity    text,
  p_entity_id text,
  p_detail    jsonb default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_email text;
begin
  select auth_email into v_email from profiles where id = p_actor_id;
  insert into audit_log (actor_id, actor_email, action, entity, entity_id, detail)
  values (p_actor_id, v_email, p_action, p_entity, p_entity_id, p_detail);
end $$;

-- ────────────────────────────────────────────────────────────
-- HELPER: record stock movement
-- ────────────────────────────────────────────────────────────
create or replace function record_stock_movement(
  p_material_id    uuid,
  p_movement_type  stock_movement_type,
  p_qty_change     numeric,
  p_qty_before     numeric,
  p_qty_after      numeric,
  p_reference_id   text    default null,
  p_note           text    default null,
  p_actor_id       uuid    default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into stock_movements (
    raw_material_id, movement_type, quantity_change,
    quantity_before, quantity_after, reference_id, note, actor_id
  ) values (
    p_material_id, p_movement_type, p_qty_change,
    p_qty_before, p_qty_after, p_reference_id, p_note, p_actor_id
  );
end $$;

-- ────────────────────────────────────────────────────────────
-- MAIN RPC: checkout_sale
-- Atomically creates a sale, deducts stock, records movements.
-- Must be called by an authenticated cashier or admin.
-- ────────────────────────────────────────────────────────────
create or replace function checkout_sale(
  p_items           jsonb,           -- [{productId, quantity}]
  p_payment_method  text,
  p_amount_received numeric          -- null for non-cash
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cashier_id      uuid   := auth.uid();
  v_cashier_profile record;
  v_receipt_no      text;
  v_sale_id         uuid;
  v_total           numeric(14,2) := 0;
  v_item            jsonb;
  v_product         record;
  v_recipe          record;
  v_ri              record;
  v_line_total      numeric(14,2);
  v_payment_status  payment_status_type;
  v_qty_before      numeric(14,4);
  v_qty_after       numeric(14,4);
  v_needed          numeric(14,4);
begin
  -- 1. Validate session
  if v_cashier_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- 2. Validate cashier profile
  select * into v_cashier_profile
    from profiles
   where id = v_cashier_id
     and is_active = true
     and role in ('admin', 'cashier');
  if not found then
    raise exception 'ACCESS_DENIED';
  end if;

  -- 3. Validate items array
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'ITEMS_EMPTY';
  end if;

  if jsonb_array_length(p_items) > 100 then
    raise exception 'ITEMS_TOO_MANY';
  end if;

  -- 4. Generate receipt number: MC-YYYYMMDD-HHMMSS-XXXX
  v_receipt_no := 'MC-'
    || to_char(now() at time zone 'Asia/Jakarta', 'YYYYMMDD-HH24MISS')
    || '-' || upper(substring(encode(gen_random_bytes(3), 'hex') for 6));

  -- 5. Create sale record (total will be updated after loop)
  v_sale_id := gen_random_uuid();
  insert into sales (
    id, receipt_number, cashier_id, total_amount,
    payment_method, payment_status, amount_received
  ) values (
    v_sale_id, v_receipt_no, v_cashier_id, 0,
    p_payment_method::payment_method_type, 'pending', p_amount_received
  );

  -- 6. Process each item
  for v_item in select * from jsonb_array_elements(p_items) loop

    -- Validate quantity
    if (v_item->>'quantity')::int < 1 or (v_item->>'quantity')::int > 99 then
      raise exception 'INVALID_QUANTITY: %', v_item->>'productId';
    end if;

    -- Lock and fetch product
    select id, name, price, is_active
      into v_product
      from products
     where id = (v_item->>'productId')::uuid
       for update;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND: %', v_item->>'productId';
    end if;

    if not v_product.is_active then
      raise exception 'PRODUCT_INACTIVE: %', v_product.name;
    end if;

    -- Calculate line total using DB price (not client-supplied)
    v_line_total := v_product.price * (v_item->>'quantity')::int;
    v_total      := v_total + v_line_total;

    -- Insert sale_item
    insert into sale_items (
      sale_id, product_id, product_name_snapshot,
      quantity, unit_price, line_total
    ) values (
      v_sale_id, v_product.id, v_product.name,
      (v_item->>'quantity')::int, v_product.price, v_line_total
    );

    -- Find active recipe for this product
    select id into v_recipe
      from recipes
     where product_id = v_product.id
       and is_active = true;

    if not found then
      raise exception 'RECIPE_MISSING: %', v_product.name;
    end if;

    -- Check and deduct each ingredient
    for v_ri in
      select ri.raw_material_id,
             ri.quantity * (v_item->>'quantity')::int as needed
        from recipe_items ri
       where ri.recipe_id = v_recipe.id
    loop
      v_needed := v_ri.needed;

      -- Lock raw material row
      select stock_quantity into v_qty_before
        from raw_materials
       where id = v_ri.raw_material_id
         and is_active = true
         for update;

      if not found then
        raise exception 'MATERIAL_NOT_FOUND: %', v_ri.raw_material_id;
      end if;

      if v_qty_before < v_needed then
        raise exception 'INSUFFICIENT_STOCK: %', v_ri.raw_material_id;
      end if;

      v_qty_after := v_qty_before - v_needed;

      -- Deduct stock
      update raw_materials
         set stock_quantity = v_qty_after,
             updated_at     = now()
       where id = v_ri.raw_material_id;

      -- Record movement
      perform record_stock_movement(
        v_ri.raw_material_id,
        'sale'::stock_movement_type,
        -v_needed,
        v_qty_before,
        v_qty_after,
        v_sale_id::text,
        'Sale: ' || v_receipt_no,
        v_cashier_id
      );
    end loop;

  end loop; -- end items loop

  -- 7. Determine payment status
  if p_payment_method = 'cash' then
    if p_amount_received is null or p_amount_received < v_total then
      raise exception 'UNDERPAID: received=%, total=%', p_amount_received, v_total;
    end if;
    v_payment_status := 'paid';
  else
    v_payment_status := 'pending';
  end if;

  -- 8. Finalize sale
  update sales
     set total_amount    = v_total,
         payment_status  = v_payment_status
   where id              = v_sale_id;

  -- 9. Audit log
  perform log_audit(
    v_cashier_id,
    'checkout',
    'sales',
    v_sale_id::text,
    jsonb_build_object(
      'receipt_number', v_receipt_no,
      'total', v_total,
      'payment_method', p_payment_method
    )
  );

  return jsonb_build_object(
    'saleId',        v_sale_id,
    'receiptNumber', v_receipt_no,
    'total',         v_total,
    'change',        case
                       when p_payment_method = 'cash'
                       then p_amount_received - v_total
                       else null
                     end
  );
end $$;

-- ────────────────────────────────────────────────────────────
-- RPC: confirm_payment  (admin marks non-cash as paid)
-- ────────────────────────────────────────────────────────────
create or replace function confirm_payment(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_role     user_role;
  v_sale     record;
begin
  select role into v_role from profiles where id = v_actor_id and is_active = true;
  if v_role <> 'admin' then raise exception 'FORBIDDEN'; end if;

  select * into v_sale from sales where id = p_sale_id for update;
  if not found then raise exception 'SALE_NOT_FOUND'; end if;
  if v_sale.status = 'voided' then raise exception 'SALE_VOIDED'; end if;
  if v_sale.payment_status = 'paid' then raise exception 'ALREADY_PAID'; end if;

  update sales set payment_status = 'paid' where id = p_sale_id;

  perform log_audit(v_actor_id, 'confirm_payment', 'sales', p_sale_id::text, null);
end $$;

-- ────────────────────────────────────────────────────────────
-- RPC: void_sale  (admin voids with reason, restores stock)
-- ────────────────────────────────────────────────────────────
create or replace function void_sale(p_sale_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_role     user_role;
  v_sale     record;
  v_item     record;
  v_ri       record;
  v_recipe   record;
  v_before   numeric(14,4);
  v_after    numeric(14,4);
begin
  select role into v_role from profiles where id = v_actor_id and is_active = true;
  if v_role <> 'admin' then raise exception 'FORBIDDEN'; end if;

  if p_reason is null or char_length(trim(p_reason)) < 5 then
    raise exception 'REASON_REQUIRED';
  end if;

  select * into v_sale from sales where id = p_sale_id for update;
  if not found then raise exception 'SALE_NOT_FOUND'; end if;
  if v_sale.status = 'voided' then raise exception 'ALREADY_VOIDED'; end if;

  -- Restore stock for each sale item
  for v_item in
    select si.product_id, si.quantity
      from sale_items si
     where si.sale_id = p_sale_id
       and si.product_id is not null
  loop
    select r.id into v_recipe
      from recipes r
     where r.product_id = v_item.product_id;
    if not found then continue; end if;

    for v_ri in
      select ri.raw_material_id,
             ri.quantity * v_item.quantity as restore_qty
        from recipe_items ri
       where ri.recipe_id = v_recipe.id
    loop
      select stock_quantity into v_before
        from raw_materials where id = v_ri.raw_material_id for update;

      if not found then continue; end if;

      v_after := v_before + v_ri.restore_qty;

      update raw_materials
         set stock_quantity = v_after, updated_at = now()
       where id = v_ri.raw_material_id;

      perform record_stock_movement(
        v_ri.raw_material_id,
        'void_return'::stock_movement_type,
        v_ri.restore_qty,
        v_before, v_after,
        p_sale_id::text,
        'Void: ' || p_reason,
        v_actor_id
      );
    end loop;
  end loop;

  update sales
     set status      = 'voided',
         voided_by   = v_actor_id,
         voided_at   = now(),
         void_reason = p_reason
   where id = p_sale_id;

  perform log_audit(
    v_actor_id, 'void_sale', 'sales', p_sale_id::text,
    jsonb_build_object('reason', p_reason)
  );
end $$;

-- ────────────────────────────────────────────────────────────
-- RPC: adjust_stock  (admin manual stock change with audit)
-- ────────────────────────────────────────────────────────────
create or replace function adjust_stock(
  p_material_id uuid,
  p_delta       numeric,
  p_note        text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_role     user_role;
  v_before   numeric(14,4);
  v_after    numeric(14,4);
  v_mat      record;
begin
  select role into v_role from profiles where id = v_actor_id and is_active = true;
  if v_role <> 'admin' then raise exception 'FORBIDDEN'; end if;

  if p_delta = 0 then raise exception 'DELTA_ZERO'; end if;

  select * into v_mat from raw_materials where id = p_material_id for update;
  if not found then raise exception 'MATERIAL_NOT_FOUND'; end if;

  v_before := v_mat.stock_quantity;
  v_after  := v_before + p_delta;

  if v_after < 0 then
    raise exception 'NEGATIVE_STOCK: current=%, delta=%', v_before, p_delta;
  end if;

  update raw_materials
     set stock_quantity = v_after, updated_at = now()
   where id = p_material_id;

  perform record_stock_movement(
    p_material_id,
    case when p_delta > 0 then 'restock'::stock_movement_type
         else 'adjustment'::stock_movement_type end,
    p_delta, v_before, v_after,
    null,
    coalesce(p_note, 'Manual adjustment'),
    v_actor_id
  );

  perform log_audit(
    v_actor_id, 'adjust_stock', 'raw_materials', p_material_id::text,
    jsonb_build_object('delta', p_delta, 'before', v_before, 'after', v_after, 'note', p_note)
  );

  return jsonb_build_object(
    'id',             p_material_id,
    'name',           v_mat.name,
    'stock_before',   v_before,
    'stock_after',    v_after,
    'delta',          p_delta
  );
end $$;

-- ────────────────────────────────────────────────────────────
-- GRANT execute permissions
-- ────────────────────────────────────────────────────────────
grant execute on function checkout_sale(jsonb, text, numeric)  to authenticated;
grant execute on function confirm_payment(uuid)                 to authenticated;
grant execute on function void_sale(uuid, text)                 to authenticated;
grant execute on function adjust_stock(uuid, numeric, text)     to authenticated;
