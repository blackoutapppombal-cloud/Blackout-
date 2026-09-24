begin;

create or replace function public.admin_create_manual_product_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_payment_method text,
  p_status text,
  p_admin_notes text,
  p_items jsonb,
  p_idempotency_key uuid,
  p_expected_total numeric
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  existing public.orders%rowtype;
  placed public.orders%rowtype;
  product_row public.products%rowtype;
  item record;
  quantity integer;
  seen_ids bigint[] := '{}';
  snapshot jsonb := '[]'::jsonb;
  subtotal numeric(12,2) := 0;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário.';
  end if;
  if p_idempotency_key is null then
    raise exception 'Identificador da tentativa obrigatório.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));
  select * into existing from public.orders where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('id', existing.id, 'order_number', existing.order_number);
  end if;
  if length(btrim(coalesce(p_customer_name, ''))) < 2 then
    raise exception 'Informe o nome do cliente.';
  end if;
  if btrim(coalesce(p_payment_method, '')) = '' or length(p_payment_method) > 80 then
    raise exception 'Informe a forma de pagamento.';
  end if;
  if p_status not in ('recebido', 'aguardando_pagamento', 'pago', 'em_preparacao', 'pronto', 'concluido') then
    raise exception 'Status inválido para um novo pedido com estoque reservado.';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Selecione de 1 a 50 produtos.';
  end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'Selecione de 1 a 50 produtos.';
  end if;

  for item in
    select (value->>'product_id')::bigint as product_id, value
    from jsonb_array_elements(p_items) as value
    order by (value->>'product_id')::bigint
  loop
    if item.product_id is null or item.product_id <= 0 or item.product_id = any(seen_ids)
       or (item.value->>'quantity') !~ '^[1-9][0-9]{0,3}$' then
      raise exception 'Produto ou quantidade inválida.';
    end if;
    quantity := (item.value->>'quantity')::integer;
    seen_ids := array_append(seen_ids, item.product_id);
    select * into product_row from public.products where id = item.product_id for update;
    if not found or not product_row.active then
      raise exception 'Produto indisponível: %', item.product_id;
    end if;
    if product_row.stock < quantity then
      raise exception 'Estoque insuficiente: % (disponível: %)', product_row.name, product_row.stock;
    end if;
    subtotal := subtotal + product_row.price * quantity;
    snapshot := snapshot || jsonb_build_array(jsonb_build_object(
      'product_id', product_row.id, 'name', product_row.name,
      'sku', coalesce(product_row.sku, 'BIG-' || product_row.id),
      'image_url', product_row.image_url, 'quantity', quantity,
      'unit_price', product_row.price, 'subtotal', product_row.price * quantity
    ));
  end loop;

  if p_expected_total is null or subtotal <> p_expected_total then
    raise exception 'Preço ou total atualizado. Revise o pedido antes de confirmar.';
  end if;

  insert into public.orders (
    customer_name, customer_phone, customer_email, payment_method, payment_status,
    status, admin_notes, items, subtotal, total, discount_total, shipping_total,
    idempotency_key, stock_reserved
  ) values (
    btrim(p_customer_name), nullif(btrim(coalesce(p_customer_phone, '')), ''),
    nullif(btrim(coalesce(p_customer_email, '')), ''), btrim(p_payment_method),
    case when p_status in ('pago', 'em_preparacao', 'pronto', 'concluido') then 'paid' else 'pending' end,
    p_status, nullif(btrim(coalesce(p_admin_notes, '')), ''), snapshot,
    subtotal, subtotal, 0, 0, p_idempotency_key, true
  ) returning * into placed;

  update public.orders
  set order_number = 'BIG-' || lpad(placed.id::text, 8, '0')
  where id = placed.id returning * into placed;

  for item in select value from jsonb_array_elements(snapshot) as value loop
    update public.products
    set stock = stock - (item.value->>'quantity')::integer
    where id = (item.value->>'product_id')::bigint
      and stock >= (item.value->>'quantity')::integer;
    if not found then
      raise exception 'Estoque insuficiente: %', item.value->>'name';
    end if;
  end loop;

  return jsonb_build_object('id', placed.id, 'order_number', placed.order_number);
end;
$$;

revoke all on function public.admin_create_manual_product_order(text,text,text,text,text,text,jsonb,uuid,numeric) from public, anon, authenticated;
grant execute on function public.admin_create_manual_product_order(text,text,text,text,text,text,jsonb,uuid,numeric) to authenticated;

commit;
