(() => {
  const gameSeeds = [
    {id:9401,sku:"BIG-GAME-PS5-DAYS-GONE",name:"Days Gone",brand:"Bend Studio",image:"./assets/game-ps5-days-gone.png",searchTerms:"days gone ps5 playstation 5"},
    {id:9402,sku:"BIG-GAME-PS5-HOGWARTS-LEGACY",name:"Hogwarts Legacy",brand:"Avalanche Software",image:"./assets/game-ps5-hogwarts-legacy.png",searchTerms:"hogwarts legacy ps5 playstation 5"},
    {id:9403,sku:"BIG-GAME-PS5-RDR2",name:"Red Dead Redemption II",brand:"Rockstar Games",image:"./assets/game-ps5-red-dead-redemption-2.png",searchTerms:"red dead redemption ii 2 ps5 playstation 5"},
    {id:9404,sku:"BIG-GAME-PS5-GTA5",name:"Grand Theft Auto V",brand:"Rockstar Games",image:"./assets/game-ps5-gta-5.png",searchTerms:"grand theft auto v 5 gta ps5 playstation 5"},
    {id:9405,sku:"BIG-GAME-PS5-FAR-CRY-4",name:"Far Cry 4",brand:"Ubisoft",image:"./assets/game-ps5-far-cry-4.png",searchTerms:"far cry 4 ps5 playstation 5"},
    {id:9406,sku:"BIG-GAME-PS5-FAR-CRY-6",name:"Far Cry 6",brand:"Ubisoft",image:"./assets/game-ps5-far-cry-6.png",searchTerms:"far cry 6 ps5 playstation 5"},
    {id:9407,sku:"BIG-GAME-PS5-SPIDER-MAN-GOTY",name:"Marvel's Spider-Man: Game of the Year Edition",brand:"Insomniac Games",image:"./assets/game-ps5-marvel-spider-man-goty.png",searchTerms:"marvel spider man game of the year edition goty ps5 playstation 5"},
    {id:9408,sku:"BIG-GAME-PS5-JEDI-FALLEN-ORDER",name:"Star Wars Jedi: Fallen Order",brand:"Respawn Entertainment",image:"./assets/game-ps5-star-wars-jedi-fallen-order.png",searchTerms:"star wars jedi fallen order ps5 playstation 5"},
    {id:9409,sku:"BIG-GAME-PS5-MK11",name:"Mortal Kombat 11",brand:"NetherRealm Studios",image:"./assets/game-ps5-mortal-kombat-11.png",searchTerms:"mortal kombat 11 mk11 ps5 playstation 5"},
    {id:9410,sku:"BIG-GAME-PS5-CONTROL",name:"Control",brand:"Remedy Entertainment",image:"./assets/game-ps5-control.png",searchTerms:"control ps5 playstation 5"}
  ];

  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

  function matchSeed(product, seed) {
    const platformMatches = product?.subcategory === 'PS5' || product?.platform === 'PlayStation 5' || (!product?.subcategory && !product?.platform);
    return String(product?.sku || '') === seed.sku || (platformMatches && normalize(product?.name) === normalize(seed.name));
  }

  function gameProduct(seed, existing = null) {
    const price = Number.isFinite(Number(existing?.price)) ? Number(existing.price) : 100;
    const stock = Number.isFinite(Number(existing?.stock)) ? Number(existing.stock) : 1;
    return {
      ...seed,
      ...(existing || {}),
      id: Number(existing?.id || seed.id),
      name: seed.name,
      sku: seed.sku,
      category: 'Jogos',
      subcategory: 'PS5',
      condition: existing?.condition || 'Novo',
      status: existing?.status || (stock > 0 ? 'Em estoque' : 'Esgotado'),
      platform: 'PlayStation 5',
      price,
      old: Number.isFinite(Number(existing?.old)) ? Number(existing.old) : price,
      discount: Number(existing?.discount || 0),
      image: seed.image,
      icon: '🎮',
      glow: existing?.glow || '#087dff',
      stock,
      brand: existing?.brand || seed.brand,
      rating: existing?.rating ?? null,
      desc: existing?.desc || `${seed.name} para PlayStation 5, disponível no catálogo BLACKOUT Infor Games.`,
      searchTerms: existing?.searchTerms || seed.searchTerms,
      __ps5GamePreview: !existing
    };
  }

  function ensurePs5Games() {
    const current = Array.isArray(products) ? products : [];
    const used = new Set();
    const organized = gameSeeds.map(seed => {
      const existing = current.find(product => !used.has(product) && matchSeed(product, seed));
      if (existing) used.add(existing);
      return gameProduct(seed, existing);
    });
    products = [...organized, ...current.filter(product => !used.has(product))];
  }

  const previousRender = render;
  render = function (options) {
    ensurePs5Games();
    previousRender(options);
  };

  window.BLACKOUT_PS5_GAMES = {gameSeeds, ensurePs5Games};
  ensurePs5Games();
  if (['catalog', 'offers', 'product', 'cart', 'favorites'].includes(state.route)) render();
})();
