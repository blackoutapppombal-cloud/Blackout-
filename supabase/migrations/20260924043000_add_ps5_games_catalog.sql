begin;

insert into public.products (
  name, category, subcategory, condition, product_status, platform,
  price, old_price, discount, image_url, icon, glow, stock, stock_min,
  brand, rating, description, search_terms, active, sku
)
values
  ('Days Gone','Jogos','PS5','Novo','Em estoque','PlayStation 5',100,100,0,'./assets/game-ps5-days-gone.png','🎮','#087dff',1,1,'Bend Studio',null,'Days Gone para PlayStation 5.','days gone ps5 playstation 5',true,'BIG-GAME-PS5-DAYS-GONE'),
  ('Hogwarts Legacy','Jogos','PS5','Novo','Em estoque','PlayStation 5',100,100,0,'./assets/game-ps5-hogwarts-legacy.png','🎮','#087dff',1,1,'Avalanche Software',null,'Hogwarts Legacy para PlayStation 5.','hogwarts legacy ps5 playstation 5',true,'BIG-GAME-PS5-HOGWARTS-LEGACY'),
  ('Red Dead Redemption II','Jogos','PS5','Novo','Em estoque','PlayStation 5',100,100,0,'./assets/game-ps5-red-dead-redemption-2.png','🎮','#087dff',1,1,'Rockstar Games',null,'Red Dead Redemption II para PlayStation 5.','red dead redemption ii 2 ps5 playstation 5',true,'BIG-GAME-PS5-RDR2'),
  ('Grand Theft Auto V','Jogos','PS5','Novo','Em estoque','PlayStation 5',100,100,0,'./assets/game-ps5-gta-5.png','🎮','#087dff',1,1,'Rockstar Games',null,'Grand Theft Auto V para PlayStation 5.','grand theft auto v 5 gta ps5 playstation 5',true,'BIG-GAME-PS5-GTA5'),
  ('Far Cry 4','Jogos','PS5','Novo','Em estoque','PlayStation 5',100,100,0,'./assets/game-ps5-far-cry-4.png','🎮','#087dff',1,1,'Ubisoft',null,'Far Cry 4 para PlayStation 5.','far cry 4 ps5 playstation 5',true,'BIG-GAME-PS5-FAR-CRY-4'),
  ('Far Cry 6','Jogos','PS5','Novo','Em estoque','PlayStation 5',100,100,0,'./assets/game-ps5-far-cry-6.png','🎮','#087dff',1,1,'Ubisoft',null,'Far Cry 6 para PlayStation 5.','far cry 6 ps5 playstation 5',true,'BIG-GAME-PS5-FAR-CRY-6'),
  ('Marvel''s Spider-Man: Game of the Year Edition','Jogos','PS5','Novo','Em estoque','PlayStation 5',100,100,0,'./assets/game-ps5-marvel-spider-man-goty.png','🎮','#087dff',1,1,'Insomniac Games',null,'Marvel''s Spider-Man: Game of the Year Edition para PlayStation 5.','marvel spider man game of the year edition goty ps5 playstation 5',true,'BIG-GAME-PS5-SPIDER-MAN-GOTY'),
  ('Star Wars Jedi: Fallen Order','Jogos','PS5','Novo','Em estoque','PlayStation 5',100,100,0,'./assets/game-ps5-star-wars-jedi-fallen-order.png','🎮','#087dff',1,1,'Respawn Entertainment',null,'Star Wars Jedi: Fallen Order para PlayStation 5.','star wars jedi fallen order ps5 playstation 5',true,'BIG-GAME-PS5-JEDI-FALLEN-ORDER'),
  ('Mortal Kombat 11','Jogos','PS5','Novo','Em estoque','PlayStation 5',100,100,0,'./assets/game-ps5-mortal-kombat-11.png','🎮','#087dff',1,1,'NetherRealm Studios',null,'Mortal Kombat 11 para PlayStation 5.','mortal kombat 11 mk11 ps5 playstation 5',true,'BIG-GAME-PS5-MK11'),
  ('Control','Jogos','PS5','Novo','Em estoque','PlayStation 5',100,100,0,'./assets/game-ps5-control.png','🎮','#087dff',1,1,'Remedy Entertainment',null,'Control para PlayStation 5.','control ps5 playstation 5',true,'BIG-GAME-PS5-CONTROL')
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

commit;
