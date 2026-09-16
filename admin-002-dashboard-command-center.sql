begin;

drop function if exists public.admin_dashboard_metrics();

create function public.admin_dashboard_metrics(period_key text default 'today')
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  period_start timestamptz;
  previous_start timestamptz;
  previous_end timestamptz;
  revenue_total numeric := 0;
  previous_revenue numeric := 0;
  order_total bigint := 0;
  previous_order_total bigint := 0;
  paid_total bigint := 0;
  pending_total bigint := 0;
  low_stock_total bigint := 0;
  customer_total bigint := 0;
  sales_series jsonb := '[]'::jsonb;
  recent_orders jsonb := '[]'::jsonb;
  low_stock_products jsonb := '[]'::jsonb;
  top_products jsonb := '[]'::jsonb;
  attention_items jsonb := '[]'::jsonb;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  case period_key
    when '7d' then
      period_start := date_trunc('day', now()) - interval '6 days';
      previous_end := period_start;
      previous_start := period_start - interval '7 days';
    when '30d' then
      period_start := date_trunc('day', now()) - interval '29 days';
      previous_end := period_start;
      previous_start := period_start - interval '30 days';
    when 'month' then
      period_start := date_trunc('month', now());
      previous_end := period_start;
      previous_start := period_start - interval '1 month';
    else
      period_start := date_trunc('day', now());
      previous_end := period_start;
      previous_start := period_start - interval '1 day';
      period_key := 'today';
  end case;

  select
    coalesce(sum(total) filter (where status in ('pago','concluido')), 0),
    count(*),
    count(*) filter (where status in ('pago','concluido')),
    count(*) filter (where status not in ('pago','concluido','cancelado'))
  into revenue_total, order_total, paid_total, pending_total
  from public.orders
  where created_at >= period_start and created_at <= now();

  select
    coalesce(sum(total) filter (where status in ('pago','concluido')), 0),
    count(*)
  into previous_revenue, previous_order_total
  from public.orders
  where created_at >= previous_start and created_at < previous_end;

  select count(*) into low_stock_total
  from public.products
  where active and stock <= stock_min;

  select count(distinct coalesce(nullif(lower(customer_email),''), nullif(customer_phone,''))) into customer_total
  from public.orders
  where coalesce(nullif(customer_email,''), nullif(customer_phone,'')) is not null;

  select coalesce(jsonb_agg(jsonb_build_object(
    'date', to_char(day_bucket.day, 'YYYY-MM-DD'),
    'label', to_char(day_bucket.day, 'DD/MM'),
    'orders', coalesce(day_data.orders_count, 0),
    'revenue', coalesce(day_data.revenue, 0)
  ) order by day_bucket.day), '[]'::jsonb)
  into sales_series
  from generate_series(date_trunc('day', period_start), date_trunc('day', now()), interval '1 day') day_bucket(day)
  left join (
    select date_trunc('day', created_at) as day,
      count(*) as orders_count,
      coalesce(sum(total) filter (where status in ('pago','concluido')), 0) as revenue
    from public.orders
    where created_at >= period_start and created_at <= now()
    group by 1
  ) day_data on day_data.day = day_bucket.day;

  select coalesce(jsonb_agg(to_jsonb(recent) order by recent.created_at desc), '[]'::jsonb)
  into recent_orders
  from (
    select id, customer_name, total, status, created_at, null::text as payment_method
    from public.orders
    where created_at >= period_start and created_at <= now()
    order by created_at desc
    limit 5
  ) recent;

  select coalesce(jsonb_agg(to_jsonb(product_row) order by product_row.stock asc, product_row.name), '[]'::jsonb)
  into low_stock_products
  from (
    select id, name, category, image_url, stock, stock_min,
      case when stock = 0 then 'critical' when stock < stock_min then 'critical' else 'warning' end as stock_status
    from public.products
    where active and stock <= stock_min
    order by stock asc, name asc
    limit 6
  ) product_row;

  select coalesce(jsonb_agg(to_jsonb(sold) order by sold.quantity_sold desc, sold.revenue_generated desc), '[]'::jsonb)
  into top_products
  from (
    select
      coalesce(product.id, case when (item.value->>'product_id') ~ '^\d+$' then (item.value->>'product_id')::bigint end) as product_id,
      coalesce(product.name, item.value->>'name', 'Produto') as name,
      product.image_url,
      sum(case when (item.value->>'quantity') ~ '^\d+$' then (item.value->>'quantity')::integer else 0 end)::bigint as quantity_sold,
      sum(
        (case when (item.value->>'quantity') ~ '^\d+$' then (item.value->>'quantity')::numeric else 0 end) *
        (case when (item.value->>'unit_price') ~ '^\d+(\.\d+)?$' then (item.value->>'unit_price')::numeric else 0 end)
      ) as revenue_generated
    from public.orders order_row
    cross join lateral jsonb_array_elements(case when jsonb_typeof(order_row.items)='array' then order_row.items else '[]'::jsonb end) as item(value)
    left join public.products product on product.id = case when (item.value->>'product_id') ~ '^\d+$' then (item.value->>'product_id')::bigint end
    where order_row.created_at >= period_start and order_row.created_at <= now()
      and order_row.status in ('pago','concluido')
    group by coalesce(product.id, case when (item.value->>'product_id') ~ '^\d+$' then (item.value->>'product_id')::bigint end), coalesce(product.name, item.value->>'name', 'Produto'), product.image_url
    order by quantity_sold desc, revenue_generated desc
    limit 5
  ) sold;

  select coalesce(jsonb_agg(to_jsonb(alert_row)), '[]'::jsonb)
  into attention_items
  from (
    select 'out_of_stock'::text as type, 'critical'::text as level, count(*)::bigint as count, 'Produtos sem estoque'::text as label
    from public.products where active and stock = 0 having count(*) > 0
    union all
    select 'low_stock', 'warning', count(*)::bigint, 'Produtos no estoque mínimo'
    from public.products where active and stock > 0 and stock <= stock_min having count(*) > 0
    union all
    select 'pending_orders', 'warning', count(*)::bigint, 'Pedidos pendentes há mais de 24 horas'
    from public.orders where status not in ('pago','concluido','cancelado') and created_at < now() - interval '24 hours' having count(*) > 0
    union all
    select 'pending_payment', 'warning', count(*)::bigint, 'Pagamentos aguardando confirmação'
    from public.orders where status in ('aguardando_pagamento','recebido') having count(*) > 0
  ) alert_row;

  return jsonb_build_object(
    'period', period_key,
    'period_start', period_start,
    'updated_at', now(),
    'revenue', revenue_total,
    'revenue_previous', previous_revenue,
    'revenue_change', case when previous_revenue > 0 then round(((revenue_total - previous_revenue) / previous_revenue) * 100, 1) else null end,
    'orders_total', order_total,
    'orders_previous', previous_order_total,
    'orders_change', case when previous_order_total > 0 then round(((order_total - previous_order_total)::numeric / previous_order_total) * 100, 1) else null end,
    'average_ticket', case when paid_total > 0 then round(revenue_total / paid_total, 2) else 0 end,
    'completed_sales', paid_total,
    'orders_pending', pending_total,
    'low_stock', low_stock_total,
    'customers_total', customer_total,
    'services_total', 0,
    'sales_series', sales_series,
    'recent_orders', recent_orders,
    'low_stock_products', low_stock_products,
    'top_products', top_products,
    'attention_items', attention_items
  );
end;
$$;

revoke all on function public.admin_dashboard_metrics(text) from public;
grant execute on function public.admin_dashboard_metrics(text) to authenticated;

commit;
