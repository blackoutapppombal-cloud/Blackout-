-- BLACKOUT INFOR GAMES — Controle PS5 DualSense em Acessórios > Controles.
-- Execute depois de console-001-product-variants.sql.
begin;

alter table public.products
  add column if not exists subcategory text not null default '',
  add column if not exists condition text not null default 'Novo',
  add column if not exists product_status text not null default 'Em estoque',
  add column if not exists search_terms text not null default '';

insert into public.categories(name,slug,icon,active,sort_order)
values('Acessórios','acessorios','🎧',true,20)
on conflict(name) do update set active=true,updated_at=now();

do $$
declare dualsense_id bigint;
begin
  select id into dualsense_id
  from public.products
  where sku='BIG-DUALSENSE-PS5' or lower(name) like '%dualsense%'
  order by id limit 1;

  if dualsense_id is null then
    insert into public.products(
      name,category,subcategory,condition,product_status,platform,price,old_price,
      discount,image_url,icon,glow,stock,stock_min,brand,rating,description,
      search_terms,active,sku
    ) values (
      'Controle PS5 DualSense','Acessórios','Controles','Novo','Em estoque','PlayStation 5',
      400,400,0,'./assets/dualsense-ps5-blackout.png','🎮','#00bfff',6,1,'Sony',null,
      'Controle sem fio DualSense novo para PlayStation 5, com resposta tátil, gatilhos adaptáveis e ergonomia aprimorada.',
      'DualSense Controle PS5 PS5 Controle PlayStation Controle Sony',true,'BIG-DUALSENSE-PS5'
    ) returning id into dualsense_id;
  else
    update public.products set
      name='Controle PS5 DualSense',category='Acessórios',subcategory='Controles',condition='Novo',
      product_status='Em estoque',platform='PlayStation 5',price=400,old_price=400,discount=0,
      image_url='./assets/dualsense-ps5-blackout.png',icon='🎮',glow='#00bfff',stock=6,stock_min=1,
      brand='Sony',description='Controle sem fio DualSense novo para PlayStation 5, com resposta tátil, gatilhos adaptáveis e ergonomia aprimorada.',
      search_terms='DualSense Controle PS5 PS5 Controle PlayStation Controle Sony',active=true,
      sku='BIG-DUALSENSE-PS5',updated_at=now()
    where id=dualsense_id;
  end if;
end;
$$;

commit;
