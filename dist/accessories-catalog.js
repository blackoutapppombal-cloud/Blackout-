(() => {
  const accessorySeeds = [
    {id:9201,sku:'BIG-CTRL-PS4-FIRST',name:'Controle PS4 1ª Linha',subcategory:'Controles',platform:'PlayStation 4',price:100,stock:3,brand:'BLACKOUT',image:'./assets/accessory-control-ps4-first.png',icon:'🎮',glow:'#00a8ff',searchTerms:'controle ps4 primeira linha playstation 4 gamepad'},
    {id:9202,sku:'BIG-CTRL-PS4-ORIGINAL',name:'Controle PS4 Original',subcategory:'Controles',platform:'PlayStation 4',price:200,stock:6,brand:'Sony',image:'./assets/accessory-control-ps4-original.png',icon:'🎮',glow:'#00a8ff',searchTerms:'controle ps4 original sony playstation 4 dualshock'},
    {id:9203,sku:'BIG-HEADSET-FEIR-FR510',name:'Headset Gamer Feir FR-510',subcategory:'Headsets',platform:'Gamer',price:80,stock:3,brand:'Feir',image:'./assets/accessory-headset-feir-fr510.png',icon:'🎧',glow:'#ff4b23',searchTerms:'headset gamer feir fr-510 fr510 fone gamer'},
    {id:9204,sku:'BIG-HEADSET-CAT-STN28',name:'Headset Wireless CAT STN-28',subcategory:'Headsets',platform:'Wireless',price:60,stock:2,brand:'CAT',image:'./assets/accessory-headset-cat-stn28.png',icon:'🎧',glow:'#ff4b23',searchTerms:'headset wireless cat stn-28 stn28 fone sem fio'},
    {id:9205,sku:'BIG-HEADSET-EVOLUT-EG307',name:'Headset Evolut Rival EG307',subcategory:'Headsets',platform:'Gamer',price:100,stock:2,brand:'Evolut',image:'./assets/accessory-headset-evolut-eg307.png',icon:'🎧',glow:'#ff4b23',searchTerms:'headset evolut rival eg307 fone gamer'},
    {id:9206,sku:'BIG-FONE-P47',name:'Fone Bluetooth P47',subcategory:'Fones Bluetooth',platform:'Bluetooth',price:30,stock:5,brand:'P47',image:'./assets/accessory-fone-p47.png',icon:'🎧',glow:'#00c8ff',searchTerms:'fone bluetooth p47 sem fio'},
    {id:9207,sku:'BIG-FONE-P9',name:'Fone Bluetooth P9',subcategory:'Fones Bluetooth',platform:'Bluetooth',price:60,stock:1,brand:'P9',image:'./assets/accessory-fone-p9.png',icon:'🎧',glow:'#00c8ff',searchTerms:'fone bluetooth p9 sem fio'},
    {id:9208,sku:'BIG-CHARGER-120W-TYPEC',name:'Carregador 120W + cabo Type-C',subcategory:'Carregadores',platform:'USB Type-C',price:70,stock:3,brand:'BLACKOUT',image:'./assets/accessory-charger-120w.png',icon:'⚡',glow:'#ff641e',searchTerms:'carregador 120w cabo type-c tipo c usb'},
    {id:9209,sku:'BIG-MOUSE-EXBOM-MS62',name:'Mouse Exbom MS-62 RGB',subcategory:'Mouses',platform:'PC',price:30,stock:3,brand:'Exbom',image:'./assets/accessory-mouse-exbom-ms62.png',icon:'🖱️',glow:'#00c8ff',searchTerms:'mouse exbom ms-62 ms62 rgb pc'},
    {id:9210,sku:'BIG-SPEAKER-GRASEP-DY03',name:'Caixa/Rádio Grasep D-Y03',subcategory:'Caixas de Som',platform:'Bluetooth',price:70,stock:2,brand:'Grasep',image:'./assets/accessory-speaker-grasep-dy03.png',icon:'🔊',glow:'#ff641e',searchTerms:'caixa radio grasep d-y03 dy03 bluetooth som'},
    {id:9211,sku:'BIG-SPEAKER-EXBOM-M31BTL',name:'Caixa Exbom SoundBox CS-M31BTL',subcategory:'Caixas de Som',platform:'Bluetooth',price:70,stock:2,brand:'Exbom',image:'./assets/accessory-speaker-exbom-m31btl.png',icon:'🔊',glow:'#00c8ff',searchTerms:'caixa exbom soundbox cs-m31btl csm31btl bluetooth som'},
    {id:9212,sku:'BIG-BASE-DUALSENSE-PS5',name:'Base de Carregamento DualSense PS5',subcategory:'Carregadores',platform:'PlayStation 5',price:170,stock:1,brand:'BLACKOUT',image:'./assets/accessory-base-dualsense-ps5.png',icon:'⚡',glow:'#00a8ff',searchTerms:'base carregamento dualsense ps5 playstation 5 carregador controle'},
    {id:9213,sku:'BIG-BASE-DOBE-PS5',name:'Base Carregadora Dobe PS5',subcategory:'Carregadores',platform:'PlayStation 5',price:120,stock:1,brand:'Dobe',image:'./assets/accessory-base-dobe-ps5.png',icon:'⚡',glow:'#00a8ff',searchTerms:'base carregadora dobe ps5 playstation 5 controle'},
    {id:9214,sku:'BIG-BASE-IPEGA-PGLC05-PS4',name:'Base iPega PG-LC05 PS4',subcategory:'Carregadores',platform:'PlayStation 4',price:80,stock:1,brand:'iPega',image:'./assets/accessory-base-ipega-pglc05-ps4.png',icon:'⚡',glow:'#00a8ff',searchTerms:'base ipega pg-lc05 pglc05 ps4 playstation 4 carregador controle'},
    {id:9215,sku:'BIG-CTRL-PS3-FIRST',name:'Controle PS3 1ª linha',subcategory:'Controles',platform:'PlayStation 3',price:60,stock:1,brand:'BLACKOUT',image:'./assets/accessory-control-ps3-first.png',icon:'🎮',glow:'#ff4b23',searchTerms:'controle ps3 primeira linha playstation 3 gamepad'},
    {id:9216,sku:'BIG-SPEAKER-GOLDEN-GP311',name:'Caixa Golden Pro GP-311',subcategory:'Caixas de Som',platform:'Bluetooth',price:30,stock:1,brand:'Golden Pro',image:'./assets/accessory-speaker-golden-pro-gp311.png',icon:'🔊',glow:'#ff641e',searchTerms:'caixa golden pro gp-311 gp311 bluetooth rgb som'},
    {id:9217,sku:'BIG-SPEAKER-XTRAD-CS29',name:'Caixa Xtrad CS-29 50W RGB',subcategory:'Caixas de Som',platform:'Bluetooth',price:170,stock:1,brand:'Xtrad',image:'./assets/accessory-speaker-xtrad-cs29.png',icon:'🔊',glow:'#ff641e',searchTerms:'caixa xtrad cs-29 cs29 50w rgb bluetooth som'},
    {id:9218,sku:'BIG-SPEAKER-MONDIAL-CM250',name:'Caixa Mondial Connect Party Plus CM-250',subcategory:'Caixas de Som',platform:'Bluetooth',price:400,stock:1,brand:'Mondial',image:'./assets/accessory-speaker-mondial-cm250.png',icon:'🔊',glow:'#ff641e',searchTerms:'caixa mondial connect party plus cm-250 cm250 bluetooth som'},
    {id:9219,sku:'BIG-CTRL-WIRELESS-MULTI',name:'Controle Wireless PS4/iOS/Android/PC',subcategory:'Controles',platform:'Multiplataforma',price:170,stock:1,brand:'BLACKOUT',image:'./assets/accessory-control-wireless-multiplatform.png',icon:'🎮',glow:'#00a8ff',searchTerms:'controle wireless ps4 ios android pc multiplataforma sem fio'},
    {id:9220,sku:'BIG-KEYBOARD-ATEK-G107',name:'Teclado ATEK ATE-G107 RGB',subcategory:'Teclados',platform:'PC',price:50,stock:1,brand:'ATEK',image:'./assets/accessory-keyboard-atek-g107.png',icon:'⌨️',glow:'#ff4b23',searchTerms:'teclado atek ate-g107 g107 rgb pc usb'},
    {id:9221,sku:'BIG-CHARGER-LEHMOX-LE522F',name:'Carregador Lehmox LE-522F',subcategory:'Carregadores',platform:'USB Type-C',price:30,stock:1,brand:'Lehmox',image:'./assets/accessory-charger-lehmox-le522f.png',icon:'⚡',glow:'#00a8ff',searchTerms:'carregador lehmox le-522f le522f 30w pd usb duplo type-c'}
  ];

  const subcategoryOrder = ['Controles', 'Headsets', 'Fones Bluetooth', 'Carregadores', 'Mouses', 'Teclados', 'Caixas de Som'];
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

  function isSeedMatch(product, seed) {
    if (String(product?.sku || '') === seed.sku) return true;
    const name = normalize(product?.name);
    const seedName = normalize(seed.name);
    if (seed.sku === 'BIG-HEADSET-EVOLUT-EG307') return name.includes('evolut') && name.includes('eg307');
    return name === seedName;
  }

  function fallbackProduct(seed, existing = null) {
    const persisted = existing && String(existing.sku || '') === seed.sku;
    if (persisted) return {...existing, image: seed.image};
    return {
      ...(existing || {}),
      ...seed,
      id: Number(existing?.id || seed.id),
      category: 'Acessórios',
      condition: 'Novo',
      status: 'Em estoque',
      old: seed.price,
      discount: 0,
      rating: null,
      desc: `${seed.name} disponível no catálogo BLACKOUT Infor Games.`,
      __accessoryPreview: !existing
    };
  }

  function ensureAccessoryProducts() {
    const current = Array.isArray(products) ? products : [];
    const used = new Set();
    const organized = accessorySeeds.map(seed => {
      const existing = current.find(product => !used.has(product) && isSeedMatch(product, seed));
      if (existing) used.add(existing);
      return fallbackProduct(seed, existing);
    });
    const untouched = current.filter(product => !used.has(product));
    products = [...organized, ...untouched];
  }

  function orderSubcategoryButtons() {
    const row = document.querySelector('.catalog-subfilter-row');
    if (!row) return;
    const buttons = [...row.querySelectorAll('[data-subcategory]')];
    buttons.sort((a, b) => {
      const aValue = a.dataset.subcategory;
      const bValue = b.dataset.subcategory;
      const aIndex = aValue === 'Todos' ? -1 : subcategoryOrder.indexOf(aValue);
      const bIndex = bValue === 'Todos' ? -1 : subcategoryOrder.indexOf(bValue);
      return (aIndex < 0 && aValue !== 'Todos' ? 999 : aIndex) - (bIndex < 0 && bValue !== 'Todos' ? 999 : bIndex) || aValue.localeCompare(bValue, 'pt-BR');
    }).forEach(button => row.appendChild(button));
  }

  const baseRender = render;
  render = function (options) {
    ensureAccessoryProducts();
    baseRender(options);
    orderSubcategoryButtons();
  };

  window.BLACKOUT_ACCESSORIES = {accessorySeeds, ensureAccessoryProducts, subcategoryOrder};
  ensureAccessoryProducts();
  if (['catalog', 'offers', 'product', 'cart', 'favorites'].includes(state.route)) render();
})();
