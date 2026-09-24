begin;

alter table public.products
  add column if not exists subcategory text not null default '',
  add column if not exists condition text not null default 'Novo',
  add column if not exists product_status text not null default 'Em estoque',
  add column if not exists search_terms text not null default '';

insert into public.categories (name, slug, icon, active, sort_order)
values ('Acessórios', 'acessorios', '🎧', true, 20)
on conflict (name) do update
set slug = excluded.slug,
    icon = excluded.icon,
    active = true,
    sort_order = excluded.sort_order,
    updated_at = now();

-- O SKU é a chave natural deste lote: evita duplicação e permite UPSERT atômico.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_sku_key'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_sku_key unique (sku);
  end if;
end
$$;

-- Reaproveita o cadastro legado do Evolut antes do UPSERT.
update public.products
set sku = 'BIG-HEADSET-EVOLUT-EG307'
where id = (
  select id
  from public.products
  where lower(name) like '%evolut%rival%eg307%'
    and coalesce(sku, '') <> 'BIG-HEADSET-EVOLUT-EG307'
  order by id
  limit 1
)
and not exists (
  select 1
  from public.products
  where sku = 'BIG-HEADSET-EVOLUT-EG307'
);

insert into public.products (
  name, category, subcategory, condition, product_status, platform,
  price, old_price, discount, image_url, icon, glow, stock, stock_min,
  brand, rating, description, search_terms, active, sku
)
values
  (
    'Controle PS4 1ª Linha', 'Acessórios', 'Controles', 'Novo', 'Em estoque', 'PlayStation 4',
    100, 100, 0, './assets/accessory-control-ps4-first.png', '🎮', '#00a8ff', 3, 1,
    'BLACKOUT', null, 'Controle para PlayStation 4 disponível no catálogo BLACKOUT Infor Games.',
    'controle ps4 primeira linha playstation 4 gamepad', true, 'BIG-CTRL-PS4-FIRST'
  ),
  (
    'Controle PS4 Original', 'Acessórios', 'Controles', 'Novo', 'Em estoque', 'PlayStation 4',
    200, 200, 0, './assets/accessory-control-ps4-original.png', '🎮', '#00a8ff', 6, 1,
    'Sony', null, 'Controle original para PlayStation 4 disponível no catálogo BLACKOUT Infor Games.',
    'controle ps4 original sony playstation 4 dualshock', true, 'BIG-CTRL-PS4-ORIGINAL'
  ),
  (
    'Headset Gamer Feir FR-510', 'Acessórios', 'Headsets', 'Novo', 'Em estoque', 'Gamer',
    80, 80, 0, './assets/accessory-headset-feir-fr510.png', '🎧', '#ff4b23', 3, 1,
    'Feir', null, 'Headset gamer Feir FR-510 disponível no catálogo BLACKOUT Infor Games.',
    'headset gamer feir fr-510 fr510 fone gamer', true, 'BIG-HEADSET-FEIR-FR510'
  ),
  (
    'Headset Wireless CAT STN-28', 'Acessórios', 'Headsets', 'Novo', 'Em estoque', 'Wireless',
    60, 60, 0, './assets/accessory-headset-cat-stn28.png', '🎧', '#ff4b23', 2, 1,
    'CAT', null, 'Headset Wireless CAT STN-28 disponível no catálogo BLACKOUT Infor Games.',
    'headset wireless cat stn-28 stn28 fone sem fio', true, 'BIG-HEADSET-CAT-STN28'
  ),
  (
    'Headset Evolut Rival EG307', 'Acessórios', 'Headsets', 'Novo', 'Em estoque', 'Gamer',
    100, 100, 0, './assets/accessory-headset-evolut-eg307.png', '🎧', '#ff4b23', 2, 1,
    'Evolut', null, 'Headset Evolut Rival EG307 disponível no catálogo BLACKOUT Infor Games.',
    'headset evolut rival eg307 fone gamer', true, 'BIG-HEADSET-EVOLUT-EG307'
  ),
  (
    'Fone Bluetooth P47', 'Acessórios', 'Fones Bluetooth', 'Novo', 'Em estoque', 'Bluetooth',
    30, 30, 0, './assets/accessory-fone-p47.png', '🎧', '#00c8ff', 5, 1,
    'P47', null, 'Fone Bluetooth P47 disponível no catálogo BLACKOUT Infor Games.',
    'fone bluetooth p47 sem fio', true, 'BIG-FONE-P47'
  ),
  (
    'Fone Bluetooth P9', 'Acessórios', 'Fones Bluetooth', 'Novo', 'Em estoque', 'Bluetooth',
    60, 60, 0, './assets/accessory-fone-p9.png', '🎧', '#00c8ff', 1, 1,
    'P9', null, 'Fone Bluetooth P9 disponível no catálogo BLACKOUT Infor Games.',
    'fone bluetooth p9 sem fio', true, 'BIG-FONE-P9'
  ),
  (
    'Carregador 120W + cabo Type-C', 'Acessórios', 'Carregadores', 'Novo', 'Em estoque', 'USB Type-C',
    70, 70, 0, './assets/accessory-charger-120w.png', '⚡', '#ff641e', 3, 1,
    'BLACKOUT', null, 'Carregador 120W com cabo Type-C disponível no catálogo BLACKOUT Infor Games.',
    'carregador 120w cabo type-c tipo c usb', true, 'BIG-CHARGER-120W-TYPEC'
  ),
  (
    'Mouse Exbom MS-62 RGB', 'Acessórios', 'Mouses', 'Novo', 'Em estoque', 'PC',
    30, 30, 0, './assets/accessory-mouse-exbom-ms62.png', '🖱️', '#00c8ff', 3, 1,
    'Exbom', null, 'Mouse Exbom MS-62 RGB disponível no catálogo BLACKOUT Infor Games.',
    'mouse exbom ms-62 ms62 rgb pc', true, 'BIG-MOUSE-EXBOM-MS62'
  ),
  (
    'Caixa/Rádio Grasep D-Y03', 'Acessórios', 'Caixas de Som', 'Novo', 'Em estoque', 'Bluetooth',
    70, 70, 0, './assets/accessory-speaker-grasep-dy03.png', '🔊', '#ff641e', 2, 1,
    'Grasep', null, 'Caixa e rádio Grasep D-Y03 disponível no catálogo BLACKOUT Infor Games.',
    'caixa radio grasep d-y03 dy03 bluetooth som', true, 'BIG-SPEAKER-GRASEP-DY03'
  ),
  (
    'Caixa Exbom SoundBox CS-M31BTL', 'Acessórios', 'Caixas de Som', 'Novo', 'Em estoque', 'Bluetooth',
    70, 70, 0, './assets/accessory-speaker-exbom-m31btl.png', '🔊', '#00c8ff', 2, 1,
    'Exbom', null, 'Caixa Exbom SoundBox CS-M31BTL disponível no catálogo BLACKOUT Infor Games.',
    'caixa exbom soundbox cs-m31btl csm31btl bluetooth som', true, 'BIG-SPEAKER-EXBOM-M31BTL'
  ),
  (
    'Base de Carregamento DualSense PS5', 'Acessórios', 'Carregadores', 'Novo', 'Em estoque', 'PlayStation 5',
    170, 170, 0, './assets/accessory-base-dualsense-ps5.png', '⚡', '#00a8ff', 1, 1,
    'BLACKOUT', null, 'Base de carregamento DualSense PS5 disponível no catálogo BLACKOUT Infor Games.',
    'base carregamento dualsense ps5 playstation 5 carregador controle', true, 'BIG-BASE-DUALSENSE-PS5'
  ),
  (
    'Base Carregadora Dobe PS5', 'Acessórios', 'Carregadores', 'Novo', 'Em estoque', 'PlayStation 5',
    120, 120, 0, './assets/accessory-base-dobe-ps5.png', '⚡', '#00a8ff', 1, 1,
    'Dobe', null, 'Base carregadora Dobe PS5 disponível no catálogo BLACKOUT Infor Games.',
    'base carregadora dobe ps5 playstation 5 controle', true, 'BIG-BASE-DOBE-PS5'
  ),
  (
    'Base iPega PG-LC05 PS4', 'Acessórios', 'Carregadores', 'Novo', 'Em estoque', 'PlayStation 4',
    80, 80, 0, './assets/accessory-base-ipega-pglc05-ps4.png', '⚡', '#00a8ff', 1, 1,
    'iPega', null, 'Base iPega PG-LC05 PS4 disponível no catálogo BLACKOUT Infor Games.',
    'base ipega pg-lc05 pglc05 ps4 playstation 4 carregador controle', true, 'BIG-BASE-IPEGA-PGLC05-PS4'
  ),
  (
    'Controle PS3 1ª linha', 'Acessórios', 'Controles', 'Novo', 'Em estoque', 'PlayStation 3',
    60, 60, 0, './assets/accessory-control-ps3-first.png', '🎮', '#ff4b23', 1, 1,
    'BLACKOUT', null, 'Controle PS3 de primeira linha disponível no catálogo BLACKOUT Infor Games.',
    'controle ps3 primeira linha playstation 3 gamepad', true, 'BIG-CTRL-PS3-FIRST'
  ),
  (
    'Caixa Golden Pro GP-311', 'Acessórios', 'Caixas de Som', 'Novo', 'Em estoque', 'Bluetooth',
    30, 30, 0, './assets/accessory-speaker-golden-pro-gp311.png', '🔊', '#ff641e', 1, 1,
    'Golden Pro', null, 'Caixa Golden Pro GP-311 disponível no catálogo BLACKOUT Infor Games.',
    'caixa golden pro gp-311 gp311 bluetooth rgb som', true, 'BIG-SPEAKER-GOLDEN-GP311'
  ),
  (
    'Caixa Xtrad CS-29 50W RGB', 'Acessórios', 'Caixas de Som', 'Novo', 'Em estoque', 'Bluetooth',
    170, 170, 0, './assets/accessory-speaker-xtrad-cs29.png', '🔊', '#ff641e', 1, 1,
    'Xtrad', null, 'Caixa Xtrad CS-29 50W RGB disponível no catálogo BLACKOUT Infor Games.',
    'caixa xtrad cs-29 cs29 50w rgb bluetooth som', true, 'BIG-SPEAKER-XTRAD-CS29'
  ),
  (
    'Caixa Mondial Connect Party Plus CM-250', 'Acessórios', 'Caixas de Som', 'Novo', 'Em estoque', 'Bluetooth',
    400, 400, 0, './assets/accessory-speaker-mondial-cm250.png', '🔊', '#ff641e', 1, 1,
    'Mondial', null, 'Caixa Mondial Connect Party Plus CM-250 disponível no catálogo BLACKOUT Infor Games.',
    'caixa mondial connect party plus cm-250 cm250 bluetooth som', true, 'BIG-SPEAKER-MONDIAL-CM250'
  ),
  (
    'Controle Wireless PS4/iOS/Android/PC', 'Acessórios', 'Controles', 'Novo', 'Em estoque', 'Multiplataforma',
    170, 170, 0, './assets/accessory-control-wireless-multiplatform.png', '🎮', '#00a8ff', 1, 1,
    'BLACKOUT', null, 'Controle Wireless para PS4, iOS, Android e PC disponível no catálogo BLACKOUT Infor Games.',
    'controle wireless ps4 ios android pc multiplataforma sem fio', true, 'BIG-CTRL-WIRELESS-MULTI'
  ),
  (
    'Teclado ATEK ATE-G107 RGB', 'Acessórios', 'Teclados', 'Novo', 'Em estoque', 'PC',
    50, 50, 0, './assets/accessory-keyboard-atek-g107.png', '⌨️', '#ff4b23', 1, 1,
    'ATEK', null, 'Teclado ATEK ATE-G107 RGB disponível no catálogo BLACKOUT Infor Games.',
    'teclado atek ate-g107 g107 rgb pc usb', true, 'BIG-KEYBOARD-ATEK-G107'
  ),
  (
    'Carregador Lehmox LE-522F', 'Acessórios', 'Carregadores', 'Novo', 'Em estoque', 'USB Type-C',
    30, 30, 0, './assets/accessory-charger-lehmox-le522f.png', '⚡', '#00a8ff', 1, 1,
    'Lehmox', null, 'Carregador Lehmox LE-522F disponível no catálogo BLACKOUT Infor Games.',
    'carregador lehmox le-522f le522f 30w pd usb duplo type-c', true, 'BIG-CHARGER-LEHMOX-LE522F'
  )
on conflict (sku) do update
set name = excluded.name,
    category = excluded.category,
    subcategory = excluded.subcategory,
    condition = excluded.condition,
    product_status = excluded.product_status,
    platform = excluded.platform,
    price = excluded.price,
    old_price = excluded.old_price,
    discount = excluded.discount,
    image_url = excluded.image_url,
    icon = excluded.icon,
    glow = excluded.glow,
    stock = excluded.stock,
    stock_min = excluded.stock_min,
    brand = excluded.brand,
    rating = excluded.rating,
    description = excluded.description,
    search_terms = excluded.search_terms,
    active = excluded.active,
    updated_at = now();

create index if not exists products_category_subcategory_active_idx
  on public.products (category, subcategory, active);

commit;
