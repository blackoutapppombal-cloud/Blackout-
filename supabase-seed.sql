insert into public.products
  (id, name, category, platform, price, old_price, discount, image_url, icon, glow, stock, brand, rating, description, active)
values
  (1, 'Headset Gamer Evolut Rival EG307', 'Acessórios', 'Headsets • P2 3,5 mm', 100.00, 100.00, 0, './assets/evolut-rival-eg307.png', '🎧', '#2a0f0f', 8, 'Evolut', null, 'Headset gamer com iluminação RGB Rainbow, som potente, microfone ajustável, design confortável e conexão plug and play P2 3,5 mm.', true),
  (2, 'Nintendo Switch Lite + Resident Evil 5 e 6', 'Consoles', 'Nintendo Switch', 1300.00, 1300.00, 0, './assets/nintendo-switch-lite-resident-evil.png', '🎮', '#310707', 12, 'Nintendo', null, 'Console portátil Nintendo Switch Lite acompanhado de Resident Evil 5 e Resident Evil 6, com bateria de longa duração e suporte a multiplayer local e online.', true),
  (3, 'Teclado Mecânico Kumara', 'Acessórios', 'PC', 249.90, 349.90, 28, null, '⌨️', '#1e2742', 5, 'Redragon', 4.7, 'Switches mecânicos, iluminação RGB e formato compacto para sua batalha.', true),
  (4, 'Mouse Logitech G502 HERO', 'Acessórios', 'PC', 349.90, 499.90, 30, null, '🖱️', '#082d44', 7, 'Logitech', 4.9, 'Sensor HERO de alta precisão, pesos ajustáveis e 11 botões programáveis.', true),
  (5, 'EA Sports FC 26', 'Jogos', 'PlayStation 5', 349.90, 399.90, 12, null, '⚽', '#26351b', 18, 'EA Sports', 4.6, 'Viva o futebol com partidas intensas, elencos atualizados e modos online.', true),
  (6, 'Black Ops 6', 'Jogos', 'Xbox • PS5', 299.90, 379.90, 21, null, '🎯', '#41210d', 10, 'Activision', 4.8, 'Ação tática cinematográfica, multijogador eletrizante e modo zumbis.', true),
  (7, 'SSD NVMe 1TB Fury', 'Hardware', 'PC • PS5', 429.90, 529.90, 19, null, '💾', '#3a141f', 4, 'Kingston', 4.9, 'Armazenamento ultrarrápido para carregamentos mínimos e máxima responsividade.', true),
  (8, 'Monitor Gamer 27” 180Hz', 'Monitores', 'PC • Console', 1399.90, 1699.90, 18, null, '🖥️', '#123c44', 3, 'AOC', 4.7, 'Painel de alta taxa de atualização com resposta rápida e imagem vibrante.', true)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  platform = excluded.platform,
  price = excluded.price,
  old_price = excluded.old_price,
  discount = excluded.discount,
  image_url = excluded.image_url,
  icon = excluded.icon,
  glow = excluded.glow,
  stock = excluded.stock,
  brand = excluded.brand,
  rating = excluded.rating,
  description = excluded.description,
  active = excluded.active,
  updated_at = now();

select setval(pg_get_serial_sequence('public.products', 'id'), coalesce((select max(id) from public.products), 1), true);
