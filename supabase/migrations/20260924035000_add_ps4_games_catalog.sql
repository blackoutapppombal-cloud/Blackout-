begin;

alter table public.products
  add column if not exists subcategory text not null default '',
  add column if not exists condition text not null default 'Novo',
  add column if not exists product_status text not null default 'Em estoque',
  add column if not exists search_terms text not null default '';

insert into public.categories (name, slug, icon, active, sort_order)
values ('Jogos', 'jogos', '🎮', true, 10)
on conflict (name) do update
set slug = excluded.slug,
    icon = excluded.icon,
    active = true,
    sort_order = excluded.sort_order,
    updated_at = now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_sku_key'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products add constraint products_sku_key unique (sku);
  end if;
end
$$;

insert into public.products (
  name, category, subcategory, condition, product_status, platform,
  price, old_price, discount, image_url, icon, glow, stock, stock_min,
  brand, rating, description, search_terms, active, sku
)
values
  ('Horizon Zero Dawn Complete Edition','Jogos','PS4','Novo','Em estoque','PlayStation 4',100,100,0,'./assets/game-ps4-horizon-zero-dawn.png','🎮','#087dff',1,1,'Guerrilla Games',null,'Horizon Zero Dawn Complete Edition para PlayStation 4.','horizon zero dawn complete edition ps4 playstation 4',true,'BIG-GAME-PS4-HZD-COMPLETE'),
  ('Horizon Forbidden West','Jogos','PS4','Novo','Em estoque','PlayStation 4',100,100,0,'./assets/game-ps4-horizon-forbidden-west.png','🎮','#087dff',1,1,'Guerrilla Games',null,'Horizon Forbidden West para PlayStation 4.','horizon forbidden west ps4 playstation 4',true,'BIG-GAME-PS4-HFW'),
  ('God of War III Remastered','Jogos','PS4','Novo','Em estoque','PlayStation 4',100,100,0,'./assets/game-ps4-god-of-war-3-remastered.png','🎮','#087dff',1,1,'Santa Monica Studio',null,'God of War III Remastered para PlayStation 4.','god of war iii 3 remastered ps4 playstation 4',true,'BIG-GAME-PS4-GOW3-REMASTERED'),
  ('God of War','Jogos','PS4','Novo','Em estoque','PlayStation 4',100,100,0,'./assets/game-ps4-god-of-war-2018.png','🎮','#087dff',1,1,'Santa Monica Studio',null,'God of War para PlayStation 4.','god of war 2018 ps4 playstation 4',true,'BIG-GAME-PS4-GOW-2018'),
  ('God of War Ragnarök','Jogos','PS4','Novo','Em estoque','PlayStation 4',100,100,0,'./assets/game-ps4-god-of-war-ragnarok.png','🎮','#087dff',1,1,'Santa Monica Studio',null,'God of War Ragnarök para PlayStation 4.','god of war ragnarok ragnarök ps4 playstation 4',true,'BIG-GAME-PS4-GOW-RAGNAROK'),
  ('The Witcher 3: Wild Hunt','Jogos','PS4','Novo','Em estoque','PlayStation 4',100,100,0,'./assets/game-ps4-the-witcher-3.png','🎮','#087dff',1,1,'CD Projekt Red',null,'The Witcher 3: Wild Hunt para PlayStation 4.','the witcher 3 wild hunt ps4 playstation 4',true,'BIG-GAME-PS4-WITCHER3'),
  ('Ghost of Tsushima','Jogos','PS4','Novo','Em estoque','PlayStation 4',100,100,0,'./assets/game-ps4-ghost-of-tsushima.png','🎮','#087dff',1,1,'Sucker Punch',null,'Ghost of Tsushima para PlayStation 4.','ghost of tsushima ps4 playstation 4',true,'BIG-GAME-PS4-GHOST-TSUSHIMA'),
  ('The Last of Us Remastered','Jogos','PS4','Novo','Em estoque','PlayStation 4',100,100,0,'./assets/game-ps4-the-last-of-us-remastered.png','🎮','#087dff',1,1,'Naughty Dog',null,'The Last of Us Remastered para PlayStation 4.','the last of us remastered ps4 playstation 4',true,'BIG-GAME-PS4-TLOU-REMASTERED'),
  ('The Last of Us Part II','Jogos','PS4','Novo','Em estoque','PlayStation 4',100,100,0,'./assets/game-ps4-the-last-of-us-part-2.png','🎮','#087dff',1,1,'Naughty Dog',null,'The Last of Us Part II para PlayStation 4.','the last of us part ii 2 ps4 playstation 4',true,'BIG-GAME-PS4-TLOU2'),
  ('Resident Evil Village','Jogos','PS4','Novo','Em estoque','PlayStation 4',100,100,0,'./assets/game-ps4-resident-evil-village.png','🎮','#087dff',1,1,'Capcom',null,'Resident Evil Village para PlayStation 4.','resident evil village 8 ps4 playstation 4',true,'BIG-GAME-PS4-RE-VILLAGE')
on conflict (sku) do update set
  name = excluded.name,
  category = excluded.category,
  subcategory = excluded.subcategory,
  condition = excluded.condition,
  product_status = excluded.product_status,
  platform = excluded.platform,
  image_url = excluded.image_url,
  icon = excluded.icon,
  glow = excluded.glow,
  brand = excluded.brand,
  description = excluded.description,
  search_terms = excluded.search_terms,
  active = true,
  updated_at = now();

create index if not exists products_category_subcategory_active_idx
  on public.products (category, subcategory, active);

commit;
