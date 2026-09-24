(() => {
  const gameSeeds = [
    {id:9301,sku:'BIG-GAME-PS4-HZD-COMPLETE',name:'Horizon Zero Dawn Complete Edition',brand:'Guerrilla Games',image:'./assets/game-ps4-horizon-zero-dawn.png',searchTerms:'horizon zero dawn complete edition ps4 playstation 4'},
    {id:9302,sku:'BIG-GAME-PS4-HFW',name:'Horizon Forbidden West',brand:'Guerrilla Games',image:'./assets/game-ps4-horizon-forbidden-west.png',searchTerms:'horizon forbidden west ps4 playstation 4'},
    {id:9303,sku:'BIG-GAME-PS4-GOW3-REMASTERED',name:'God of War III Remastered',brand:'Santa Monica Studio',image:'./assets/game-ps4-god-of-war-3-remastered.png',searchTerms:'god of war iii 3 remastered ps4 playstation 4'},
    {id:9304,sku:'BIG-GAME-PS4-GOW-2018',name:'God of War',brand:'Santa Monica Studio',image:'./assets/game-ps4-god-of-war-2018.png',searchTerms:'god of war 2018 ps4 playstation 4'},
    {id:9305,sku:'BIG-GAME-PS4-GOW-RAGNAROK',name:'God of War Ragnarök',brand:'Santa Monica Studio',image:'./assets/game-ps4-god-of-war-ragnarok.png',searchTerms:'god of war ragnarok ragnarök ps4 playstation 4'},
    {id:9306,sku:'BIG-GAME-PS4-WITCHER3',name:'The Witcher 3: Wild Hunt',brand:'CD Projekt Red',image:'./assets/game-ps4-the-witcher-3.png',searchTerms:'the witcher 3 wild hunt ps4 playstation 4'},
    {id:9307,sku:'BIG-GAME-PS4-GHOST-TSUSHIMA',name:'Ghost of Tsushima',brand:'Sucker Punch',image:'./assets/game-ps4-ghost-of-tsushima.png',searchTerms:'ghost of tsushima ps4 playstation 4'},
    {id:9308,sku:'BIG-GAME-PS4-TLOU-REMASTERED',name:'The Last of Us Remastered',brand:'Naughty Dog',image:'./assets/game-ps4-the-last-of-us-remastered.png',searchTerms:'the last of us remastered ps4 playstation 4'},
    {id:9309,sku:'BIG-GAME-PS4-TLOU2',name:'The Last of Us Part II',brand:'Naughty Dog',image:'./assets/game-ps4-the-last-of-us-part-2.png',searchTerms:'the last of us part ii 2 ps4 playstation 4'},
    {id:9310,sku:'BIG-GAME-PS4-RE-VILLAGE',name:'Resident Evil Village',brand:'Capcom',image:'./assets/game-ps4-resident-evil-village.png',searchTerms:'resident evil village 8 ps4 playstation 4'},
    {id:9311,sku:"BIG-GAME-PS4-DAYS-GONE",name:"Days Gone",brand:"Bend Studio",image:"./assets/game-ps4-days-gone.png",searchTerms:"days gone ps4 playstation 4"},
    {id:9312,sku:"BIG-GAME-PS4-HOGWARTS-LEGACY",name:"Hogwarts Legacy",brand:"Avalanche Software",image:"./assets/game-ps4-hogwarts-legacy.png",searchTerms:"hogwarts legacy ps4 playstation 4"},
    {id:9313,sku:"BIG-GAME-PS4-RDR2",name:"Red Dead Redemption II",brand:"Rockstar Games",image:"./assets/game-ps4-red-dead-redemption-2.png",searchTerms:"red dead redemption ii 2 ps4 playstation 4"},
    {id:9314,sku:"BIG-GAME-PS4-GTA5",name:"Grand Theft Auto V",brand:"Rockstar Games",image:"./assets/game-ps4-gta-5.png",searchTerms:"grand theft auto v 5 gta ps4 playstation 4"},
    {id:9315,sku:"BIG-GAME-PS4-FAR-CRY-4",name:"Far Cry 4",brand:"Ubisoft",image:"./assets/game-ps4-far-cry-4.png",searchTerms:"far cry 4 ps4 playstation 4"},
    {id:9316,sku:"BIG-GAME-PS4-FAR-CRY-6",name:"Far Cry 6",brand:"Ubisoft",image:"./assets/game-ps4-far-cry-6.png",searchTerms:"far cry 6 ps4 playstation 4"},
    {id:9317,sku:"BIG-GAME-PS4-SPIDER-MAN-GOTY",name:"Marvel's Spider-Man: Game of the Year Edition",brand:"Insomniac Games",image:"./assets/game-ps4-marvel-spider-man-goty.png",searchTerms:"marvel spider man game of the year edition goty ps4 playstation 4"},
    {id:9318,sku:"BIG-GAME-PS4-JEDI-FALLEN-ORDER",name:"Star Wars Jedi: Fallen Order",brand:"Respawn Entertainment",image:"./assets/game-ps4-star-wars-jedi-fallen-order.png",searchTerms:"star wars jedi fallen order ps4 playstation 4"},
    {id:9319,sku:"BIG-GAME-PS4-MK11",name:"Mortal Kombat 11",brand:"NetherRealm Studios",image:"./assets/game-ps4-mortal-kombat-11.png",searchTerms:"mortal kombat 11 mk11 ps4 playstation 4"},
    {id:9320,sku:"BIG-GAME-PS4-CONTROL",name:"Control",brand:"Remedy Entertainment",image:"./assets/game-ps4-control.png",searchTerms:"control ps4 playstation 4"},
    {id:9321,sku:"BIG-GAME-PS4-WATCH-DOGS-LEGION",name:"Watch Dogs: Legion",brand:"Ubisoft",image:"./assets/game-ps4-watch-dogs-legion.png",searchTerms:"watch dogs legion ps4 playstation 4"},
    {id:9322,sku:"BIG-GAME-PS4-BACK-4-BLOOD",name:"Back 4 Blood",brand:"Turtle Rock Studios",image:"./assets/game-ps4-back-4-blood.png",searchTerms:"back 4 blood ps4 playstation 4"},
    {id:9323,sku:"BIG-GAME-PS4-IMMORTALS-FENYX",name:"Immortals Fenyx Rising",brand:"Ubisoft",image:"./assets/game-ps4-immortals-fenyx-rising.png",searchTerms:"immortals fenyx rising ps4 playstation 4"},
    {id:9324,sku:"BIG-GAME-PS4-THPS-1-2",name:"Tony Hawk's Pro Skater 1 + 2",brand:"Activision",image:"./assets/game-ps4-tony-hawks-pro-skater-1-2.png",searchTerms:"tony hawk pro skater 1 2 ps4 playstation 4"},
    {id:9325,sku:"BIG-GAME-PS4-UNCHARTED-NATHAN-DRAKE",name:"Uncharted: The Nathan Drake Collection",brand:"Naughty Dog",image:"./assets/game-ps4-uncharted-nathan-drake-collection.png",searchTerms:"uncharted nathan drake collection ps4 playstation 4"},
    {id:9326,sku:"BIG-GAME-PS4-UNCHARTED-4",name:"Uncharted 4: A Thief's End",brand:"Naughty Dog",image:"./assets/game-ps4-uncharted-4.png",searchTerms:"uncharted 4 a thief end ps4 playstation 4"},
    {id:9327,sku:"BIG-GAME-PS4-UNCHARTED-LOST-LEGACY",name:"Uncharted: The Lost Legacy",brand:"Naughty Dog",image:"./assets/game-ps4-uncharted-lost-legacy.png",searchTerms:"uncharted the lost legacy ps4 playstation 4"},
    {id:9328,sku:"BIG-GAME-PS4-NIOH-2",name:"Nioh 2",brand:"Team Ninja",image:"./assets/game-ps4-nioh-2.png",searchTerms:"nioh 2 ps4 playstation 4"},
    {id:9329,sku:"BIG-GAME-PS4-DARKSIDERS-3",name:"Darksiders III",brand:"Gunfire Games",image:"./assets/game-ps4-darksiders-3.png",searchTerms:"darksiders iii 3 ps4 playstation 4"},
    {id:9330,sku:"BIG-GAME-PS4-AC-ORIGINS",name:"Assassin's Creed Origins",brand:"Ubisoft",image:"./assets/game-ps4-assassins-creed-origins.png",searchTerms:"assassins creed origins ps4 playstation 4"},
    {id:9331,sku:"BIG-GAME-PS4-LITTLE-NIGHTMARES-2",name:"Little Nightmares II",brand:"Tarsier Studios",image:"./assets/game-ps4-little-nightmares-2.png",searchTerms:"little nightmares ii 2 ps4 playstation 4"},
    {id:9332,sku:"BIG-GAME-PS4-PROJECT-CARS",name:"Project CARS",brand:"Slightly Mad Studios",image:"./assets/game-ps4-project-cars.png",searchTerms:"project cars ps4 playstation 4"},
    {id:9333,sku:"BIG-GAME-PS4-NFS-HEAT",name:"Need for Speed Heat",brand:"EA",image:"./assets/game-ps4-need-for-speed-heat.png",searchTerms:"need for speed heat nfs ps4 playstation 4"},
    {id:9334,sku:"BIG-GAME-PS4-HORIZON-CHASE-TURBO",name:"Horizon Chase Turbo",brand:"Aquiris Game Studio",image:"./assets/game-ps4-horizon-chase-turbo.png",searchTerms:"horizon chase turbo ps4 playstation 4"},
    {id:9335,sku:"BIG-GAME-PS4-PAYDAY-2",name:"Payday 2",brand:"Starbreeze Studios",image:"./assets/game-ps4-payday-2.png",searchTerms:"payday 2 ps4 playstation 4"},
    {id:9336,sku:"BIG-GAME-PS4-R6-SIEGE",name:"Tom Clancy's Rainbow Six Siege",brand:"Ubisoft",image:"./assets/game-ps4-rainbow-six-siege.png",searchTerms:"tom clancy rainbow six siege r6 ps4 playstation 4"},
    {id:9337,sku:"BIG-GAME-PS4-BATTLEFIELD-2042",name:"Battlefield 2042",brand:"EA",image:"./assets/game-ps4-battlefield-2042.png",searchTerms:"battlefield 2042 ps4 playstation 4"},
    {id:9338,sku:"BIG-GAME-PS4-STAR-WARS-BATTLEFRONT",name:"Star Wars Battlefront",brand:"EA",image:"./assets/game-ps4-star-wars-battlefront.png",searchTerms:"star wars battlefront ps4 playstation 4"},
    {id:9339,sku:"BIG-GAME-PS4-LEGO-STAR-WARS",name:"LEGO Star Wars",brand:"TT Games",image:"./assets/game-ps4-lego-star-wars.png",searchTerms:"lego star wars ps4 playstation 4"},
    {id:9340,sku:"BIG-GAME-PS4-LEGO-NINJAGO",name:"LEGO Ninjago",brand:"TT Games",image:"./assets/game-ps4-lego-ninjago.png",searchTerms:"lego ninjago ps4 playstation 4"},
    {id:9341,sku:"BIG-GAME-PS4-LEGO-MARVEL",name:"LEGO Marvel Super Heroes",brand:"TT Games",image:"./assets/game-ps4-lego-marvel-super-heroes.png",searchTerms:"lego marvel super heroes ps4 playstation 4"},
    {id:9342,sku:"BIG-GAME-PS4-LEGO-HARRY-POTTER",name:"LEGO Harry Potter Collection",brand:"TT Games",image:"./assets/game-ps4-lego-harry-potter-collection.png",searchTerms:"lego harry potter collection ps4 playstation 4"},
    {id:9343,sku:"BIG-GAME-PS4-NARUTO-STORM-4",name:"Naruto Shippuden: Ultimate Ninja Storm 4",brand:"CyberConnect2",image:"./assets/game-ps4-naruto-ultimate-ninja-storm-4.png",searchTerms:"naruto shippuden ultimate ninja storm 4 ps4 playstation 4"},
    {id:9344,sku:"BIG-GAME-PS4-CRASH-NSANE",name:"Crash Bandicoot N. Sane Trilogy",brand:"Activision",image:"./assets/game-ps4-crash-bandicoot-n-sane-trilogy.png",searchTerms:"crash bandicoot n sane trilogy ps4 playstation 4"},
    {id:9345,sku:"BIG-GAME-PS4-DB-XENOVERSE-2",name:"Dragon Ball Xenoverse 2",brand:"Bandai Namco",image:"./assets/game-ps4-dragon-ball-xenoverse-2.png",searchTerms:"dragon ball xenoverse 2 ps4 playstation 4"},
    {id:9346,sku:"BIG-GAME-PS4-BATMAN-ARKHAM-KNIGHT",name:"Batman: Arkham Knight",brand:"Rocksteady Studios",image:"./assets/game-ps4-batman-arkham-knight.png",searchTerms:"batman arkham knight ps4 playstation 4"},
    {id:9347,sku:"BIG-GAME-PS4-FINAL-FANTASY-15",name:"Final Fantasy XV",brand:"Square Enix",image:"./assets/game-ps4-final-fantasy-15.png",searchTerms:"final fantasy xv 15 ps4 playstation 4"},
    {id:9348,sku:"BIG-GAME-PS4-DESTINY",name:"Destiny",brand:"Bungie",image:"./assets/game-ps4-destiny.png",searchTerms:"destiny ps4 playstation 4"},
    {id:9349,sku:"BIG-GAME-PS4-EVIL-WITHIN-2",name:"The Evil Within 2",brand:"Tango Gameworks",image:"./assets/game-ps4-the-evil-within-2.png",searchTerms:"the evil within 2 ps4 playstation 4"},
    {id:9350,sku:"BIG-GAME-PS4-PES-2016",name:"PES 2016",brand:"Konami",image:"./assets/game-ps4-pes-2016.png",searchTerms:"pes 2016 pro evolution soccer ps4 playstation 4"},
    {id:9351,sku:"BIG-GAME-PS4-FIFA-19",name:"FIFA 19",brand:"EA Sports",image:"./assets/game-ps4-fifa-19.png",searchTerms:"fifa 19 ps4 playstation 4"},
    {id:9352,sku:"BIG-GAME-PS4-FIFA-22",name:"FIFA 22",brand:"EA Sports",image:"./assets/game-ps4-fifa-22.png",searchTerms:"fifa 22 ps4 playstation 4"},
    {id:9353,sku:"BIG-GAME-PS4-SOUTH-PARK-FRACTURED",name:"South Park: The Fractured But Whole",brand:"Ubisoft",image:"./assets/game-ps4-south-park-fractured-but-whole.png",searchTerms:"south park fractured but whole ps4 playstation 4"},
    {id:9354,sku:"BIG-GAME-PS4-SOUTH-PARK-STICK-TRUTH",name:"South Park: The Stick of Truth",brand:"Ubisoft",image:"./assets/game-ps4-south-park-stick-of-truth.png",searchTerms:"south park stick of truth ps4 playstation 4"}
  ];

  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

  function matchSeed(product, seed) {
    const platformMatches = product?.subcategory === 'PS4' || product?.platform === 'PlayStation 4' || (!product?.subcategory && !product?.platform);
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
      subcategory: 'PS4',
      condition: existing?.condition || 'Novo',
      status: existing?.status || (stock > 0 ? 'Em estoque' : 'Esgotado'),
      platform: 'PlayStation 4',
      price,
      old: Number.isFinite(Number(existing?.old)) ? Number(existing.old) : price,
      discount: Number(existing?.discount || 0),
      image: seed.image,
      icon: '🎮',
      glow: existing?.glow || '#087dff',
      stock,
      brand: existing?.brand || seed.brand,
      rating: existing?.rating ?? null,
      desc: existing?.desc || `${seed.name} para PlayStation 4, disponível no catálogo BLACKOUT Infor Games.`,
      searchTerms: existing?.searchTerms || seed.searchTerms,
      __ps4GamePreview: !existing
    };
  }

  function ensurePs4Games() {
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
    ensurePs4Games();
    previousRender(options);
  };

  window.BLACKOUT_PS4_GAMES = {gameSeeds, ensurePs4Games};
  ensurePs4Games();
  if (['catalog', 'offers', 'product', 'cart', 'favorites'].includes(state.route)) render();
})();
