begin;

alter table public.products
  add column if not exists stock_min integer not null default 3 check (stock_min >= 0);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins can read own membership" on public.admin_users;
create policy "Admins can read own membership"
on public.admin_users for select
to authenticated
using (user_id = auth.uid() and public.is_admin());

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
on public.products for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders"
on public.orders for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.admin_dashboard_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'revenue', coalesce((select sum(total) from public.orders where status in ('pago', 'concluido')), 0),
    'orders_total', (select count(*) from public.orders),
    'orders_pending', (select count(*) from public.orders where status not in ('pago', 'concluido', 'cancelado')),
    'low_stock', (select count(*) from public.products where active and stock <= stock_min),
    'services_in_progress', 0,
    'recent_orders', coalesce((
      select jsonb_agg(row_to_json(recent_order) order by recent_order.created_at desc)
      from (
        select id, customer_name, total, status, created_at
        from public.orders
        order by created_at desc
        limit 6
      ) recent_order
    ), '[]'::jsonb),
    'low_stock_products', coalesce((
      select jsonb_agg(row_to_json(low_product) order by low_product.stock asc, low_product.name asc)
      from (
        select id, name, stock, stock_min, active
        from public.products
        where active and stock <= stock_min
        order by stock asc, name asc
        limit 8
      ) low_product
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_dashboard_metrics() from public;
grant execute on function public.admin_dashboard_metrics() to authenticated;

commit;
